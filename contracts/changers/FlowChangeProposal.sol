// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { CommissionSplitter } from "moc-main/contracts/auxiliary/CommissionSplitter.sol";
import { IChangerContract } from "../interfaces/IChangerContract.sol";

/**
  In this changer we change:

  1) Set Fee flow output to new commission splitter
  2) Set TCInterest output to new commission splitter
  3) New implementation of MoCQueue (fix bug)
  4) New feeTokenPriceProvider get the price from OKU swap
  5) Update amount of blocks to wait for next TC interest payment
  6) Update amount of blocks between settlements
  7) Update Flux capacitor decay block span
  8) Update how many blocks should pass between EMA calculations
 */

interface IMocCARC20 {
    function setMocFeeFlowAddress(address mocFeeFlowAddress_) external;

    function setTCInterestCollectorAddress(address tcInterestCollectorAddress_) external;

    function setFeeTokenPriceProviderAddress(address mocFeeTokenPriceProviderAddress_) external;

    function mocQueue() external view returns (address mocQueue_);

    function setTCInterestPaymentBlockSpan(uint256 tcInterestPaymentBlockSpan_) external;

    function setBes(uint256 bes_) external;

    function setDecayBlockSpan(uint256 decayBlockSpan_) external;

    function setEmaCalculationBlockSpan(uint256 blockSpan_) external;
}

interface IMocQueue {
     function upgradeTo(address newMocQueueImpl_) external;
}


contract FlowChangeProposal is IChangerContract {
    // ------- Storage -------

    // MocCore proxy contract
    IMocCARC20 public immutable mocCoreProxy;
    // MocQueue proxy contract
    IMocQueue public immutable mocQueueProxy;
    // new MocQueue implementation contract
    address public immutable newMocQueueImpl;
    // Fee Token price provider
    address public feeTokenPriceProvider;
    // new operations fees splitter
    address public immutable feesSplitterProxy;
    // new TC interests splitter
    address public immutable tcInterestsSplitterProxy;
    // Amount of blocks to wait for next TC interest payment
    uint256 public tcInterestPaymentBlockSpan;
    // Number of blocks between settlements
    uint256 public settlementBlockSpan;
    // Flux capacitor decay block span
    uint256 public decayBlockSpan;
    // How many blocks should pass between EMA calculations
    uint256 public emaCalculationBlockSpan;

    /**
     * @notice constructor
     * @param mocCoreProxy_ MocCore proxy contract
     * @param newMocQueueImpl_ new MocQueue implementation contract
     * @param feeTokenPriceProvider_ new Fee Token price provider address
     * @param feesSplitterProxy_ new Commission splitter for MoCFee collector
     * @param tcInterestsSplitterProxy_ new Commission splitter for both TCInterest
     * @param tcInterestPaymentBlockSpan_ Amount of blocks to wait for next TC interest payment
     * @param settlementBlockSpan_ Number of blocks between settlements
     * @param decayBlockSpan_ Flux capacitor decay block span
     * @param emaCalculationBlockSpan_ How many blocks should pass between EMA calculations
     */
    constructor(
        IMocCARC20 mocCoreProxy_,
        address newMocQueueImpl_,
        address feeTokenPriceProvider_,
        address feesSplitterProxy_,
        address tcInterestsSplitterProxy_,
        uint256 tcInterestPaymentBlockSpan_,
        uint256 settlementBlockSpan_,
        uint256 decayBlockSpan_,
        uint256 emaCalculationBlockSpan_
    ) {
        mocCoreProxy = mocCoreProxy_;
        newMocQueueImpl = newMocQueueImpl_;
        feeTokenPriceProvider = feeTokenPriceProvider_;
        feesSplitterProxy = feesSplitterProxy_;
        tcInterestsSplitterProxy = tcInterestsSplitterProxy_;
        tcInterestPaymentBlockSpan = tcInterestPaymentBlockSpan_;
        settlementBlockSpan = settlementBlockSpan_;
        decayBlockSpan = decayBlockSpan_;
        emaCalculationBlockSpan = emaCalculationBlockSpan_;
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
        mocCoreProxy.setTCInterestCollectorAddress(tcInterestsSplitterProxy);
        mocCoreProxy.setFeeTokenPriceProviderAddress(feeTokenPriceProvider);

        mocCoreProxy.setTCInterestPaymentBlockSpan(tcInterestPaymentBlockSpan);
        mocCoreProxy.setBes(settlementBlockSpan);
        mocCoreProxy.setDecayBlockSpan(decayBlockSpan);
        mocCoreProxy.setEmaCalculationBlockSpan(emaCalculationBlockSpan);
    }

}



