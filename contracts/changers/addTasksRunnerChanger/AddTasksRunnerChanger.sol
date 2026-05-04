// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { MocMultiCollateralGuard, MocOperations } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { BucketParams } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralBase.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { CommissionSplitterRC20 } from "moc-main-latest/contracts/auxiliary/CommissionSplitterRC20.sol";

interface IOracleManager {
    function registerCoinPair(bytes32 coinPair, address addr) external;
}

interface IReverseAuction {
    function setOutputAccount(address outputAccount_) external;
}

interface IBufferToken {
    function getOutput(uint256 idx) external view returns (address, uint256, uint256, uint256);
    function removeOutput(uint256 idx) external;
    function addOutput(address payable output, uint256 split, uint256 threshold) external;
}

interface IGovernedRegistry {
    function removeAddressArrayElement(bytes32 _key, address value) external;
}

interface IMocMultiCollateralGuardPriceUpdates {
    function setPriceUpdatesFeeRecipient(address priceUpdatesFeeRecipient_) external;
}

/**
 * @title AddTasksRunnerChanger
 * @notice This contract is a ChangeContract intended to be used with Moc Aeropulus
 * governance system.
 * @dev 1. Upgrade MocCore & MocQueue for buckets 0 and 1
 *      2. Set new MocCoreExpansion for buckets 0 and 1
 *      3. Upgrade MocMultiCollateralGuard
 *      4. Set coinbase execution fee recipient (RevAuction RBTCtoMOC -> TasksRunner)
 *      5. Set rebalance execution fee recipient for buckets 0 and 1
 *         (RevAuction RIFtoMOC and DOCtoMOC -> TasksRunner)
 *      6. Set price updates fee recipient (RevAuction RBTCtoMOC -> RocNodes)
 *      7. Register TasksRunner in the OracleManager as a CoinPair
 *      8. Set newly deployed reverse auctions output to TasksRunner
 *      9. Set current RevAuction RIFtoMOC output to RocRewardsBuffer
 *      10. Replace RocrRewardsBuffer output 0 (from mocRewardsBuffer to RocRewardsBuffer)
 *      11. Set RifProRewardsBuffer output 0 (from mocRewardsBuffer to RocRewardsBuffer)
 *      12. Set current RevAuction DOCtoMOC output to RocRewardsBuffer
 *      13. Remove old reverse auctions and buffers from governed registry
 */
