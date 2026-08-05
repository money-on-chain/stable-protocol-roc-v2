// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { PreTasksRunnerForkTest } from "./PreTasksRunnerFork.t.sol";

/// @notice Runs the complete PreTasksRunner fork suite against Rootstock Testnet.
contract PreTasksRunnerTestnetForkTest is PreTasksRunnerForkTest {
    uint256 internal constant TESTNET_FORK_BLOCK = 7916000;
    string internal constant TESTNET_PARAMS_PATH =
        "./ignition/modules/changers/preTasksRunner/parameters/rskTestnet.json";

    function _paramsPath() internal pure override returns (string memory) {
        return TESTNET_PARAMS_PATH;
    }

    function _forkRpcUrl() internal view override returns (string memory) {
        return vm.envOr("RSK_TESTNET_RPC_URL", string("https://public-node.testnet.rsk.co"));
    }

    function _forkBlock() internal pure override returns (uint256) {
        return TESTNET_FORK_BLOCK;
    }

    function _expectedBtcPricePeekWhitelist() internal pure override returns (address[] memory expected) {
        expected = new address[](3);
        expected[0] = 0xbffBD993FF1d229B0FfE55668F2009d20d4F7C5f; // CoinPairFree
        expected[1] = 0xb506442BF4C73F0f7B062C900157a9D280939068;
        expected[2] = 0x4257d42EBd6BA579f4Dd46D82cdFa326441a7f94;
    }

    function _expectedRifPricePeekWhitelist() internal pure override returns (address[] memory expected) {
        expected = new address[](2);
        expected[0] = 0x6bFD6Fb54526b871a7AED81B2Ec9d953802EE9b8; // CoinPairFree
        expected[1] = 0xb506442BF4C73F0f7B062C900157a9D280939068;
    }
}
