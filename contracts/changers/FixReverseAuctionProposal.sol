// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { IChangerContract } from "../interfaces/IChangerContract.sol";

/**
  In this changer we change:

  1) Upgrade new Implementation of RevAuction BTC2MOC
  2) Set nre Fee Token Price Provider address for MOC/USD
  3) Set new Fee Token Price Provider address for MOC/RIF
  4) MOC Fix Address output Commission Splitter V2 MoC Token output 2
  5) ROC Fix Address output Commission Splitter V2 MoC Token output 2
  6) Set new Fee to Rev Auction RIF2BTC
  7) Set new Fee to Rev Auction BTC2RIF
 */

interface IMocCARC20 {
    function setFeeTokenPriceProviderAddress(address mocFeeTokenPriceProviderAddress_) external;
}

interface IMoCState {
    function setMoCPriceProvider(address mocProviderAddress_) external;
}

interface IUpgradeDelegator {
    function upgrade(address proxy_, address implementation_) external;
}

interface IMOCCommissionSplitterV2 {
    function setOutputTokenGovernAddress_2(address payable _outputTokenGovernAddress_2) external;
}

interface IROCCommissionSplitterV2 {
    function setFeeTokenAddressRecipient2(address payable feeTokenAddressRecipient2_) external;
}

interface IReverseAuctionUniswapToken {
    function setFee(uint24 fee) external;
}

contract FixReverseAuctionProposal is IChangerContract {
    // ------- Storage -------

    // MocCore proxy contract V2 - Project ROC
    IMocCARC20 public immutable rocCoreProxy;
    // MocState proxy contract V1 - Project MOC
    IMoCState public immutable mocMocStateProxy;
    // Upgrade Delegator for OMOC
    IUpgradeDelegator public immutable upgradeDelegator;
    // MoC Fee Token price provider
    address public mocFeeTokenPriceProvider;
    // RoC Fee Token price provider
    address public rocFeeTokenPriceProvider;
    // revAuction BTC2MOC proxy
    address public immutable revAucBTC2MOCProxy;
    // revAuction BTC2MOC new implementation
    address public immutable revAucBTC2MOCNewImplement;
    // MoC Commission Splitter V2
    IMOCCommissionSplitterV2 public immutable mocCommissionSplitterV2;
    // ROC Commission Splitter V2
    IROCCommissionSplitterV2 public immutable rocCommissionSplitterV2;
    // MOC Output Token MOC Destination Recipient 2
    address payable public immutable mocFeeTokenAddressRecipient2;
    // ROC Output Token MOC Destination Recipient 2
    address payable public immutable rocFeeTokenAddressRecipient2;
    // Reverse Auction RIF2BTC
    IReverseAuctionUniswapToken public immutable revAuctionRIF2BTC;
    // Reverse Auction BTC2RIF
    IReverseAuctionUniswapToken public immutable revAuctionBTC2RIF;
    // Rev Auction Fee
    uint24 public immutable revAuctionFee;

    /**
     * @notice constructor
     * @param rocCoreProxy_ RoC Core proxy contract ROC V2
     * @param mocMocStateProxy_ MoCState proxy contract MOC V1
     * @param upgradeDelegator_ Upgrade Delegator for OMOC
     * @param mocFeeTokenPriceProvider_ new Fee Token Price Provider address for MOC/USD
     * @param rocFeeTokenPriceProvider_ new Fee Token Price Provider address for MOC/RIF
     * @param revAucBTC2MOCProxy_ Proxy of the RevAuction BTC2MOC
     * @param revAucBTC2MOCNewImplement_ Implementation of the RevAuction BTC2MOC
     * @param mocCommissionSplitterV2_ MoC Commission Splitter V2
     * @param rocCommissionSplitterV2_ RoC Commission Splitter V2
     * @param mocFeeTokenAddressRecipient2_ MOC Output Token MOC Destination Recipient 2
     * @param rocFeeTokenAddressRecipient2_ ROC Output Token MOC Destination Recipient 2
     * @param revAuctionRIF2BTC_ Reverse Auction RIF2BTC
     * @param revAuctionBTC2RIF_ Reverse Auction BTC2RIF
     * @param revAuctionFee_ Reverse Auction Uniswap Token Fee
     */
    constructor(
        IMocCARC20 rocCoreProxy_,
        IMoCState mocMocStateProxy_,
        IUpgradeDelegator upgradeDelegator_,
        address mocFeeTokenPriceProvider_,
        address rocFeeTokenPriceProvider_,
        address revAucBTC2MOCProxy_,
        address revAucBTC2MOCNewImplement_,
        IMOCCommissionSplitterV2 mocCommissionSplitterV2_,
        IROCCommissionSplitterV2 rocCommissionSplitterV2_,
        address payable mocFeeTokenAddressRecipient2_,
        address payable rocFeeTokenAddressRecipient2_,
        IReverseAuctionUniswapToken revAuctionRIF2BTC_,
        IReverseAuctionUniswapToken revAuctionBTC2RIF_,
        uint24 revAuctionFee_
    ) {
        rocCoreProxy = rocCoreProxy_;
        mocMocStateProxy = mocMocStateProxy_;
        upgradeDelegator = upgradeDelegator_;
        mocFeeTokenPriceProvider = mocFeeTokenPriceProvider_;
        rocFeeTokenPriceProvider = rocFeeTokenPriceProvider_;
        revAucBTC2MOCProxy = revAucBTC2MOCProxy_;
        revAucBTC2MOCNewImplement = revAucBTC2MOCNewImplement_;
        mocCommissionSplitterV2 = mocCommissionSplitterV2_;
        rocCommissionSplitterV2 = rocCommissionSplitterV2_;
        mocFeeTokenAddressRecipient2 = mocFeeTokenAddressRecipient2_;
        rocFeeTokenAddressRecipient2 = rocFeeTokenAddressRecipient2_;
        revAuctionRIF2BTC = revAuctionRIF2BTC_;
        revAuctionBTC2RIF = revAuctionBTC2RIF_;
        revAuctionFee = revAuctionFee_;
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
        upgradeDelegator.upgrade(revAucBTC2MOCProxy, revAucBTC2MOCNewImplement);
    }

    /**
      @notice Intended to prepare the system for the upgrade
    */
    function _beforeUpgrade() internal view {}

    /**
      @notice Intended to do the final tweaks after the upgrade, for example initialize the contract
    */
    function _afterUpgrade() internal {
        // Update MOC Fee Token Price Provider MOC/USD
        mocMocStateProxy.setMoCPriceProvider(mocFeeTokenPriceProvider);
        // Update ROC Fee Token Price Provider RIF/USD
        rocCoreProxy.setFeeTokenPriceProviderAddress(rocFeeTokenPriceProvider);
        // MOC Output Token MOC Destination Recipient 2
        mocCommissionSplitterV2.setOutputTokenGovernAddress_2(mocFeeTokenAddressRecipient2);
        // ROC Output Token MOC Destination Recipient 2
        rocCommissionSplitterV2.setFeeTokenAddressRecipient2(rocFeeTokenAddressRecipient2);
        // Change Fee to rev auction RIF2BTC
        revAuctionRIF2BTC.setFee(revAuctionFee);
        // Change Fee to rev auction BTC2RIF
        revAuctionBTC2RIF.setFee(revAuctionFee);
    }
}
