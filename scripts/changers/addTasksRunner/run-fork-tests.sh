#!/bin/bash
# =============================================================================
# Script to run AddTasksRunner fork tests
#
# This script:
# 1. Starts a Hardhat node forking RSK mainnet (in-memory EDR)
# 2. Deploys AddTasksRunner (includes AddTasksRunnerChanger)
# 3. Exports merged deployed addresses
# 4. Runs Solidity tests that fork from the running Hardhat node
#
# Usage:
#   ./scripts/changers/addTasksRunner/run-fork-tests.sh [network]
#
# Arguments:
#   network - The network to fork (default: rskMainnet)
# =============================================================================

set -e

# Configuration
NETWORK="${1:-rskMainnet}"
NODE_PORT=8545
NODE_PID=""
MC_DEPLOYMENT_ID="${MC_DEPLOYMENT_ID:-chain-30}"
ADD_TASKS_DEPLOYMENT_ID="chain-test-add-tasks"
DEPLOYED_ADDRESSES_FILE="test/changers/addTasksRunner/fixtures/deployed-addresses.json"
FORK_BLOCK_NUMBER="${FORK_BLOCK_NUMBER:-}"
FORK_BLOCK_NUMBER="8886244"
FORK_RPC_URL="${FORK_RPC_URL:-${RSK_MAINNET_RPC_URL:-https://public-node.rsk.co}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
        log_info "Stopping Hardhat node (PID: $NODE_PID)..."
        kill "$NODE_PID" 2>/dev/null || true
        wait "$NODE_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

check_requirements() {
    log_info "Checking requirements..."

    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed. Please install Node.js"
        exit 1
    fi

    log_success "All requirements met"
}

start_node() {
    log_info "Starting Hardhat node forking RSK mainnet..."
    log_info "Fork RPC URL: $FORK_RPC_URL"

    lsof -ti:$NODE_PORT | xargs kill -9 2>/dev/null || true

    log_info "Using fork block number: $FORK_BLOCK_NUMBER"
    npx hardhat node --fork "$FORK_RPC_URL" --fork-block-number "$FORK_BLOCK_NUMBER" --chain-id 30 --port $NODE_PORT &> /tmp/hardhat-node.log &

    NODE_PID=$!

    log_info "Waiting for Hardhat node to start (PID: $NODE_PID)..."
    for i in {1..60}; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://127.0.0.1:$NODE_PORT > /dev/null 2>&1; then
            log_success "Hardhat node started successfully"
            return 0
        fi
        sleep 1
    done

    log_error "Failed to start Hardhat node. Check /tmp/hardhat-node.log for details"
    cat /tmp/hardhat-node.log
    exit 1
}

validate_add_tasks_params() {
    local add_tasks_params="ignition/modules/changers/addTasksRunner/parameters/$NETWORK.json"
    if [ ! -f "$add_tasks_params" ]; then
        log_error "Missing AddTasksRunner parameters file: $add_tasks_params"
        exit 1
    fi

    log_success "Using AddTasksRunner parameters: $add_tasks_params"
}

validate_mc_deployment_addresses() {
    MC_FILE="ignition/deployments/$MC_DEPLOYMENT_ID/deployed_addresses.json"
    if [ ! -f "$MC_FILE" ]; then
        log_error "Missing MultiCollateral deployed addresses file: $MC_FILE"
        log_error "Set MC_DEPLOYMENT_ID to an existing deployment containing MultiCollateral addresses."
        exit 1
    fi

    log_success "Using MultiCollateral deployed addresses: $MC_FILE"
}

deploy_add_tasks_runner() {
    log_info "Deploying AddTasksRunner via Ignition..."

    rm -rf "ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID"

    echo "y" | npx hardhat ignition deploy \
        ignition/modules/changers/addTasksRunner/AddTasksRunner.ts \
        --parameters "ignition/modules/changers/addTasksRunner/parameters/$NETWORK.json" \
        --network localhost \
        --deployment-id "$ADD_TASKS_DEPLOYMENT_ID"

    log_success "AddTasksRunner deployed"
}

export_addresses() {
    log_info "Exporting merged deployed addresses..."

    mkdir -p test/changers/addTasksRunner/fixtures

    MC_FILE="ignition/deployments/$MC_DEPLOYMENT_ID/deployed_addresses.json"
    ADD_TASKS_FILE="ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID/deployed_addresses.json"

    if [ ! -f "$MC_FILE" ]; then
        log_error "Could not find deployed_addresses.json in $MC_FILE"
        exit 1
    fi

    if [ ! -f "$ADD_TASKS_FILE" ]; then
        log_error "Could not find deployed_addresses.json in $ADD_TASKS_FILE"
        exit 1
    fi

    node -e "
        const fs = require('fs');
        const mc = require('./$MC_FILE');
        const addTasks = require('./$ADD_TASKS_FILE');

        const merged = { ...mc, ...addTasks };

        const simplified = {};
        for (const [key, value] of Object.entries(merged)) {
          const contractId = key.includes('#') ? key.split('#')[1] : key;
          simplified[contractId] = value;
        }

        simplified._network = '$NETWORK';
        simplified._multiCollateralDeploymentDir = 'ignition/deployments/$MC_DEPLOYMENT_ID';
        simplified._addTasksRunnerDeploymentDir = 'ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID';

        fs.writeFileSync('$DEPLOYED_ADDRESSES_FILE', JSON.stringify(simplified, null, 2));
        console.log('Exported', Object.keys(simplified).length - 3, 'contract addresses');
    "

    log_success "Addresses exported to $DEPLOYED_ADDRESSES_FILE"
    log_info "Deployed contracts:"
    cat "$DEPLOYED_ADDRESSES_FILE"
}

run_forge_tests() {
    log_info "Running fork tests..."

    npx hardhat build
    FORK_URL="http://127.0.0.1:$NODE_PORT" npx hardhat test solidity test/changers/addTasksRunner/AddTasksRunnerChanger.t.sol -vvv

    log_success "Tests completed"

    rm -rf "ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID"
}

main() {
    log_info "=========================================="
    log_info "Fork Tests for AddTasksRunner"
    log_info "Network: $NETWORK"
    log_info "MultiCollateral deployment id: $MC_DEPLOYMENT_ID"
    log_info "=========================================="

    check_requirements
    validate_mc_deployment_addresses
    start_node
    validate_add_tasks_params
    deploy_add_tasks_runner
    export_addresses
    run_forge_tests

    log_success "=========================================="
    log_success "All tests completed successfully!"
    log_success "=========================================="
}

main "$@"
