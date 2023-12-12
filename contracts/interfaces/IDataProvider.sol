// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

/**
 * @title IDataProvider
 * @notice Generic interface, to query for any bytes32 sized data from an external provider
 */
interface IDataProvider {
    /**
     * @notice returns the given `data` if `valid`
     * @param data peeked
     * @param valid true if the data is valid
     */
    function peek() external view returns (bytes32 data, bool valid);
}
