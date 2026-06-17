// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { MocMultiCollateralGuard, MocOperations } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { BucketParams } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralBase.sol";
import { PeggedTokenParams } from "moc-main-latest/contracts/core/MocCommons.sol";
import { IPriceProvider } from "moc-main-latest/contracts/interfaces/IPriceProvider.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocQueueExecFees } from "moc-main-latest/contracts/queue/MocQueueExecFees.sol";
import { MocRC20 } from "moc-main-latest/contracts/tokens/MocRC20.sol";
import { CommissionSplitterBase } from "moc-main-latest/contracts/auxiliary/CommissionSplitterBase.sol";
import { MocRif } from "../../MocRif.sol";

interface IOracleManager {
    function registerCoinPair(bytes32 coinPair, address addr) external;
    function getContractAddress(bytes32 coinPair) external view returns (address);
    function delegateCallToChanger(bytes calldata data) external returns (bytes memory);
}

interface ICoinPairPriceGovernance {
    function addPricePeekWhitelist(address _account) external;
    function isPricePeekWhitelisted(address _account) external view returns (bool);
}

interface IReverseAuction {
    function setOutputAccount(address outputAccount_) external;
    function setPriceProvider(address priceProvider_) external;
}

interface IBufferLike {
    function addOutput(address payable output, uint256 split, uint256 threshold) external;
    function removeOutput(uint256 idx) external;
    function getOutput(uint256 idx) external view returns (address, uint256, uint256, uint256);
}

interface IGovernedRegistry {
    function getAddress(bytes32 _key) external view returns (address);
    function removeAddressArrayElement(bytes32 _key, address value) external;
}

interface IMocMultiCollateralGuardPriceUpdates {
    function setPriceUpdatesFeeRecipient(address priceUpdatesFeeRecipient_) external;
}

/**
 * @title AddTasksRunnerChanger
 * @notice This contract is a ChangeContract intended to be used with Moc Aeropulus
 * governance system.
 * @dev 1. Upgrade MocCore & MocQueue for RIF and DOC buckets
 *      2. Set new MocCoreExpansion for RIF and DOC buckets
 *      3. Upgrade MocMultiCollateralGuard
 *      4. Set coinbase execution fee recipient (RevAuction RBTCtoMOC -> TasksRunner)
 *      5. Set rebalance execution fee recipient for RIF and DOC buckets
 *         (RevAuction RIFtoMOC and DOCtoMOC -> TasksRunner)
 *      6. Set price updates fee recipient (RevAuction RBTCtoMOC -> SplitPriceUpdateFeesToBtcOracleAndRifOracle)
 *      7. Replace the RIF bucket direct price provider with the new RIF/USD CoinPair
 *      8. Register the new RIF/USD CoinPair in OracleManager
 *      9. Register TasksRunner in the OracleManager as a CoinPair
 *      10. Set newly deployed reverse auctions output to TasksRunner
 *      11. Rewire commission splitters and buffers that fund Foundation / oracle infra
 *      12. Rewire legacy RIF-based reverse auctions to the replacement providers
 *      13. Remove old reverse auctions and buffers from governed registry
 */
