// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { IChangerContract } from "../interfaces/IChangerContract.sol";

/**
  In this changer we change:

  1) Upgrade new Implementation of RevAuction BTC2MOC
  2) Set nre Fee Token Price Provider address for MOC/USD
  3) Set new Fee Token Price Provider address for MOC/RIF
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

    /**
     * @notice constructor
     * @param rocCoreProxy_ RoC Core proxy contract ROC V2
     * @param mocMocStateProxy_ MoCState proxy contract MOC V1
     * @param upgradeDelegator_ Upgrade Delegator for OMOC
     * @param mocFeeTokenPriceProvider_ new Fee Token Price Provider address for MOC/USD
     * @param rocFeeTokenPriceProvider_ new Fee Token Price Provider address for MOC/RIF
     * @param revAucBTC2MOCProxy_ Proxy of the RevAuction BTC2MOC
     * @param revAucBTC2MOCNewImplement_ Implementation of the RevAuction BTC2MOC
     */
    constructor(
        IMocCARC20 rocCoreProxy_,
        IMoCState mocMocStateProxy_,
        IUpgradeDelegator upgradeDelegator_,
        address mocFeeTokenPriceProvider_,
        address rocFeeTokenPriceProvider_,
        address revAucBTC2MOCProxy_,
        address revAucBTC2MOCNewImplement_
    ) {
        rocCoreProxy = rocCoreProxy_;
        mocMocStateProxy = mocMocStateProxy_;
        upgradeDelegator = upgradeDelegator_;
        mocFeeTokenPriceProvider = mocFeeTokenPriceProvider_;
        rocFeeTokenPriceProvider = rocFeeTokenPriceProvider_;
        revAucBTC2MOCProxy = revAucBTC2MOCProxy_;
        revAucBTC2MOCNewImplement = revAucBTC2MOCNewImplement_;
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
    }

}



