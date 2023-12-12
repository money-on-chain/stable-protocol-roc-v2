// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IDataProvider } from "../interfaces/IDataProvider.sol";

/**
 * @title Flux Capacitor Operation Difference Maximum DataProvider
 * @notice Allows the Owner, to set the value so that the protocol cold peek it.
 */
contract FCMaxOpDifferenceProvider is Ownable, IDataProvider {
    bytes32 public data;

    constructor(address owner_) Ownable() {
        _transferOwnership(owner_);
    }

    function peek() external view returns (bytes32, bool) {
        return (data, true);
    }

    function setMaxOperationalDifference(uint256 data_) external onlyOwner {
        data = bytes32(data_);
    }
}
