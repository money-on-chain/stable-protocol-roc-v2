// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main/contracts/interfaces/IChangeContract.sol";
import { IDataProvider } from "moc-main/contracts/interfaces/IDataProvider.sol";
import { IPriceProvider } from "moc-main/contracts/interfaces/IPriceProvider.sol";
import { IMocSwapper } from "moc-main/contracts/interfaces/IMocSwapper.sol";
import { MocRif } from "../../MocRif.sol";
import { PeggedTokenParams } from "moc-main/contracts/core/MocCommons.sol";
import { MocQueue } from "moc-main/contracts/queue/MocQueue.sol";
import { MocMultiCollateralGuard } from "moc-main/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { BucketParams } from "moc-main/contracts/multiCollateral/MocMultiCollateralBase.sol";
import { MocRC20 } from "moc-main/contracts/tokens/MocRC20.sol";

/**
  @title MultiCollateralUpgradeChanger
  @notice This contract is a ChangeContract intended to be used with Moc Aeropulus 
  governance system.
  @dev 1. Upgrade MocRif to a new implementation with the multicollateral feature
       2. Upgrade USDRif to a new implementation that supports multicollateral
       3. Migrate MocQueueRif. A migration is needed because there are breaking changes
            We are not enforcing that old queue is empty to execute this changer. We are gonna
            manage that off-chain. If for any reason the queue is not empty, those pending operations
            will be handled independently on a new changer.
       4. Migrate time trackers that uses block.number to timestamps
       5. Set the new price provider for USDRif that has the getLastPublicationBlock() function implemented
 */
