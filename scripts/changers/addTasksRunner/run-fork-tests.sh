#!/bin/bash
# =============================================================================
# Script to run AddTasksRunner fork tests
#
# This script:
# 1. Starts a Hardhat node forking RSK mainnet (in-memory EDR)
# 2. Deploys PreTasksRunner (TasksRunner proxy + PreTasksRunnerChanger)
# 3. Deploys AddTasksRunner (includes AddTasksRunnerChanger), injecting the
#    TasksRunner proxy address and RIF/USD CoinPair address produced by step 2
# 4. Exports local deployment addresses (both modules) into a single fixture
# 5. Runs Solidity tests that fork from the running Hardhat node
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
PRE_TASKS_DEPLOYMENT_ID="chain-pre-test"
ADD_TASKS_DEPLOYMENT_ID="chain-test"
DEPLOYED_ADDRESSES_FILE="test/changers/addTasksRunner/fixtures/deployed-addresses.json"
FORK_BLOCK_NUMBER="${FORK_BLOCK_NUMBER:-}"
FORK_BLOCK_NUMBER="9024485"
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

validate_pre_tasks_params() {
    local pre_tasks_params="ignition/modules/changers/preTasksRunner/parameters/$NETWORK.json"
    if [ ! -f "$pre_tasks_params" ]; then
        log_error "Missing PreTasksRunner parameters file: $pre_tasks_params"
        exit 1
    fi

    log_success "Using PreTasksRunner parameters: $pre_tasks_params"
}

validate_add_tasks_params() {
    local add_tasks_params="ignition/modules/changers/addTasksRunner/parameters/$NETWORK.json"
    if [ ! -f "$add_tasks_params" ]; then
        log_error "Missing AddTasksRunner parameters file: $add_tasks_params"
        exit 1
    fi

    log_success "Using AddTasksRunner parameters: $add_tasks_params"
}

deploy_pre_tasks_runner() {
    log_info "Deploying PreTasksRunner via Ignition..."

    rm -rf "ignition/deployments/$PRE_TASKS_DEPLOYMENT_ID"

    echo "y" | npx hardhat ignition deploy \
        ignition/modules/changers/preTasksRunner/preTasksRunner.ts \
        --parameters "ignition/modules/changers/preTasksRunner/parameters/$NETWORK.json" \
        --network localhost \
        --deployment-id "$PRE_TASKS_DEPLOYMENT_ID"

    log_success "PreTasksRunner deployed"
}

