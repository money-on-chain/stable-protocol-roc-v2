#!/bin/bash
# =============================================================================
# Script to run fork tests with Ignition deployments
#
# This script:
# 1. Starts a Hardhat node forking RSK mainnet (in-memory EDR)
# 2. Deploys contracts using Hardhat Ignition (FullMultiCollateralUpgrade)
# 3. Exports deployed addresses to a JSON file
# 4. Runs Solidity tests that fork from the running Hardhat node
#
# Usage:
#   ./scripts/run-fork-tests.sh [network]
#
# Arguments:
#   network - The network to fork (default: rskMainnet)
# =============================================================================

set -e

# Configuration
NETWORK="${1:-rskMainnet}"
NODE_PORT=8545
NODE_PID=""
DEPLOYED_ADDRESSES_FILE="test/changers/multiCollateralUpgrade/fixtures/deployed-addresses.json"

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

# Cleanup function to stop hardhat node on exit
cleanup() {
    if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
        log_info "Stopping Hardhat node (PID: $NODE_PID)..."
        kill "$NODE_PID" 2>/dev/null || true
        wait "$NODE_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

# Check required tools
check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed. Please install Node.js"
        exit 1
    fi
    
    log_success "All requirements met"
}

# Start Hardhat node forking RSK mainnet (in-memory EDR)
start_node() {
    log_info "Starting Hardhat node forking RSK mainnet (network: rskMainnetFork)..."
    
    # Kill any existing process on the port
    lsof -ti:$NODE_PORT | xargs kill -9 2>/dev/null || true
    
    # Start hardhat node in background using rskMainnetFork config (EDR + fork)
    npx hardhat node --network rskMainnetFork --port $NODE_PORT &> /tmp/hardhat-node.log &
    
    NODE_PID=$!
    
    # Wait for the node to start
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

# Generate merged parameters file
generate_params() {
    log_info "Generating merged parameters for $NETWORK..."

    node scripts/changers/multiCollateralUpgrade/merge-ignition-params.mjs "$NETWORK"

    if [ ! -f "ignition/modules/changers/multiCollateralUpgrade/parameters/full-$NETWORK.json" ]; then
        log_error "Failed to generate parameters file"
        exit 1
    fi

    log_success "Parameters generated: ignition/changers/multiCollateralUpgrade/parameters/full-$NETWORK.json"
}

# Deploy contracts using Hardhat Ignition
deploy_contracts() {
    log_info "Deploying contracts using Hardhat Ignition..."

    # Clear previous deployment
    rm -rf ignition/deployments/chain-test
    
    # Run ignition deploy against the running Hardhat node
    echo "y" | npx hardhat ignition deploy \
        ignition/modules/changers/multiCollateralUpgrade/FullMultiCollateralUpgrade.ts \
        --parameters "ignition/modules/changers/multiCollateralUpgrade/parameters/full-$NETWORK.json" \
        --network localhost \
        --deployment-id "chain-test"
    
    log_success "Contracts deployed successfully"
}

# Export deployed addresses to JSON file
export_addresses() {
    log_info "Exporting deployed addresses..."
    
    # Create fixtures directory if it doesn't exist
    mkdir -p test/changers/multiCollateralUpgrade/fixtures
    
    # Find the deployment directory
    DEPLOYMENT_DIR="ignition/deployments/chain-test"
    
    if [ ! -f "$DEPLOYMENT_DIR/deployed_addresses.json" ]; then
        log_error "Could not find deployed_addresses.json in $DEPLOYMENT_DIR"
        exit 1
    fi
    
    # Copy and transform the addresses file
    # Ignition format: {"ModuleName#ContractId": "0x..."}
    # We want: {"ContractId": "0x..."}
    node -e "
        const fs = require('fs');
        const addresses = require('./$DEPLOYMENT_DIR/deployed_addresses.json');
        
        const simplified = {};
        for (const [key, value] of Object.entries(addresses)) {
            // Extract contract ID from 'ModuleName#ContractId' format
            const contractId = key.includes('#') ? key.split('#')[1] : key;
            simplified[contractId] = value;
        }
        
        // Add metadata
        simplified._network = '$NETWORK';
        simplified._deploymentDir = '$DEPLOYMENT_DIR';
        
        fs.writeFileSync('$DEPLOYED_ADDRESSES_FILE', JSON.stringify(simplified, null, 2));
        console.log('Exported', Object.keys(simplified).length - 3, 'contract addresses');
    "
    
    log_success "Addresses exported to $DEPLOYED_ADDRESSES_FILE"
    
    # Show exported addresses
    log_info "Deployed contracts:"
    cat "$DEPLOYED_ADDRESSES_FILE"
}

# Run Solidity tests
run_forge_tests() {
    log_info "Running fork tests..."
    
    # The Solidity tests use vm.createSelectFork() to connect to the running
    # Hardhat node, so we pass the URL via FORK_URL env var.
    npx hardhat build
    FORK_URL="http://127.0.0.1:$NODE_PORT" npx hardhat test solidity -vvv
    
    log_success "Tests completed"

    # Clear deployments
    rm -rf ignition/deployments/chain-test
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Fork Tests with Ignition Deployments"
    log_info "Network: $NETWORK"
    log_info "=========================================="
    
    check_requirements
    start_node
    generate_params
    deploy_contracts
    export_addresses
    run_forge_tests
    
    log_success "=========================================="
    log_success "All tests completed successfully!"
    log_success "=========================================="
}

main "$@"