contract MultiCollateralUpgradeChanger is IChangeContract {
    // ------- Custom Errors -------
    error InvalidSetting();

    // ------- Storage -------
    // USDRIF proxy contract to be upgraded
    MocRC20 public immutable usdRifProxy;
    // address of the USDRIF implementation contract the proxy will delegate to
    address public immutable usdRifNewImplementation;
    // MocRif proxy contract to be upgraded
    MocRif public immutable mocRifProxy;
    // address of the MocRif implementation contract the proxy will delegate to
    address public immutable mocRifImplementation;
    // address of the new MocCoreExpansion contract implementation
    address public immutable mocMocCoreExpansionImplementation;
    // new MocQueueRif proxy contract
    MocQueue public immutable newMocQueueRifProxy;
    // MocMultiCollateralGuardProxy proxy contract
    MocMultiCollateralGuard public immutable mocMultiCollateralGuardProxy;
    // new rif/usd price provider
    address public immutable newPriceProvider;
    // block span in seconds
    uint256 public blockSpan;

    /** 
      @notice Constructor
      @param mocRifProxy_ address of the proxy to be upgraded
      @param mocRifImplementation_ address of the contract the proxy will delegate to
      @param usdRifNewImplementation_ address of the TP contract the proxy will delegate to
      @param mocMocCoreExpansionImplementation_ Address of the new MocCoreExpansion implementation
      @param newMocQueueRifProxy_ address of the new MocQueue proxy
      @param newPriceProvider_ address of the new price provider
      @param blockSpan_ block span in seconds
    */
    constructor(
        MocRif mocRifProxy_,
        address mocRifImplementation_,
        address usdRifNewImplementation_,
        address mocMocCoreExpansionImplementation_,
        MocQueue newMocQueueRifProxy_,
        address newPriceProvider_,
        uint256 blockSpan_
    ) {
        mocRifProxy = mocRifProxy_;
        mocRifImplementation = mocRifImplementation_;
        usdRifNewImplementation = usdRifNewImplementation_;
        mocMocCoreExpansionImplementation = mocMocCoreExpansionImplementation_;
        newMocQueueRifProxy = newMocQueueRifProxy_;
        mocMultiCollateralGuardProxy = newMocQueueRifProxy.mocMultiCollateralGuard();
        usdRifProxy = MocRC20(address(mocRifProxy.tpTokens(0)));
        newPriceProvider = newPriceProvider_;
        blockSpan = blockSpan_;

        // reverts if some parameter is wrong
        verifySettings();
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
        mocRifProxy.upgradeTo(mocRifImplementation);
        usdRifProxy.upgradeTo(usdRifNewImplementation);
    }

    /**
      @notice Intended to prepare the system for the upgrade
    */
    function _beforeUpgrade() internal {
        // Initialize new Rif MocQueue OperationId with current values, to maintain continuity
        MocQueue legacyMocQueueRifProxy = MocQueue(mocRifProxy.mocQueue());
        uint256 currentOperIdCount = legacyMocQueueRifProxy.operIdCount();
        newMocQueueRifProxy.initOperId(currentOperIdCount, currentOperIdCount);
    }

    /**
      @notice Intended to do the final tweaks after the upgrade, for example initialize the contract
    */
    function _afterUpgrade() internal {
        //set new MocQueue to MocCore
        mocRifProxy.setMocQueue(payable(address(newMocQueueRifProxy)));
        // set new MocCoreExpansion to MocCore
        mocRifProxy.setMocCoreExpansion(mocMocCoreExpansionImplementation);
        // register MocCore on MocQueue
        newMocQueueRifProxy.registerBucket(mocRifProxy);

        // all rebalance params are in 0 because there is not another bucket available
        BucketParams memory bucketParams = BucketParams({
            acCoinbasePriceProvider: IPriceProvider(address(0)),
            rtcThrld: 0,
            microLiquidationThrld: 0,
            penaltyRate: 0
        });
        IMocSwapper[] memory mocSwappers;
        // register MocCore on MocMultiCollateralGuard
        mocMultiCollateralGuardProxy.addBucket(mocRifProxy, bucketParams, mocSwappers);

        // migrate block numbers to timestamps
        uint256 nextEmaCalculation = convertNextBlockToTimestamp(mocRifProxy.nextEmaCalculation());
        uint256 nextTCInterestPayment = convertNextBlockToTimestamp(mocRifProxy.nextTCInterestPayment());
        uint256 nextSettlementTime = convertNextBlockToTimestamp(mocRifProxy.nextSettlementTime());
        uint256 lastOperationTimeStamp = block.timestamp; // simplify the logic setting current timestamp

        mocRifProxy.migrateTimestamps(
            nextEmaCalculation,
            nextTCInterestPayment,
            nextSettlementTime,
            lastOperationTimeStamp
        );
        mocRifProxy.setDecayTimeSpan(mocRifProxy.decayTimeSpan() * blockSpan);
        mocRifProxy.setEmaCalculationTimeSpan(mocRifProxy.emaCalculationTimeSpan() * blockSpan);
        mocRifProxy.setTCInterestPaymentTimeSpan(mocRifProxy.tcInterestPaymentTimeSpan() * blockSpan);
        mocRifProxy.setSettlementTimeSpan(mocRifProxy.settlementTimeSpan() * blockSpan);

        // edit USDRif pegged token to set the new price provider
        (, uint256 emaSf) = mocRifProxy.tpEma(0);
        PeggedTokenParams memory peggedTokenParams = PeggedTokenParams({
            priceProviderAddress: newPriceProvider,
            tpCtarg: mocRifProxy.tpCtarg(0),
            tpMintFee: mocRifProxy.tpMintFees(address(usdRifProxy)),
            tpRedeemFee: mocRifProxy.tpRedeemFees(address(usdRifProxy)),
            tpEma: 0, // Emma is not editable, only initialized
            tpEmaSf: emaSf
        });
        mocRifProxy.editPeggedToken(usdRifProxy, peggedTokenParams);

        // reverts if some parameter is wrong
        verifySettings();
    }

    /** 
    @notice convert next block to next timestamp
    @param nextBlock_ next block to convert
    @return nextTimestamp_ next timestamp
  */
    function convertNextBlockToTimestamp(uint256 nextBlock_) public view returns (uint256 nextTimestamp_) {
        if (block.number >= nextBlock_) return block.timestamp;
        uint256 remainingBlocks = nextBlock_ - block.number;
        return block.timestamp + (remainingBlocks * blockSpan);
    }

    /**
      @notice verifies the most importat the configuration params. Reverts if somethings is wrong
    */
    function verifySettings() public view {
        address governor = address(mocRifProxy.governor());
        address pauser = mocRifProxy.pauser();
        // verify governor
        if (governor != address(newMocQueueRifProxy.governor())) revert InvalidSetting();
        if (governor != address(mocMultiCollateralGuardProxy.governor())) revert InvalidSetting();

        // verify pauser
        if (pauser != newMocQueueRifProxy.pauser()) revert InvalidSetting();
        if (pauser != mocMultiCollateralGuardProxy.pauser()) revert InvalidSetting();

        // verify new price provider implements getLastPublicationBlock()
        IPriceProvider(newPriceProvider).getLastPublicationBlock();
    }
}
