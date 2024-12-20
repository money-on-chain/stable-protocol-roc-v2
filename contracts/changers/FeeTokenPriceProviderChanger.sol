// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { IChangerContract } from "../interfaces/IChangerContract.sol";
import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";

/**
  @title FeeTokenPriceProviderChanger
  @notice This contract is a ChangerContract intended to be used with Moc Aeropulus 
  governance system.
 */
contract FeeTokenPriceProviderChanger is IChangerContract {
    MocCARC20 public immutable mocCore;
    address public immutable newFeeTokenPriceProvider;

    /** 
    @notice Constructor
    @param mocCore_ Address of the contract who's Governor we want to change
    @param newFeeTokenPriceProvider_ Address of the new FeeTokenPriceProvider
  */
    constructor(address mocCore_, address newFeeTokenPriceProvider_) {
        mocCore = MocCARC20(mocCore_);
        newFeeTokenPriceProvider = newFeeTokenPriceProvider_;
    }

    /**
    @notice Execute the changes.
    @dev Should be called by the governor, but this contract does not check that explicitly
    because it is not its responsibility in the current architecture
   */
    function execute() external {
        mocCore.setFeeTokenPriceProviderAddress(newFeeTokenPriceProvider);
    }
}
