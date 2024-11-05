// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { IChangerContract } from "../interfaces/IChangerContract.sol";
import { IDataProvider } from "../interfaces/IDataProvider.sol";
//import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";
//import { MocQueue } from "moc-main/contracts/queue/MocQueue.sol";
//import { CommissionSplitter } from "moc-main/contracts/auxiliary/CommissionSplitter.sol";

/**
  In this changer we change:

  1) Set Fee flow output to new commission splitter
  2) Set TCInterest output to new commission splitter
  3) New implementation of MoCQueue (fix bug)
  4) New feeTokenPriceProvider get the price from OKU swap
 */

interface IMocCARC20 {
    function setMocFeeFlowAddress(address mocFeeFlowAddress_) external;

    function setTCInterestCollectorAddress(address tcInterestCollectorAddress_) external;

    function setFeeTokenPriceProviderAddress(address mocFeeTokenPriceProviderAddress_) external;

    function mocQueue() external view returns (address mocQueue_);
}

interface IMocQueue {
     function upgradeTo(address newMocQueueImpl_) external;
}


contract CommissionSplitterQueueChanger is IChangerContract {
    // ------- Storage -------

    // MocCore proxy contract
    IMocCARC20 public immutable mocCoreProxy;
    // MocQueue proxy contract
    IMocQueue public immutable mocQueueProxy;
    // new MocQueue implementation contract
    address public immutable newMocQueueImpl;
    // Fee Token price provider
    IDataProvider public feeTokenPriceProvider;
    // new operations fees splitter for both TCInterest & MoCFee collector
    address public immutable feesSplitterProxy;

    /**
     * @notice constructor
     * @param mocCoreProxy_ MocCore proxy contract
     * @param newMocQueueImpl_ new MocQueue implementation contract
     * @param feeTokenPriceProvider_ new Fee Token price provider address
     * @param feesSplitterProxy_ new Commission splitter for both TCInterest & MoCFee collector
     */
    constructor(
        IMocCARC20 mocCoreProxy_,
        address newMocQueueImpl_,
        IDataProvider feeTokenPriceProvider_,
        address feesSplitterProxy_
    ) {
        mocCoreProxy = mocCoreProxy_;
        newMocQueueImpl = newMocQueueImpl_;
        feeTokenPriceProvider = feeTokenPriceProvider_;
        feesSplitterProxy = feesSplitterProxy_;
        mocQueueProxy = IMocQueue(mocCoreProxy.mocQueue());
    }

    /**
      @notice Execute the changes.
      @dev Should be called by the governor, but this contract does not check that explicitly
      because it is not its responsibility in the current architecture
      IMPORTANT: This function should not be overridden, you should only redefine
      _beforeUpgrade and _afterUpgrade methods to use this template
    */
    function execute() external {
        _beforeUpgrade();
        _upgrade();
        _afterUpgrade();
    }

    /**
      @notice Upgrade the proxy to the newImplementation
      @dev IMPORTANT: This function should not be overridden
    */
    function _upgrade() internal {
        mocQueueProxy.upgradeTo(newMocQueueImpl);
    }

    /**
      @notice Intended to prepare the system for the upgrade
    */
    function _beforeUpgrade() internal view {}

    /**
      @notice Intended to do the final tweaks after the upgrade, for example initialize the contract
    */
    function _afterUpgrade() internal {
        // update MocCore setups
        mocCoreProxy.setMocFeeFlowAddress(feesSplitterProxy);
        mocCoreProxy.setTCInterestCollectorAddress(feesSplitterProxy);
        mocCoreProxy.setFeeTokenPriceProviderAddress(address(feeTokenPriceProvider));
    }

}