contract AddTasksRunnerChanger is IChangeContract {
    bytes32 private constant MOC_FLOW_BUFFERS = 0x4cb845794d5472a713e41e8e4ddc566dab8d695f1dc6c8edd43dad9d55112a22;
    bytes32 private constant MOC_FLOW_REVERSE_AUCTIONS =
        0x0428ec087e0cce276a71d1caf1afe4da32a2d48b3ebe579040612b5bd262ff73;

    MocMultiCollateralGuard public immutable mocMultiCollateralGuard;
    address public immutable mocMultiCollateralGuardImplementation;
    address public immutable mocCoreBucket0Implementation;
    address public immutable mocCoreBucket1Implementation;
    address public immutable mocQueueBucket0Implementation;
    address public immutable mocQueueBucket1Implementation;
    address public immutable mocCoreExpansionBucket0;
    address public immutable mocCoreExpansionBucket1;
    address payable public immutable revAuctionRBTCtoMOC_tasksRunner;
    address public immutable revAuctionRIFtoMOC_tasksRunner;
    address public immutable revAuctionDOCtoMOC_tasksRunner;
    address public immutable revAuctionRBTCtoMOC_rocNodes;
    address public immutable revAuctionRIFtoMOC_rocRewardsBuffer;
    address public immutable revAuctionMOCtoRIF_rifBucket;
    address public immutable revAuctionDOCtoMOC_rocRewardsBuffer;
    address public immutable revAuctionMOCtoDOC_docBucket;
    address public immutable commissionSplitterV2_rocRewardsBuffer;
    address public immutable rifProRewardsBuffer_rocRewardsBuffer;
    address public immutable rocrRewardsBuffer;
    IOracleManager public immutable oracleManager;
    address public immutable tasksRunner;
    bytes32 public immutable tasksRunnerCoinPair;
    address public immutable rocRewardsBuffer;
    IGovernedRegistry public immutable governedRegistry;

    /**
    @notice Constructor
    @param mocMultiCollateralGuard_ Address of the proxy mocMultiCollateralGuard
    @param mocMultiCollateralGuardImplementation_ New implementation for MocMultiCollateralGuard proxy
    @param mocCoreBucket0Implementation_ New implementation for bucket 0 MocCore proxy
    @param mocCoreBucket1Implementation_ New implementation for bucket 1 MocCore proxy
    @param mocQueueBucket0Implementation_ New implementation for bucket 0 MocQueue proxy
    @param mocQueueBucket1Implementation_ New implementation for bucket 1 MocQueue proxy
    @param mocCoreExpansionBucket0_ New MocCoreExpansion for bucket 0
    @param mocCoreExpansionBucket1_ New MocCoreExpansion for bucket 1
    @param revAuctionRBTCtoMOC_tasksRunner_ Address for coinbase execution fee recipient (TasksRunner)
    @param revAuctionRIFtoMOC_tasksRunner_ Address for bucket 0 rebalance execution fee recipient (TasksRunner)
    @param revAuctionDOCtoMOC_tasksRunner_ Address for bucket 1 rebalance execution fee recipient (TasksRunner)
    @param revAuctionRBTCtoMOC_rocNodes_ Address for price updates fee recipient (RocNodes)
    @param revAuctionRIFtoMOC_rocRewardsBuffer_ Address for RevAuction RIFtoMOC output recipient (RocRewardsBuffer)
    @param revAuctionMOCtoRIF_rifBucket_ Address of current RevAuction MOCtoRIF (registered in flow reverse auctions)
    @param revAuctionDOCtoMOC_rocRewardsBuffer_ Address for RevAuction DOCtoMOC output recipient (RocRewardsBuffer)
    @param revAuctionMOCtoDOC_docBucket_ Address of current RevAuction MOCtoDOC (registered in flow reverse auctions)
    @param commissionSplitterV2_rocRewardsBuffer_ Address for CommissionSplitterV2 output recipient (RocRewardsBuffer)
    @param rifProRewardsBuffer_rocRewardsBuffer_ Address for RifProRewardsBuffer output recipient (RocRewardsBuffer)
    @param rocrRewardsBuffer_ Address of RocrRewardsBuffer (registered in flow buffers)
    @param rocRewardsBuffer_ Address of RocRewardsBuffer
    @param governedRegistry_ Governed registry where old flow addresses are removed
    @param oracleManager_ OracleManager where TasksRunner coin pair will be registered
    @param tasksRunner_ TasksRunner contract to register as coin pair address
    @param tasksRunnerCoinPair_ Coin pair identifier to register for TasksRunner
  */
    constructor(
        MocMultiCollateralGuard mocMultiCollateralGuard_,
        address mocMultiCollateralGuardImplementation_,
        address mocCoreBucket0Implementation_,
        address mocCoreBucket1Implementation_,
        address mocQueueBucket0Implementation_,
        address mocQueueBucket1Implementation_,
        address mocCoreExpansionBucket0_,
        address mocCoreExpansionBucket1_,
        address payable revAuctionRBTCtoMOC_tasksRunner_,
        address revAuctionRIFtoMOC_tasksRunner_,
        address revAuctionDOCtoMOC_tasksRunner_,
        address revAuctionRBTCtoMOC_rocNodes_,
        address revAuctionRIFtoMOC_rocRewardsBuffer_,
        address revAuctionMOCtoRIF_rifBucket_,
        address revAuctionDOCtoMOC_rocRewardsBuffer_,
        address revAuctionMOCtoDOC_docBucket_,
        address commissionSplitterV2_rocRewardsBuffer_,
        address rifProRewardsBuffer_rocRewardsBuffer_,
        address rocrRewardsBuffer_,
        address rocRewardsBuffer_,
        IGovernedRegistry governedRegistry_,
        IOracleManager oracleManager_,
        address tasksRunner_,
        bytes32 tasksRunnerCoinPair_
    ) {
        mocMultiCollateralGuard = mocMultiCollateralGuard_;
        mocMultiCollateralGuardImplementation = mocMultiCollateralGuardImplementation_;
        mocCoreBucket0Implementation = mocCoreBucket0Implementation_;
        mocCoreBucket1Implementation = mocCoreBucket1Implementation_;
        mocQueueBucket0Implementation = mocQueueBucket0Implementation_;
        mocQueueBucket1Implementation = mocQueueBucket1Implementation_;
        mocCoreExpansionBucket0 = mocCoreExpansionBucket0_;
        mocCoreExpansionBucket1 = mocCoreExpansionBucket1_;
        revAuctionRBTCtoMOC_tasksRunner = revAuctionRBTCtoMOC_tasksRunner_;
        revAuctionRIFtoMOC_tasksRunner = revAuctionRIFtoMOC_tasksRunner_;
        revAuctionDOCtoMOC_tasksRunner = revAuctionDOCtoMOC_tasksRunner_;
        revAuctionRBTCtoMOC_rocNodes = revAuctionRBTCtoMOC_rocNodes_;
        revAuctionRIFtoMOC_rocRewardsBuffer = revAuctionRIFtoMOC_rocRewardsBuffer_;
        revAuctionMOCtoRIF_rifBucket = revAuctionMOCtoRIF_rifBucket_;
        revAuctionDOCtoMOC_rocRewardsBuffer = revAuctionDOCtoMOC_rocRewardsBuffer_;
        revAuctionMOCtoDOC_docBucket = revAuctionMOCtoDOC_docBucket_;
        commissionSplitterV2_rocRewardsBuffer = commissionSplitterV2_rocRewardsBuffer_;
        rifProRewardsBuffer_rocRewardsBuffer = rifProRewardsBuffer_rocRewardsBuffer_;
        rocrRewardsBuffer = rocrRewardsBuffer_;
        rocRewardsBuffer = rocRewardsBuffer_;
        governedRegistry = governedRegistry_;
        oracleManager = oracleManager_;
        tasksRunner = tasksRunner_;
        tasksRunnerCoinPair = tasksRunnerCoinPair_;
    }

    /**
    @notice Execute the changes.
    @dev Should be called by the governor, but this contract does not check that explicitly
    because it is not its responsibility in the current architecture
   */
    function execute() external {
        MocOperations bucket0 = mocMultiCollateralGuard.buckets(0);
        MocOperations bucket1 = mocMultiCollateralGuard.buckets(1);

        // 1) Upgrade buckets and queues
        bucket0.upgradeTo(mocCoreBucket0Implementation);
        bucket1.upgradeTo(mocCoreBucket1Implementation);

        MocQueue(bucket0.mocQueue()).upgradeTo(mocQueueBucket0Implementation);
        MocQueue(bucket1.mocQueue()).upgradeTo(mocQueueBucket1Implementation);

        // 2) Set MocCoreExpansion on buckets
        bucket0.setMocCoreExpansion(mocCoreExpansionBucket0);
        bucket1.setMocCoreExpansion(mocCoreExpansionBucket1);

        // 3) Upgrade MocMultiCollateralGuard
        mocMultiCollateralGuard.upgradeTo(mocMultiCollateralGuardImplementation);

        // 4) Set coinbase execution fee recipient
        mocMultiCollateralGuard.setCoinbaseExecFeeRecipient(revAuctionRBTCtoMOC_tasksRunner);

        // 5) Set rebalance execution fee recipients for buckets 0 and 1
        mocMultiCollateralGuard.editBucket(bucket0, _buildBucketParams(bucket0, revAuctionRIFtoMOC_tasksRunner));
        mocMultiCollateralGuard.editBucket(bucket1, _buildBucketParams(bucket1, revAuctionDOCtoMOC_tasksRunner));

        // 6) Set price updates fee recipient
        IMocMultiCollateralGuardPriceUpdates(address(mocMultiCollateralGuard)).setPriceUpdatesFeeRecipient(
            revAuctionRBTCtoMOC_rocNodes
        );

        // 7) Register TasksRunner as CoinPair in OracleManager
        oracleManager.registerCoinPair(tasksRunnerCoinPair, tasksRunner);

        // 8) Set newly deployed reverse auctions output to TasksRunner
        IReverseAuction(revAuctionRBTCtoMOC_tasksRunner).setOutputAccount(tasksRunner);
        IReverseAuction(revAuctionRIFtoMOC_tasksRunner).setOutputAccount(tasksRunner);
        IReverseAuction(revAuctionDOCtoMOC_tasksRunner).setOutputAccount(tasksRunner);

        // 9) Set current RevAuction RIFtoMOC output to RocRewardsBuffer
        IReverseAuction(revAuctionRIFtoMOC_rocRewardsBuffer).setOutputAccount(rocRewardsBuffer);

        // 10) Replace RocrRewardsBuffer output 0 (from mocRewardsBuffer to RocRewardsBuffer)
        (, uint256 rocrSplit, , uint256 rocrThreshold) = IBufferToken(rocrRewardsBuffer).getOutput(0);
        IBufferToken(rocrRewardsBuffer).removeOutput(0);
        IBufferToken(rocrRewardsBuffer).addOutput(payable(rocRewardsBuffer), rocrSplit, rocrThreshold);

        // 11) Set RifProRewardsBuffer output 0 (from mocRewardsBuffer to RocRewardsBuffer)
        (, uint256 split, , uint256 threshold) = IBufferToken(rifProRewardsBuffer_rocRewardsBuffer).getOutput(0);
        IBufferToken(rifProRewardsBuffer_rocRewardsBuffer).removeOutput(0);
        IBufferToken(rifProRewardsBuffer_rocRewardsBuffer).addOutput(payable(rocRewardsBuffer), split, threshold);

        // 12) Set current RevAuction DOCtoMOC output to RocRewardsBuffer
        IReverseAuction(revAuctionDOCtoMOC_rocRewardsBuffer).setOutputAccount(rocRewardsBuffer);

        // 13) Remove reverse auctions and buffer from governed registry
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionRIFtoMOC_rocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, rifProRewardsBuffer_rocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionMOCtoRIF_rifBucket);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionDOCtoMOC_rocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionMOCtoDOC_docBucket);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, rocrRewardsBuffer);
    }

    function _buildBucketParams(
        MocOperations bucket_,
        address rebalanceExecFeeRecipient_
    ) internal view returns (BucketParams memory) {
        return
            BucketParams({
                acCoinbasePriceProvider: mocMultiCollateralGuard.acCoinbasePriceProvider(bucket_),
                rebalanceExecFeeRecipient: rebalanceExecFeeRecipient_,
                rtcThrld: mocMultiCollateralGuard.rtcThrld(bucket_),
                microLiquidationThrld: mocMultiCollateralGuard.microLiquidationThrld(bucket_),
                penaltyRate: mocMultiCollateralGuard.penaltyRate(bucket_)
            });
    }
}
