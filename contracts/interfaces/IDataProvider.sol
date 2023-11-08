// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

/**
 * @title IDataProvider
 * @notice Amphiraos-Oracle Interface for peeking the data from an oracle
 * @dev https://github.com/money-on-chain/Amphiraos-Oracle
 */
interface IDataProvider {
    /**
     * @notice returns the given `data` if `valid`
     * @param data peeked
     * @param valid true if the data is valid
     */
    function peek() external view returns (bytes32 data, bool valid);
}
