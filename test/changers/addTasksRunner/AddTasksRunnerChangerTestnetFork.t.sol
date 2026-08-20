// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { AddTasksRunnerChangerForkTests } from "./AddTasksRunnerChanger.t.sol";

interface IOracleManagerStakeView {
    function getRegisteredOraclesLen() external view returns (uint256);
    function getRegisteredOracleAtIndex(
        uint256 index
    ) external view returns (address ownerAddr, address oracleAddr, string memory url);
    function getStake(address ownerAddr) external view returns (uint256);
}

/// @notice Runs the complete AddTasksRunner fork suite against Rootstock Testnet.
contract AddTasksRunnerChangerTestnetForkTests is AddTasksRunnerChangerForkTests {
    function _getNetworkAddress(string memory key) internal view override returns (address) {
        bytes32 keyHash = keccak256(bytes(key));
        if (keyHash == keccak256("oracleOwner1")) return _oracleOwnerByStakeRank(0);
        if (keyHash == keccak256("oracleOwner2")) return _oracleOwnerByStakeRank(1);
        if (keyHash == keccak256("oracleOwner3")) return _oracleOwnerByStakeRank(2);

        return getTestnetAddress(key);
    }

    function _oracleOwnerByStakeRank(uint256 rank) private view returns (address) {
        IOracleManagerStakeView oracleManager = IOracleManagerStakeView(preTasksRunnerChanger.oracleManagerProxy());
        uint256 oracleCount = oracleManager.getRegisteredOraclesLen();
        address[3] memory topOwners;
        uint256[3] memory topStakes;

        for (uint256 i = 0; i < oracleCount; i++) {
            (address ownerAddr, , ) = oracleManager.getRegisteredOracleAtIndex(i);
            uint256 stake = oracleManager.getStake(ownerAddr);

            for (uint256 position = 0; position < 3; position++) {
                if (stake > topStakes[position]) {
                    for (uint256 shift = 2; shift > position; shift--) {
                        topOwners[shift] = topOwners[shift - 1];
                        topStakes[shift] = topStakes[shift - 1];
                    }
                    topOwners[position] = ownerAddr;
                    topStakes[position] = stake;
                    break;
                }
            }
        }

        require(topOwners[rank] != address(0), "not enough staked testnet oracles");
        return topOwners[rank];
    }
}