deploy_add_tasks_runner() {
    log_info "Deploying AddTasksRunner via Ignition..."

    local pre_tasks_file="ignition/deployments/$PRE_TASKS_DEPLOYMENT_ID/deployed_addresses.json"
    if [ ! -f "$pre_tasks_file" ]; then
        log_error "Could not find PreTasksRunner deployed_addresses.json at $pre_tasks_file"
        exit 1
    fi

    local oracle_manager_proxy
    oracle_manager_proxy=$(node -e "
        const p = require('./ignition/modules/changers/preTasksRunner/parameters/$NETWORK.json');
        console.log(p.PreTasksRunnerModule.oracleManagerProxy);
    ")
    log_info "OracleManager proxy: $oracle_manager_proxy"

    # Resolve the TasksRunner proxy address from the PreTasksRunner deployment
    local tasks_runner_proxy
    tasks_runner_proxy=$(node -e "
        const fs = require('fs');
        const addresses = JSON.parse(fs.readFileSync('$pre_tasks_file', 'utf8'));
        // Ignition keys are like 'PreTasksRunnerModule#TasksRunnerProxy'
        const key = Object.keys(addresses).find(k => k.endsWith('#TasksRunnerProxy') || k === 'TasksRunnerProxy');
        if (!key) { console.error('TasksRunnerProxy not found in', Object.keys(addresses)); process.exit(1); }
        console.log(addresses[key]);
    ")
    log_info "TasksRunner proxy address: $tasks_runner_proxy"

    # Resolve the RIF/USD CoinPair address from the on-chain OracleManager
    local rif_usd_coin_pair
    rif_usd_coin_pair=$(node -e "
        const { ethers } = require('ethers');
        async function main() {
            const provider = new ethers.JsonRpcProvider('http://127.0.0.1:$NODE_PORT');
            const abi = ['function getContractAddress(bytes32 coinPair) view returns (address)'];
            const om = new ethers.Contract('$oracle_manager_proxy', abi, provider);
            // ethers.encodeBytes32String('RIFUSD')
            const RIFUSD = ethers.encodeBytes32String('RIFUSD');
            const addr = await om.getContractAddress(RIFUSD);
            console.log(addr);
        }
        main().catch(e => { console.error(e); process.exit(1); });
    ")
    log_info "RIF/USD CoinPair address: $rif_usd_coin_pair"

    # Build a merged parameters file with the real tasksRunner and rifUsdCoinPair addresses
    local merged_params_file="/tmp/addTasksRunner-merged-params.json"
    node -e "
        const fs = require('fs');
        const params = JSON.parse(fs.readFileSync('ignition/modules/changers/addTasksRunner/parameters/$NETWORK.json', 'utf8'));
        params['AddTasksRunner']['tasksRunner'] = '$tasks_runner_proxy';
        params['AddTasksRunner']['rifUsdCoinPair'] = '$rif_usd_coin_pair';
        fs.writeFileSync('$merged_params_file', JSON.stringify(params, null, 2));
        console.log('Merged parameters written to $merged_params_file');
    "

    rm -rf "ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID"

    echo "y" | npx hardhat ignition deploy \
        ignition/modules/changers/addTasksRunner/AddTasksRunner.ts \
        --parameters "$merged_params_file" \
        --network localhost \
        --deployment-id "$ADD_TASKS_DEPLOYMENT_ID"

    log_success "AddTasksRunner deployed"
}

export_addresses() {
    log_info "Exporting deployed addresses..."

    mkdir -p test/changers/addTasksRunner/fixtures

    local pre_tasks_file="ignition/deployments/$PRE_TASKS_DEPLOYMENT_ID/deployed_addresses.json"
    local add_tasks_file="ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID/deployed_addresses.json"

    if [ ! -f "$pre_tasks_file" ]; then
        log_error "Could not find deployed_addresses.json in $pre_tasks_file"
        exit 1
    fi

    if [ ! -f "$add_tasks_file" ]; then
        log_error "Could not find deployed_addresses.json in $add_tasks_file"
        exit 1
    fi

    node -e "
        const fs = require('fs');
        const preTasks = require('./$pre_tasks_file');
        const addTasks = require('./$add_tasks_file');

        const simplified = {};

        // Flatten both deployments — strip the 'ModuleName#' prefix from keys
        for (const [key, value] of Object.entries(preTasks)) {
          const contractId = key.includes('#') ? key.split('#')[1] : key;
          simplified[contractId] = value;
        }
        for (const [key, value] of Object.entries(addTasks)) {
          const contractId = key.includes('#') ? key.split('#')[1] : key;
          simplified[contractId] = value;
        }

        simplified._network = '$NETWORK';
        simplified._preTasksRunnerDeploymentDir = 'ignition/deployments/$PRE_TASKS_DEPLOYMENT_ID';
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

    rm -rf "ignition/deployments/$PRE_TASKS_DEPLOYMENT_ID"
    rm -rf "ignition/deployments/$ADD_TASKS_DEPLOYMENT_ID"
}

main() {
    log_info "=========================================="
    log_info "Fork Tests for AddTasksRunner"
    log_info "Network: $NETWORK"
    log_info "=========================================="

    check_requirements
    start_node
    validate_pre_tasks_params
    validate_add_tasks_params
    deploy_pre_tasks_runner
    deploy_add_tasks_runner
    export_addresses
    run_forge_tests

    log_success "=========================================="
    log_success "All tests completed successfully!"
    log_success "=========================================="
}

main "$@"