contract AddTasksRunnerChanger is IChangeContract {
    bytes32 private constant MOC_FLOW_BUFFERS = 0x4cb845794d5472a713e41e8e4ddc566dab8d695f1dc6c8edd43dad9d55112a22;
    bytes32 private constant MOC_FLOW_REVERSE_AUCTIONS =
        0x0428ec087e0cce276a71d1caf1afe4da32a2d48b3ebe579040612b5bd262ff73;
    bytes32 private constant INFO_ADDR = 0xda9f12e01fc92de345bb741448d36ecb967052dd7aa1670439af833c9a3d78f1;

    // OracleManager storage slots used by delegateCallToChanger(abi.encode(bytes32,uint256)).
    uint256 private constant ORACLE_MANAGER_COIN_PAIR_MAP_SLOT = 104;
    uint256 private constant ORACLE_MANAGER_COIN_PAIR_LIST_SLOT = 105;

    MocMultiCollateralGuard public immutable mocMultiCollateralGuard;
    address public immutable mocMultiCollateralGuardImplementation;
    address public immutable mocCoreRifBucketImplementation;
    address public immutable mocCoreDocBucketImplementation;
    address public immutable mocQueueRifBucketImplementation;
    address public immutable mocQueueDocBucketImplementation;
    address public immutable mocCoreExpansionRifBucket;
    address public immutable mocCoreExpansionDocBucket;
    address payable public immutable revAuctionRBTCtoMOC_tasksRunner;
    address public immutable revAuctionRIFtoMOC_tasksRunner;
    address public immutable revAuctionDOCtoMOC_tasksRunner;
    address public immutable revAuctionRBTCtoMOC_rocNodes;
    address public immutable revAuctionRIFtoMOC_rocRewardsBuffer;
    address public immutable revAuctionMOCtoRIF_rifBucket;
    address public immutable revAuctionDOCtoMOC_rocRewardsBuffer;
    address public immutable revAuctionMOCtoDOC_docBucket;
    address public immutable revAuctionRBTCtoMOC_mocRewardsBuffer;
    address public immutable revAuctionMOCtoRBTC_mocV1;
    address public immutable rifProRewardsBuffer_rocRewardsBuffer;
    address public immutable rocrRewardsBuffer;
    address public immutable bitProRewardsBuffer;
    address public immutable bproRewardsBuffer;
    address public immutable mocRewardsBuffer;
    IGovernedRegistry public immutable governedRegistry;
    IOracleManager public immutable oracleManager;
    address public immutable tasksRunner;
    bytes32 public immutable tasksRunnerCoinPair;
    MocRif public immutable rifBucket;
    bytes32 public immutable rifUsdCoinPair;
    address public immutable rifOracleCoinPair;
    address public immutable rifToRbtcPriceProvider;
    address public immutable rifToMocPriceProvider;
    address public immutable mocToRifPriceProvider;
    address public immutable swapRifFeesToMocForRifOracle;
    address public immutable swapDocFeesToMocForRifOracle;
    CommissionSplitterBase public immutable rifCommissionSplitterV2;
    CommissionSplitterBase public immutable rifCommissionSplitterV3;
    CommissionSplitterBase public immutable docCommissionSplitterV2;
    address public immutable splitRifFeesToFoundationAndRifOracle;
    address public immutable splitDocFeesToFoundationAndRifOracle;
    address public immutable splitMocFeesToFoundationAndRifOracle;
    address public immutable splitMocRewardsToBtcOracleAndTasksRunner;
    address public immutable splitPriceUpdateFeesToBtcOracleAndRifOracle;
    address public immutable btcUsdCoinPair;
    uint256 public immutable mocRewardsBufferBtcUsdOutputIndex;
    uint256[] private rifBucketExecutionCosts;
    uint256[] private docBucketExecutionCosts;

    /**
    @notice Constructor
    @param mocMultiCollateralGuard_ Address of the proxy mocMultiCollateralGuard
    @param mocMultiCollateralGuardImplementation_ New implementation for MocMultiCollateralGuard proxy
    @param mocCoreRifBucketImplementation_ New implementation for RIF bucket MocCore proxy
    @param mocCoreDocBucketImplementation_ New implementation for DOC bucket MocCore proxy
    @param mocQueueRifBucketImplementation_ New implementation for RIF bucket MocQueue proxy
    @param mocQueueDocBucketImplementation_ New implementation for DOC bucket MocQueue proxy
    @param mocCoreExpansionRifBucket_ New MocCoreExpansion for RIF bucket
    @param mocCoreExpansionDocBucket_ New MocCoreExpansion for DOC bucket
    @param revAuctionRBTCtoMOC_tasksRunner_ Address for coinbase execution fee recipient (TasksRunner)
    @param revAuctionRIFtoMOC_tasksRunner_ Address for RIF bucket rebalance execution fee recipient (TasksRunner)
    @param revAuctionDOCtoMOC_tasksRunner_ Address for DOC bucket rebalance execution fee recipient (TasksRunner)
    @param revAuctionRBTCtoMOC_rocNodes_ Address for price updates fee recipient (SplitPriceUpdateFeesToBtcOracleAndRifOracle)
    @param revAuctionRIFtoMOC_rocRewardsBuffer_ Address for RevAuction RIFtoMOC output recipient
    @param revAuctionMOCtoRIF_rifBucket_ Address of current RevAuction MOCtoRIF (registered in flow reverse auctions)
    @param revAuctionDOCtoMOC_rocRewardsBuffer_ Address for RevAuction DOCtoMOC output recipient
    @param revAuctionMOCtoDOC_docBucket_ Address of current RevAuction MOCtoDOC (registered in flow reverse auctions)
    @param revAuctionRBTCtoMOC_mocRewardsBuffer_ Address of current RevAuction RBTCtoMOC for MocRewardsBuffer
    @param revAuctionMOCtoRBTC_mocV1_ Address of current RevAuction MOCtoRBTC for mocV1
    @param rifProRewardsBuffer_rocRewardsBuffer_ Address for RifProRewardsBuffer output recipient
    @param rocrRewardsBuffer_ Address of RocrRewardsBuffer (registered in flow buffers)
    @param bitProRewardsBuffer_ Address of BitProRewardsBuffer (registered in flow buffers)
    @param bproRewardsBuffer_ Address of BproRewardsBuffer (registered in flow buffers)
    @param mocRewardsBuffer_ Address of MocRewardsBuffer (registered in flow buffers)
    @param governedRegistry_ Governed registry where old flow addresses are removed
    @param oracleManager_ OracleManager where coin pairs will be registered
    @param tasksRunner_ TasksRunner contract to register as coin pair address
    @param tasksRunnerCoinPair_ Coin pair identifier to register for TasksRunner
    @param rifBucket_ RIF bucket whose direct price provider is migrated to the new CoinPair
    @param rifUsdCoinPair_ Coin pair identifier used to register the direct RIF/USD CoinPair
    @param rifOracleCoinPair_ Newly deployed direct RIF/USD CoinPair contract created for the new oracle flow
    @param rifToRbtcPriceProvider_ Replacement RIF/BTC provider using the new direct RIF/USD CoinPair
    @param rifToMocPriceProvider_ Replacement RIF/MOC provider using the new direct RIF/USD CoinPair
    @param mocToRifPriceProvider_ Replacement MOC/RIF provider using the new direct RIF/USD CoinPair
    @param swapRifFeesToMocForRifOracle_ New RIF->MOC reverse auction created to route RIF fees into the new RIF/USD oracle
    @param swapDocFeesToMocForRifOracle_ New DOC->MOC reverse auction created to route DOC fees into the new RIF/USD oracle
    @param rifCommissionSplitterV2_ Live RIF commission splitter V2 whose Foundation branches are rewired in-place
    @param rifCommissionSplitterV3_ Live RIF commission splitter V3 whose Foundation branches are rewired in-place
    @param docCommissionSplitterV2_ Live DOC commission splitter V2 whose Foundation branches are rewired in-place
    @param splitRifFeesToFoundationAndRifOracle_ New RIF fee-routing buffer splitting 70% to Foundation and 30% to the new RIF/USD oracle
    @param splitDocFeesToFoundationAndRifOracle_ New DOC fee-routing buffer splitting 70% to Foundation and 30% to the new RIF/USD oracle
    @param splitMocFeesToFoundationAndRifOracle_ New MOC fee-routing buffer splitting 70% to Foundation and 30% to the new RIF/USD oracle
    @param splitMocRewardsToBtcOracleAndTasksRunner_ New child buffer splitting the BTC/USD oracle branch 90/10 between BTC/USD and TasksRunner
    @param splitPriceUpdateFeesToBtcOracleAndRifOracle_ New MOC buffer splitting queue price-update fees 50/50 between BTC/USD and RIF/USD
    @param btcUsdCoinPair_ Existing BTC/USD CoinPair currently used by the mocRewardsBuffer top-level oracle branch
    @param mocRewardsBufferBtcUsdOutputIndex_ Static output index of the BTC/USD branch on mocRewardsBuffer
    @param rifBucketExecutionCosts_ Updated queue execution-cost payload for the RIF bucket queue, including priceUpdatesCost
    @param docBucketExecutionCosts_ Updated queue execution-cost payload for the DOC bucket queue, including priceUpdatesCost
  */
    constructor(
        MocMultiCollateralGuard mocMultiCollateralGuard_,
        address mocMultiCollateralGuardImplementation_,
        address mocCoreRifBucketImplementation_,
        address mocCoreDocBucketImplementation_,
        address mocQueueRifBucketImplementation_,
        address mocQueueDocBucketImplementation_,
        address mocCoreExpansionRifBucket_,
        address mocCoreExpansionDocBucket_,
        address payable revAuctionRBTCtoMOC_tasksRunner_,
        address revAuctionRIFtoMOC_tasksRunner_,
        address revAuctionDOCtoMOC_tasksRunner_,
        address revAuctionRBTCtoMOC_rocNodes_,
        address revAuctionRIFtoMOC_rocRewardsBuffer_,
        address revAuctionMOCtoRIF_rifBucket_,
        address revAuctionDOCtoMOC_rocRewardsBuffer_,
        address revAuctionMOCtoDOC_docBucket_,
        address revAuctionRBTCtoMOC_mocRewardsBuffer_,
        address revAuctionMOCtoRBTC_mocV1_,
        address rifProRewardsBuffer_rocRewardsBuffer_,
        address rocrRewardsBuffer_,
        address bitProRewardsBuffer_,
        address bproRewardsBuffer_,
        address mocRewardsBuffer_,
        IGovernedRegistry governedRegistry_,
        IOracleManager oracleManager_,
        address tasksRunner_,
        bytes32 tasksRunnerCoinPair_,
        MocRif rifBucket_,
        bytes32 rifUsdCoinPair_,
        address rifOracleCoinPair_,
        address rifToRbtcPriceProvider_,
        address rifToMocPriceProvider_,
        address mocToRifPriceProvider_,
        address swapRifFeesToMocForRifOracle_,
        address swapDocFeesToMocForRifOracle_,
        CommissionSplitterBase rifCommissionSplitterV2_,
        CommissionSplitterBase rifCommissionSplitterV3_,
        CommissionSplitterBase docCommissionSplitterV2_,
        address splitRifFeesToFoundationAndRifOracle_,
        address splitDocFeesToFoundationAndRifOracle_,
        address splitMocFeesToFoundationAndRifOracle_,
        address splitMocRewardsToBtcOracleAndTasksRunner_,
        address splitPriceUpdateFeesToBtcOracleAndRifOracle_,
        address btcUsdCoinPair_,
        uint256 mocRewardsBufferBtcUsdOutputIndex_,
        uint256[] memory rifBucketExecutionCosts_,
        uint256[] memory docBucketExecutionCosts_
    ) {
        mocMultiCollateralGuard = mocMultiCollateralGuard_;
        mocMultiCollateralGuardImplementation = mocMultiCollateralGuardImplementation_;
        mocCoreRifBucketImplementation = mocCoreRifBucketImplementation_;
        mocCoreDocBucketImplementation = mocCoreDocBucketImplementation_;
        mocQueueRifBucketImplementation = mocQueueRifBucketImplementation_;
        mocQueueDocBucketImplementation = mocQueueDocBucketImplementation_;
        mocCoreExpansionRifBucket = mocCoreExpansionRifBucket_;
        mocCoreExpansionDocBucket = mocCoreExpansionDocBucket_;
        revAuctionRBTCtoMOC_tasksRunner = revAuctionRBTCtoMOC_tasksRunner_;
        revAuctionRIFtoMOC_tasksRunner = revAuctionRIFtoMOC_tasksRunner_;
        revAuctionDOCtoMOC_tasksRunner = revAuctionDOCtoMOC_tasksRunner_;
        revAuctionRBTCtoMOC_rocNodes = revAuctionRBTCtoMOC_rocNodes_;
        revAuctionRIFtoMOC_rocRewardsBuffer = revAuctionRIFtoMOC_rocRewardsBuffer_;
        revAuctionMOCtoRIF_rifBucket = revAuctionMOCtoRIF_rifBucket_;
        revAuctionDOCtoMOC_rocRewardsBuffer = revAuctionDOCtoMOC_rocRewardsBuffer_;
        revAuctionMOCtoDOC_docBucket = revAuctionMOCtoDOC_docBucket_;
        revAuctionRBTCtoMOC_mocRewardsBuffer = revAuctionRBTCtoMOC_mocRewardsBuffer_;
        revAuctionMOCtoRBTC_mocV1 = revAuctionMOCtoRBTC_mocV1_;
        rifProRewardsBuffer_rocRewardsBuffer = rifProRewardsBuffer_rocRewardsBuffer_;
        rocrRewardsBuffer = rocrRewardsBuffer_;
        bitProRewardsBuffer = bitProRewardsBuffer_;
        bproRewardsBuffer = bproRewardsBuffer_;
        mocRewardsBuffer = mocRewardsBuffer_;
        governedRegistry = governedRegistry_;
        oracleManager = oracleManager_;
        tasksRunner = tasksRunner_;
        tasksRunnerCoinPair = tasksRunnerCoinPair_;
        rifBucket = rifBucket_;
        rifUsdCoinPair = rifUsdCoinPair_;
        rifOracleCoinPair = rifOracleCoinPair_;
        rifToRbtcPriceProvider = rifToRbtcPriceProvider_;
        rifToMocPriceProvider = rifToMocPriceProvider_;
        mocToRifPriceProvider = mocToRifPriceProvider_;
        swapRifFeesToMocForRifOracle = swapRifFeesToMocForRifOracle_;
        swapDocFeesToMocForRifOracle = swapDocFeesToMocForRifOracle_;
        rifCommissionSplitterV2 = rifCommissionSplitterV2_;
        rifCommissionSplitterV3 = rifCommissionSplitterV3_;
        docCommissionSplitterV2 = docCommissionSplitterV2_;
        splitRifFeesToFoundationAndRifOracle = splitRifFeesToFoundationAndRifOracle_;
        splitDocFeesToFoundationAndRifOracle = splitDocFeesToFoundationAndRifOracle_;
        splitMocFeesToFoundationAndRifOracle = splitMocFeesToFoundationAndRifOracle_;
        splitMocRewardsToBtcOracleAndTasksRunner = splitMocRewardsToBtcOracleAndTasksRunner_;
        splitPriceUpdateFeesToBtcOracleAndRifOracle = splitPriceUpdateFeesToBtcOracleAndRifOracle_;
        btcUsdCoinPair = btcUsdCoinPair_;
        mocRewardsBufferBtcUsdOutputIndex = mocRewardsBufferBtcUsdOutputIndex_;
        rifBucketExecutionCosts = rifBucketExecutionCosts_;
        docBucketExecutionCosts = docBucketExecutionCosts_;
    }

    /**
    @notice Execute the changes.
    @dev Should be called by the governor, but this contract does not check that explicitly
    because it is not its responsibility in the current architecture.
   */
    function execute() external {
        MocOperations rifBucketOps = mocMultiCollateralGuard.buckets(0);
        MocOperations docBucketOps = mocMultiCollateralGuard.buckets(1);
        MocQueue rifQueue = MocQueue(rifBucketOps.mocQueue());
        MocQueue docQueue = MocQueue(docBucketOps.mocQueue());

        // 1) Upgrade buckets and queues
        rifBucketOps.upgradeTo(mocCoreRifBucketImplementation);
        docBucketOps.upgradeTo(mocCoreDocBucketImplementation);

        rifQueue.upgradeTo(mocQueueRifBucketImplementation);
        docQueue.upgradeTo(mocQueueDocBucketImplementation);

        // 2) Update queue execution costs, adding the shared price-updates fee
        _updateQueueExecutionCosts(rifQueue, rifBucketExecutionCosts);
        _updateQueueExecutionCosts(docQueue, docBucketExecutionCosts);

        // 3) Set MocCoreExpansion on buckets
        rifBucketOps.setMocCoreExpansion(mocCoreExpansionRifBucket);
        docBucketOps.setMocCoreExpansion(mocCoreExpansionDocBucket);

        // 4) Upgrade MocMultiCollateralGuard
        mocMultiCollateralGuard.upgradeTo(mocMultiCollateralGuardImplementation);

        // 5) Set coinbase execution fee recipient
        mocMultiCollateralGuard.setCoinbaseExecFeeRecipient(revAuctionRBTCtoMOC_tasksRunner);

        // 6) Set rebalance execution fee recipients for RIF and DOC buckets
        //    and wire the replacement RIF/BTC provider in the RIF bucket guard params
        mocMultiCollateralGuard.editBucket(
            rifBucketOps,
            _buildBucketParams(rifBucketOps, revAuctionRIFtoMOC_tasksRunner, IPriceProvider(rifToRbtcPriceProvider))
        );
        mocMultiCollateralGuard.editBucket(
            docBucketOps,
            _buildBucketParams(
                docBucketOps,
                revAuctionDOCtoMOC_tasksRunner,
                mocMultiCollateralGuard.acCoinbasePriceProvider(docBucketOps)
            )
        );

        // 7) Set price updates fee recipient
        IMocMultiCollateralGuardPriceUpdates(address(mocMultiCollateralGuard)).setPriceUpdatesFeeRecipient(
            revAuctionRBTCtoMOC_rocNodes
        );

        // 8) Replace the RIF bucket direct price provider with the new RIF/USD CoinPair
        //    and register the new RIF/USD coin pair in OracleManager
        _migrateRifUsdCoinPair();

        // 9) Register TasksRunner as CoinPair in OracleManager
        oracleManager.registerCoinPair(tasksRunnerCoinPair, tasksRunner);

        // 10) Set newly deployed reverse auctions output to TasksRunner
        IReverseAuction(revAuctionRBTCtoMOC_tasksRunner).setOutputAccount(tasksRunner);
        IReverseAuction(revAuctionRIFtoMOC_tasksRunner).setOutputAccount(tasksRunner);
        IReverseAuction(revAuctionDOCtoMOC_tasksRunner).setOutputAccount(tasksRunner);

        // 11) Rewire commission splitters and buffers that fund Foundation / oracle infra
        _rewireOracleFundingFlows();

        // 12) Rewire legacy RIF-based reverse auctions to the replacement providers
        IReverseAuction(revAuctionRIFtoMOC_rocRewardsBuffer).setPriceProvider(rifToMocPriceProvider);
        IReverseAuction(revAuctionMOCtoRIF_rifBucket).setPriceProvider(mocToRifPriceProvider);
        IReverseAuction(swapRifFeesToMocForRifOracle).setPriceProvider(rifToMocPriceProvider);

        // 13) Remove reverse auctions and buffers from governed registry
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionRIFtoMOC_rocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, rifProRewardsBuffer_rocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionMOCtoRIF_rifBucket);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionDOCtoMOC_rocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionMOCtoDOC_docBucket);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionRBTCtoMOC_mocRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_REVERSE_AUCTIONS, revAuctionMOCtoRBTC_mocV1);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, rocrRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, bitProRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, bproRewardsBuffer);
        governedRegistry.removeAddressArrayElement(MOC_FLOW_BUFFERS, mocRewardsBuffer);
    }

    /**
     * @notice Redirects the Foundation commission-splitter branches and the BTC/USD oracle branch.
     */
    function _rewireOracleFundingFlows() internal {
        // RIF splitters:
        // - RIF legs that used to pay Foundation now pay the new RIF 70/30 buffer
        // - MOC fee-token leg on rifCommissionSplitterV2 now pays the new MOC 70/30 buffer
        rifCommissionSplitterV3.setAcTokenAddressRecipient2(splitRifFeesToFoundationAndRifOracle);
        rifCommissionSplitterV2.setAcTokenAddressRecipient1(splitRifFeesToFoundationAndRifOracle);
        rifCommissionSplitterV2.setFeeTokenAddressRecipient1(splitMocFeesToFoundationAndRifOracle);

        // DOC splitter:
        // - DOC leg that used to pay Foundation now pays the new DOC 70/30 buffer
        // - MOC fee-token leg that used to pay Foundation now pays the new MOC 70/30 buffer
        docCommissionSplitterV2.setAcTokenAddressRecipient1(splitDocFeesToFoundationAndRifOracle);
        docCommissionSplitterV2.setFeeTokenAddressRecipient1(splitMocFeesToFoundationAndRifOracle);

        // The top-level MOC rewards buffer keeps Supporters untouched and routes its BTC/USD
        // branch to a new child buffer that splits 90/10 between BTC/USD and TasksRunner.
        _replaceBufferOutputAtIndex(
            mocRewardsBuffer,
            mocRewardsBufferBtcUsdOutputIndex,
            btcUsdCoinPair,
            splitMocRewardsToBtcOracleAndTasksRunner
        );
    }

    /**
     * @notice Applies the post-upgrade queue execution-cost configuration.
     */
    function _updateQueueExecutionCosts(MocQueue queue_, uint256[] storage rawExecutionCosts_) internal {
        queue_.updateExecutionCosts(_buildQueueExecutionCosts(rawExecutionCosts_));
    }

    /**
     * @notice Rebuilds the queue execution-cost struct from the constructor-provided values.
     */
    function _buildQueueExecutionCosts(
        uint256[] storage rawExecutionCosts_
    ) internal view returns (MocQueueExecFees.InitializeMocQueueExecCostsParams memory execCosts) {
        require(rawExecutionCosts_.length == 10, "queue execution costs length");
        execCosts = MocQueueExecFees.InitializeMocQueueExecCostsParams({
            tcMintExecCost: rawExecutionCosts_[0],
            tcRedeemExecCost: rawExecutionCosts_[1],
            tpMintExecCost: rawExecutionCosts_[2],
            tpRedeemExecCost: rawExecutionCosts_[3],
            swapTPforTPExecCost: rawExecutionCosts_[4],
            swapTPforTCExecCost: rawExecutionCosts_[5],
            swapTCforTPExecCost: rawExecutionCosts_[6],
            redeemTCandTPExecCost: rawExecutionCosts_[7],
            mintTCandTPExecCost: rawExecutionCosts_[8],
            priceUpdatesCost: rawExecutionCosts_[9]
        });
    }

    /**
     * @notice OracleManager delegatecall hook used to unregister an already-registered coin pair.
     * @dev The function name is fixed by Governed.delegateCallToChanger, which performs
     *      abi.encodeWithSignature("impersonate(bytes)", data). This runs in OracleManager
     *      storage through delegatecall, so it must only succeed when address(this) is OracleManager.
     */
    function impersonate(bytes calldata data) external {
        require(address(this) == address(oracleManager), "oracleManager only");
        _handleOracleManagerUnregisterHook(data);
    }

    /**
     * @notice Decodes the OracleManager unregister payload and removes the current coin pair registration.
     */
    function _handleOracleManagerUnregisterHook(bytes calldata data) internal {
        (bytes32 coinPair, uint256 hint) = abi.decode(data, (bytes32, uint256));
        _unregisterCoinPair(coinPair, hint);
    }

    /**
     * @notice Replaces the registered RIF/USD coin pair and edits the RIF bucket to consume it directly.
     */
    function _migrateRifUsdCoinPair() internal {
        address currentCoinPair = oracleManager.getContractAddress(rifUsdCoinPair);
        if (currentCoinPair != address(0)) {
            oracleManager.delegateCallToChanger(abi.encode(rifUsdCoinPair, uint256(0)));
        }

        oracleManager.registerCoinPair(rifUsdCoinPair, rifOracleCoinPair);
        _ensureRifOracleWhitelist(rifOracleCoinPair);
        _editRifBucketPriceProvider(rifOracleCoinPair);
    }

    /**
     * @notice Ensures the new direct RIF/USD coin pair explicitly whitelists every direct consumer.
     */
    function _ensureRifOracleWhitelist(address coinPair_) internal {
        ICoinPairPriceGovernance coinPair = ICoinPairPriceGovernance(coinPair_);
        address infoAddr = governedRegistry.getAddress(INFO_ADDR);

        if (!coinPair.isPricePeekWhitelisted(address(rifBucket))) {
            coinPair.addPricePeekWhitelist(address(rifBucket));
        }
        if (!coinPair.isPricePeekWhitelisted(rifToRbtcPriceProvider)) {
            coinPair.addPricePeekWhitelist(rifToRbtcPriceProvider);
        }
        if (!coinPair.isPricePeekWhitelisted(mocToRifPriceProvider)) {
            coinPair.addPricePeekWhitelist(mocToRifPriceProvider);
        }
        if (infoAddr != address(0) && !coinPair.isPricePeekWhitelisted(infoAddr)) {
            coinPair.addPricePeekWhitelist(infoAddr);
        }
    }

    /**
     * @notice Only edits the RIF bucket price provider; all other Pegged Token params are read from live state.
     */
    function _editRifBucketPriceProvider(address priceProvider_) internal {
        MocRC20 usdRifAddress = MocRC20(address(rifBucket.tpTokens(0)));
        (, uint256 emaSf) = rifBucket.tpEma(0);

        PeggedTokenParams memory peggedTokenParams = PeggedTokenParams({
            priceProviderAddress: priceProvider_,
            tpCtarg: rifBucket.tpCtarg(0),
            tpMintFee: rifBucket.tpMintFees(address(usdRifAddress)),
            tpRedeemFee: rifBucket.tpRedeemFees(address(usdRifAddress)),
            tpEma: 0,
            tpEmaSf: emaSf
        });

        rifBucket.editPeggedToken(usdRifAddress, peggedTokenParams);
    }

    /**
     * @notice Rebuilds current bucket params preserving every value except the fields changed by this rollout.
     */
    function _buildBucketParams(
        MocOperations bucket_,
        address rebalanceExecFeeRecipient_,
        IPriceProvider acCoinbasePriceProvider_
    ) internal view returns (BucketParams memory) {
        return
            BucketParams({
                acCoinbasePriceProvider: acCoinbasePriceProvider_,
                rebalanceExecFeeRecipient: rebalanceExecFeeRecipient_,
                rtcThrld: mocMultiCollateralGuard.rtcThrld(bucket_),
                microLiquidationThrld: mocMultiCollateralGuard.microLiquidationThrld(bucket_),
                penaltyRate: mocMultiCollateralGuard.penaltyRate(bucket_)
            });
    }
    /**
     * @notice Replaces a known buffer output while preserving the configured split and threshold.
     */
    function _replaceBufferOutputAtIndex(
        address buffer_,
        uint256 outputIndex_,
        address currentOutput_,
        address nextOutput_
    ) internal {
        IBufferLike buffer = IBufferLike(buffer_);
        (address output, uint256 split, , uint256 threshold) = buffer.getOutput(outputIndex_);
        require(output == currentOutput_, "unexpected buffer output");
        buffer.removeOutput(outputIndex_);
        buffer.addOutput(payable(nextOutput_), split, threshold);
    }

    /**
     * @notice Mirrors OracleManagerPairChangeRemove/Update unregister logic inside this changer.
     * @dev Storage slots are derived from the legacy OracleManager layout because unregistering is only
     * available through delegateCallToChanger on the governed OracleManager itself.
     */
    function _unregisterCoinPair(bytes32 coinPair, uint256 hint) internal {
        bytes32 mappingSlot = keccak256(abi.encode(coinPair, ORACLE_MANAGER_COIN_PAIR_MAP_SLOT));
        address currentAddress;
        assembly {
            currentAddress := sload(mappingSlot)
        }
        require(currentAddress != address(0), "Pair is already unregistered");

        uint256 coinPairCount;
        assembly {
            coinPairCount := sload(ORACLE_MANAGER_COIN_PAIR_LIST_SLOT)
        }
        require(hint < coinPairCount, "Illegal index");

        uint256 idx = coinPairCount;
        bytes32 arrayBaseSlot = keccak256(abi.encode(ORACLE_MANAGER_COIN_PAIR_LIST_SLOT));
        for (uint256 i = hint; i < coinPairCount; i++) {
            bytes32 item;
            assembly {
                item := sload(add(arrayBaseSlot, i))
            }
            if (item == coinPair) {
                idx = i;
                break;
            }
        }
        require(idx < coinPairCount, "Coin pair not found");

        assembly {
            sstore(mappingSlot, 0)
        }

        if (idx != coinPairCount - 1) {
            bytes32 lastItem;
            assembly {
                lastItem := sload(add(arrayBaseSlot, sub(coinPairCount, 1)))
                sstore(add(arrayBaseSlot, idx), lastItem)
            }
        }

        assembly {
            sstore(add(arrayBaseSlot, sub(coinPairCount, 1)), 0)
            sstore(ORACLE_MANAGER_COIN_PAIR_LIST_SLOT, sub(coinPairCount, 1))
        }
    }
}
