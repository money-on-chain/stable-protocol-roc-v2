// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { BaseFork } from "./helpers/BaseFork.sol";
import { IMocV2 } from "moc-main-latest/contracts/interfaces/IMocV2.sol";
import { MocRC20 } from "moc-main-latest/contracts/tokens/MocRC20.sol";
import { Vm } from "forge-std/Vm.sol";
import { IOracleCheats } from "../../helpers/OracleTestHelper.sol";

interface IReverseAuctionView {
    function outputAccount() external view returns (address);
    function priceProvider() external view returns (address);
}

interface IPriceProviderDivView {
    function _priceProvider() external view returns (address);
    function _priceProviderDivisor() external view returns (address);
    function peek() external view returns (bytes32, bool);
}

interface IPriceProviderInverseView {
    function _priceProvider() external view returns (address);
    function peek() external view returns (bytes32, bool);
}

interface ICoinPairPriceView {
    function peek() external view returns (bytes32, bool);
    function isPricePeekWhitelisted(address _account) external view returns (bool);
}

interface ITasksRunnerView {
    function getTaskCount() external view returns (uint256);
    function containsTask(address _task) external view returns (bool);
    function getLastPublicationBlock() external view returns (uint256);
    function getTasksAvailableAsFlags() external view returns (uint256);
    function getName() external view returns (bytes32);
    function getRoundInfo()
        external
        view
        returns (
            uint256 round,
            uint256 startBlock,
            uint256 lockPeriodTimestamp,
            uint256 totalPoints,
            address[] memory selectedOwners,
            address[] memory selectedOracles
        );
    function getOracleRoundInfo(
        address oracleOwner
    ) external view returns (uint256 points, bool selectedInCurrentRound);
    function switchRound() external;
    function runTasks(
        uint256 _version,
        bytes32 _name,
        uint256 _tasksFlags,
        address _votedOracle,
        uint256 _blockNumber,
        uint8[] calldata _sigV,
        bytes32[] calldata _sigR,
        bytes32[] calldata _sigS
    ) external;
}

interface IBufferTokenView {
    function getOutput(uint256 idx) external view returns (address, uint256, uint256, uint256);
}

interface IGovernedRegistryView {
    function addressArrayContains(bytes32 _key, address value) external view returns (bool);
    function getAddress(bytes32 _key) external view returns (address);
}

interface IOracleManagerView {
    function getStakingContract() external view returns (address);
    function getContractAddress(bytes32 coinPair) external view returns (address);
    function getOracleAddress(address oracleOwnerAddr) external view returns (address oracleAddr);
}

interface ICoinPairPriceFull {
    function getCoinPair() external view returns (bytes32);
    function getPriceInfo() external view returns (uint256 price, bool isValid, uint256 lastPubBlock);
    function getRoundInfo()
        external
        view
        returns (
            uint256 round,
            uint256 startBlock,
            uint256 lockPeriodTimestamp,
            uint256 totalPoints,
            address[] memory selectedOwners,
            address[] memory selectedOracles
        );
    function getLastPublicationBlock() external view returns (uint256);
    function switchRound() external;
    function publishPrice(
        uint256 version,
        bytes32 coinpair,
        uint256 price,
        address votedOracle,
        uint256 blockNumber,
        uint8[] calldata sigV,
        bytes32[] calldata sigR,
        bytes32[] calldata sigS
    ) external;
}

interface IStakingFull {
    function setOracleAddress(address oracleAddr) external;
    function subscribeToCoinPair(bytes32 coinPair) external;
    function isSubscribed(address ownerAddr, bytes32 coinPair) external view returns (bool);
}

interface IQueueExecFeesView {
    function priceUpdatesCost() external view returns (uint256);
    function getExecFee(uint8 opType) external view returns (uint256);
}

interface IStakingOracleOps {
    function setOracleAddress(address oracleAddr) external;
    function subscribeToCoinPair(bytes32 coinPair) external;
    function isSubscribed(address ownerAddr, bytes32 coinPair) external view returns (bool);
}

interface ICommissionSplitterView {
    function acTokenAddressRecipient1() external view returns (address);
    function acTokenAddressRecipient2() external view returns (address);
    function feeTokenAddressRecipient1() external view returns (address);
    function feeTokenAddressRecipient2() external view returns (address);
    function acTokenPctToRecipient1() external view returns (uint256);
    function feeTokenPctToRecipient1() external view returns (uint256);
}

contract AddTasksRunnerChangerForkTests is BaseFork {
    string private constant TASKS_DEPLOYED_ADDRESSES_PATH =
        "test/changers/addTasksRunner/fixtures/deployed-addresses.json";
    bytes32 private constant MOC_FLOW_BUFFERS = 0x4cb845794d5472a713e41e8e4ddc566dab8d695f1dc6c8edd43dad9d55112a22;
    bytes32 private constant MOC_FLOW_REVERSE_AUCTIONS =
        0x0428ec087e0cce276a71d1caf1afe4da32a2d48b3ebe579040612b5bd262ff73;
    bytes32 private constant RIF_USD = 0x5249465553440000000000000000000000000000000000000000000000000000;
    bytes32 private constant INFO_ADDR = 0xda9f12e01fc92de345bb741448d36ecb967052dd7aa1670439af833c9a3d78f1;

    address private mocRewardsBuffer;
    address private supporters;
    address private btcUsdCoinPair;
    address private foundation;
    address private rifCommissionSplitterV2;
    address private rifCommissionSplitterV3;
    address private docCommissionSplitterV2;
    address private oracleOwner1;
    address private oracleOwner2;
    address private oracleOwner3;
    uint256 private rifBucketTp0Price;

    function setUp() public override {
        super.setUp();
        mocRewardsBuffer = _getNetworkAddress("mocRewardsBuffer");
        supporters = _getNetworkAddress("supporters");
        btcUsdCoinPair = _getNetworkAddress("btcUsdCoinPair");
        foundation = _getNetworkAddress("foundation");
        rifCommissionSplitterV2 = _getNetworkAddress("rifCommissionSplitterV2");
        rifCommissionSplitterV3 = _getNetworkAddress("rifCommissionSplitterV3");
        docCommissionSplitterV2 = _getNetworkAddress("docCommissionSplitterV2");
        oracleOwner1 = _getNetworkAddress("oracleOwner1");
        oracleOwner2 = _getNetworkAddress("oracleOwner2");
        oracleOwner3 = _getNetworkAddress("oracleOwner3");

        (, address rifBucketTp0PriceProvider) = IMocV2(address(rifBucket)).pegContainer(0);
        (bytes32 price, bool isValid) = ICoinPairPriceView(rifBucketTp0PriceProvider).peek();
        require(isValid, "RIF bucket TP0 price is not valid");
        rifBucketTp0Price = uint256(price);

        // PreTasksRunnerChanger must execute before AddTasksRunnerChanger so the
        // TasksRunner proxy is registered in the OracleManager and the oracle
        // infrastructure is ready for the add-tasks wiring.
        _executePreTasksRunnerChanger();
    }

    function test_ExecuteAddTasksRunnerChanger() public {
        _executeAddTasksRunnerChanger();

        string memory json = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
        address swapRifFeesToMocForRifOracle = vm.parseJsonAddress(json, ".SwapRifFeesToMocForRifOracle");
        address swapDocFeesToMocForRifOracle = vm.parseJsonAddress(json, ".SwapDocFeesToMocForRifOracle");

        assertEq(
            mocMultiCollateralGuard.coinbaseExecFeeRecipient(),
            addTasksRunnerChanger.revAuctionRBTCtoMOC_tasksRunner(),
            "coinbase exec fee recipient should be set by AddTasksRunnerChanger"
        );

        assertEq(
            mocMultiCollateralGuard.priceUpdatesFeeRecipient(),
            addTasksRunnerChanger.revAuctionRBTCtoMOC_rocNodes(),
            "price updates fee recipient should be set by AddTasksRunnerChanger"
        );

        assertEq(
            mocMultiCollateralGuard.rebalanceExecFeeRecipient(mocMultiCollateralGuard.buckets(0)),
            addTasksRunnerChanger.revAuctionRIFtoMOC_tasksRunner(),
            "RIF bucket rebalance recipient should be set by AddTasksRunnerChanger"
        );

        assertEq(
            mocMultiCollateralGuard.rebalanceExecFeeRecipient(mocMultiCollateralGuard.buckets(1)),
            addTasksRunnerChanger.revAuctionDOCtoMOC_tasksRunner(),
            "DOC bucket rebalance recipient should be set by AddTasksRunnerChanger"
        );

        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionRBTCtoMOC_tasksRunner()).outputAccount(),
            addTasksRunnerChanger.tasksRunner(),
            "RBTC->MOC tasks-runner auction output should point to tasksRunner"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionRIFtoMOC_tasksRunner()).outputAccount(),
            addTasksRunnerChanger.tasksRunner(),
            "RIF->MOC tasks-runner auction output should point to tasksRunner"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionDOCtoMOC_tasksRunner()).outputAccount(),
            addTasksRunnerChanger.tasksRunner(),
            "DOC->MOC tasks-runner auction output should point to tasksRunner"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionRBTCtoMOC_rocNodes()).outputAccount(),
            addTasksRunnerChanger.splitPriceUpdateFeesToBtcOracleAndRifOracle(),
            "RBTC->MOC queue-fee auction output should point to the shared queue price-updates buffer"
        );
        assertEq(
            IReverseAuctionView(swapRifFeesToMocForRifOracle).outputAccount(),
            addTasksRunnerChanger.rifOracleCoinPair(),
            "RIF->MOC fee-routing auction output should point to the RIF/USD coin pair"
        );
        assertEq(
            IReverseAuctionView(swapDocFeesToMocForRifOracle).outputAccount(),
            addTasksRunnerChanger.rifOracleCoinPair(),
            "DOC->MOC fee-routing auction output should point to the RIF/USD coin pair"
        );
        assertEq(
            IQueueExecFeesView(address(rifQueue)).priceUpdatesCost(),
            255000,
            "RIF queue priceUpdatesCost should be set to fund two oracle prices"
        );
        assertEq(
            IQueueExecFeesView(address(docBucket.mocQueue())).priceUpdatesCost(),
            255000,
            "DOC queue priceUpdatesCost should be set to fund two oracle prices"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionRIFtoMOC_rocRewardsBuffer()).outputAccount(),
            mocRewardsBuffer,
            "RIF->MOC legacy auction output should point to mocRewardsBuffer"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionDOCtoMOC_rocRewardsBuffer()).outputAccount(),
            mocRewardsBuffer,
            "DOC->MOC legacy auction output should point to mocRewardsBuffer"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionMOCtoRIF_rifBucket()).outputAccount(),
            address(rifBucket),
            "MOC->RIF legacy auction output should point to rifBucket"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionMOCtoDOC_docBucket()).outputAccount(),
            address(docBucket),
            "MOC->DOC legacy auction output should point to docBucket"
        );
    }

    function test_RifUsdMigration() public {
        (, address currentBucketPriceProvider) = IMocV2(address(rifBucket)).pegContainer(0);
        address currentAcCoinbasePriceProvider = address(mocMultiCollateralGuard.acCoinbasePriceProvider(rifBucket));

        _executeAddTasksRunnerChanger();

        (, address migratedBucketPriceProvider) = IMocV2(address(rifBucket)).pegContainer(0);
        address migratedAcCoinbasePriceProvider = address(mocMultiCollateralGuard.acCoinbasePriceProvider(rifBucket));

        assertEq(currentBucketPriceProvider, _getNetworkAddress("rifUsdLegacyPriceProvider"));
        assertEq(currentAcCoinbasePriceProvider, _getNetworkAddress("rifToRbtcPriceProvider"));
        assertEq(migratedBucketPriceProvider, addTasksRunnerChanger.rifOracleCoinPair());
        assertEq(migratedAcCoinbasePriceProvider, addTasksRunnerChanger.rifToRbtcPriceProvider());

        assertEq(
            IPriceProviderDivView(addTasksRunnerChanger.rifToRbtcPriceProvider())._priceProvider(),
            addTasksRunnerChanger.rifOracleCoinPair(),
            "RIF/BTC replacement should read from the new direct RIF/USD pair"
        );
        assertEq(
            IPriceProviderDivView(addTasksRunnerChanger.mocToRifPriceProvider())._priceProviderDivisor(),
            addTasksRunnerChanger.rifOracleCoinPair(),
            "MOC/RIF replacement should divide by the new direct RIF/USD pair"
        );
        assertEq(
            IPriceProviderInverseView(addTasksRunnerChanger.rifToMocPriceProvider())._priceProvider(),
            addTasksRunnerChanger.mocToRifPriceProvider(),
            "RIF/MOC replacement should invert the new MOC/RIF provider"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionRIFtoMOC_rocRewardsBuffer()).priceProvider(),
            addTasksRunnerChanger.rifToMocPriceProvider(),
            "legacy RIF->MOC auction should be rewired to the replacement provider"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionMOCtoRIF_rifBucket()).priceProvider(),
            addTasksRunnerChanger.mocToRifPriceProvider(),
            "legacy MOC->RIF auction should be rewired to the replacement provider"
        );
        string memory json = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
        address swapRifFeesToMocForRifOracle = vm.parseJsonAddress(json, ".SwapRifFeesToMocForRifOracle");
        assertEq(
            IReverseAuctionView(swapRifFeesToMocForRifOracle).priceProvider(),
            addTasksRunnerChanger.rifToMocPriceProvider(),
            "new RIF->MOC fee-routing auction should use the replacement RIF/MOC provider"
        );

        ICoinPairPriceView rifOracleCoinPair = ICoinPairPriceView(addTasksRunnerChanger.rifOracleCoinPair());
        address infoAddr = IGovernedRegistryView(address(addTasksRunnerChanger.governedRegistry())).getAddress(
            INFO_ADDR
        );
        {
            string memory tasksJson = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
            address taskExecuteQueueV3 = vm.parseJsonAddress(tasksJson, ".TaskExecuteQueueV3");
            address taskUpdateEmaV3RifBucket = vm.parseJsonAddress(tasksJson, ".TaskUpdateEmaV3RifBucket");
            assertTrue(
                rifOracleCoinPair.isPricePeekWhitelisted(taskExecuteQueueV3),
                "TaskExecuteQueueV3 should be whitelisted on the new direct RIF/USD pair"
            );
            assertTrue(
                rifOracleCoinPair.isPricePeekWhitelisted(taskUpdateEmaV3RifBucket),
                "TaskUpdateEmaV3RifBucket should be whitelisted on the new direct RIF/USD pair"
            );
        }
        assertTrue(
            rifOracleCoinPair.isPricePeekWhitelisted(address(rifBucket)),
            "RIF bucket should remain whitelisted on the new direct RIF/USD pair"
        );
        assertTrue(
            rifOracleCoinPair.isPricePeekWhitelisted(addTasksRunnerChanger.rifToRbtcPriceProvider()),
            "replacement RIF/BTC provider should be whitelisted on the new direct RIF/USD pair"
        );
        assertTrue(
            rifOracleCoinPair.isPricePeekWhitelisted(addTasksRunnerChanger.mocToRifPriceProvider()),
            "replacement MOC/RIF provider should be whitelisted on the new direct RIF/USD pair"
        );
        assertTrue(
            rifOracleCoinPair.isPricePeekWhitelisted(infoAddr),
            "INFO_ADDR consumer should be whitelisted on the new direct RIF/USD pair"
        );

        // Publish a real price on the new RIF/USD coin pair so it becomes valid.
        _publishPriceOnRifOracle();

        vm.prank(address(rifBucket));
        (bytes32 directPrice, bool directValid) = rifOracleCoinPair.peek();
        assertGt(uint256(directPrice), 0, "new direct RIF/USD pair should return a price to the bucket");
        assertTrue(directValid, "new direct RIF/USD pair should be valid for the bucket");

        (bytes32 rifToBtcPrice, ) = IPriceProviderDivView(addTasksRunnerChanger.rifToRbtcPriceProvider()).peek();
        assertGt(uint256(rifToBtcPrice), 0, "replacement RIF/BTC provider should remain readable");

        (bytes32 rifToMocPrice, ) = IPriceProviderInverseView(addTasksRunnerChanger.rifToMocPriceProvider()).peek();
        assertGt(uint256(rifToMocPrice), 0, "replacement RIF/MOC provider should remain readable");
    }

    function test_CommissionSplittersAreRewired() public {
        _executeAddTasksRunnerChanger();

        ICommissionSplitterView rifSplitterV2 = ICommissionSplitterView(rifCommissionSplitterV2);
        ICommissionSplitterView rifSplitterV3 = ICommissionSplitterView(rifCommissionSplitterV3);
        ICommissionSplitterView docSplitterV2 = ICommissionSplitterView(docCommissionSplitterV2);

        assertEq(
            rifSplitterV3.acTokenAddressRecipient1(),
            addTasksRunnerChanger.splitRifFeesToFoundationAndRifOracle(),
            "rifCommissionSplitterV3 Foundation RIF leg should be rewired to the new RIF buffer"
        );
        assertEq(rifSplitterV3.acTokenPctToRecipient1(), 0.5e18, "rifCommissionSplitterV3 RIF split should stay 50/50");

        assertEq(
            rifSplitterV2.acTokenAddressRecipient1(),
            addTasksRunnerChanger.splitRifFeesToFoundationAndRifOracle(),
            "rifCommissionSplitterV2 Foundation RIF leg should be rewired to the new RIF buffer"
        );
        assertEq(
            rifSplitterV2.feeTokenAddressRecipient1(),
            addTasksRunnerChanger.splitMocFeesToFoundationAndRifOracle(),
            "rifCommissionSplitterV2 Foundation MOC leg should be rewired to the new MOC buffer"
        );
        assertEq(
            rifSplitterV2.acTokenPctToRecipient1(),
            666666666666666666,
            "rifCommissionSplitterV2 RIF split pct should be preserved"
        );
        assertEq(
            rifSplitterV2.feeTokenPctToRecipient1(),
            0.5e18,
            "rifCommissionSplitterV2 MOC split should stay 50/50"
        );

        assertEq(
            docSplitterV2.acTokenAddressRecipient1(),
            addTasksRunnerChanger.splitDocFeesToFoundationAndRifOracle(),
            "docCommissionSplitterV2 Foundation DOC leg should be rewired to the new DOC buffer"
        );
        assertEq(
            docSplitterV2.feeTokenAddressRecipient1(),
            addTasksRunnerChanger.splitMocFeesToFoundationAndRifOracle(),
            "docCommissionSplitterV2 Foundation MOC leg should be rewired to the new MOC buffer"
        );
        assertEq(
            docSplitterV2.acTokenPctToRecipient1(),
            666666666666666666,
            "docCommissionSplitterV2 DOC split pct should be preserved"
        );
        assertEq(
            docSplitterV2.feeTokenPctToRecipient1(),
            0.5e18,
            "docCommissionSplitterV2 MOC split should stay 50/50"
        );
    }

    function test_TasksRunnerContainsAllExpectedTasks() public {
        _executeAddTasksRunnerChanger();

        string memory json = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
        string[57] memory taskKeys = [
            "TaskUpdateEmaV1",
            "TaskEvalLiquidationV1",
            "TaskInterestPaymentV1",
            "TaskSettlementV1",
            "TaskMintStep",
            "TaskSwitchRoundCoinPair",
            "TaskSwitchRoundRifUsdCoinPair",
            "TaskSwitchRoundTasksRunnerCoinPair",
            "TaskDistributeSupporters",
            "TaskExecuteQueueV3",
            "TaskUpdateEmaV3RifBucket",
            "TaskUpdateEmaV3DocBucket",
            "TaskExecuteLiquidationV3RifBucket",
            "TaskExecuteLiquidationV3DocBucket",
            "TaskExecuteMicroLiquidationV3RifBucket",
            "TaskExecuteMicroLiquidationV3DocBucket",
            "TaskInterestPaymentV3RifBucket",
            "TaskInterestPaymentV3DocBucket",
            "TaskRefreshACBalanceV3RifBucket",
            "TaskRefreshACBalanceV3DocBucket",
            "TaskSplitRifCommissionSplitterV2",
            "TaskSplitRifCommissionSplitterV3",
            "TaskSplitDocCommissionSplitterV2",
            "TaskSplitMocCommissionSplitterV2",
            "TaskSplitMocCommissionSplitterV3",
            "TaskTriggerOrderRevAuctionRBTCtoMOC_tasksRunner",
            "TaskTriggerOrderRevAuctionRIFtoMOC_tasksRunner",
            "TaskTriggerOrderRevAuctionDOCtoMOC_tasksRunner",
            "TaskTriggerOrderRevAuctionRBTCtoMOC_rocNodes",
            "TaskTriggerOrderSwapRifFeesToMocForRifOracle",
            "TaskTriggerOrderSwapDocFeesToMocForRifOracle",
            "TaskTriggerOrderRevAuctionRIFtoMOC_rocRewardsBuffer",
            "TaskTriggerOrderRevAuctionMOCtoRIF_rifBucket",
            "TaskTriggerOrderRevAuctionDOCtoMOC_rocRewardsBuffer",
            "TaskTriggerOrderRevAuctionMOCtoDOC_docBucket",
            "TaskTriggerOrderRevAuctionRBTCtoMOC_mocRewardsBuffer",
            "TaskTriggerOrderRevAuctionMOCtoRBTC_mocV1",
            "TaskFlushRifProRewardsBuffer",
            "TaskLiquidateRifProRewardsBuffer",
            "TaskFlushRocrRewardsBuffer",
            "TaskLiquidateRocrRewardsBuffer",
            "TaskFlushBitProRewardsBuffer",
            "TaskLiquidateBitProRewardsBuffer",
            "TaskFlushBproRewardsBuffer",
            "TaskLiquidateBproRewardsBuffer",
            "TaskFlushMocRewardsBuffer",
            "TaskLiquidateMocRewardsBuffer",
            "TaskFlushSplitRifFeesToFoundationAndRifOracle",
            "TaskLiquidateSplitRifFeesToFoundationAndRifOracle",
            "TaskFlushSplitDocFeesToFoundationAndRifOracle",
            "TaskLiquidateSplitDocFeesToFoundationAndRifOracle",
            "TaskFlushSplitMocFeesToFoundationAndRifOracle",
            "TaskLiquidateSplitMocFeesToFoundationAndRifOracle",
            "TaskFlushSplitMocRewardsToBtcOracleAndTasksRunner",
            "TaskLiquidateSplitMocRewardsToBtcOracleAndTasksRunner",
            "TaskFlushSplitPriceUpdateFeesToBtcOracleAndRifOracle",
            "TaskLiquidateSplitPriceUpdateFeesToBtcOracleAndRifOracle"
        ];

        ITasksRunnerView tasksRunner = ITasksRunnerView(addTasksRunnerChanger.tasksRunner());
        assertEq(tasksRunner.getTaskCount(), taskKeys.length, "unexpected tasks runner task count");

        for (uint256 i = 0; i < taskKeys.length; i++) {
            string memory selector = string.concat(".", taskKeys[i]);
            address taskAddress = vm.parseJsonAddress(json, selector);
            assertTrue(tasksRunner.containsTask(taskAddress), string.concat("task not found: ", taskKeys[i]));
        }
    }

    function test_BuffersOutputsAreSet() public {
        _executeAddTasksRunnerChanger();

        string memory json = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
        address swapRifFeesToMocForRifOracle = vm.parseJsonAddress(json, ".SwapRifFeesToMocForRifOracle");
        address swapDocFeesToMocForRifOracle = vm.parseJsonAddress(json, ".SwapDocFeesToMocForRifOracle");

        IBufferTokenView rocrBuffer = IBufferTokenView(addTasksRunnerChanger.rocrRewardsBuffer());
        (address rocrOutput0, , , ) = rocrBuffer.getOutput(0);
        assertEq(rocrOutput0, mocRewardsBuffer, "RocrRewardsBuffer output 0 should be mocRewardsBuffer");
        (address rocrOutput1, , , ) = rocrBuffer.getOutput(1);
        assertEq(
            rocrOutput1,
            addTasksRunnerChanger.revAuctionMOCtoDOC_docBucket(),
            "RocrRewardsBuffer output 1 should be revAuctionMOCtoDOC_docBucket"
        );

        IBufferTokenView rifProBuffer = IBufferTokenView(addTasksRunnerChanger.rifProRewardsBuffer_rocRewardsBuffer());
        (address rifProOutput0, , , ) = rifProBuffer.getOutput(0);
        assertEq(rifProOutput0, mocRewardsBuffer, "RifProRewardsBuffer output 0 should be mocRewardsBuffer");
        (address rifProOutput1, , , ) = rifProBuffer.getOutput(1);
        assertEq(
            rifProOutput1,
            addTasksRunnerChanger.revAuctionMOCtoRIF_rifBucket(),
            "RifProRewardsBuffer output 1 should be revAuctionMOCtoRIF_rifBucket"
        );

        IBufferTokenView mocRewardsBufferView = IBufferTokenView(mocRewardsBuffer);
        (address mocRewardsOutput0, , , ) = mocRewardsBufferView.getOutput(0);
        assertEq(mocRewardsOutput0, supporters, "MocRewardsBuffer output 0 should stay Supporters");
        (address mocRewardsOutput1, , , ) = mocRewardsBufferView.getOutput(1);
        assertEq(
            mocRewardsOutput1,
            addTasksRunnerChanger.splitMocRewardsToBtcOracleAndTasksRunner(),
            "MocRewardsBuffer output 1 should be rewired to the new child buffer"
        );

        IBufferTokenView splitMocRewardsToBtcOracleAndTasksRunner = IBufferTokenView(
            addTasksRunnerChanger.splitMocRewardsToBtcOracleAndTasksRunner()
        );
        (address splitMocRewardsOutput0, , , ) = splitMocRewardsToBtcOracleAndTasksRunner.getOutput(0);
        assertEq(splitMocRewardsOutput0, btcUsdCoinPair, "child buffer output 0 should stay BTC/USD");
        (address splitMocRewardsOutput1, , , ) = splitMocRewardsToBtcOracleAndTasksRunner.getOutput(1);
        assertEq(
            splitMocRewardsOutput1,
            addTasksRunnerChanger.tasksRunner(),
            "child buffer output 1 should be the new TasksRunner"
        );

        IBufferTokenView splitPriceUpdateFeesToBtcOracleAndRifOracle = IBufferTokenView(
            addTasksRunnerChanger.splitPriceUpdateFeesToBtcOracleAndRifOracle()
        );
        (address splitPriceUpdateFeesOutput0, , , ) = splitPriceUpdateFeesToBtcOracleAndRifOracle.getOutput(0);
        assertEq(
            splitPriceUpdateFeesOutput0,
            btcUsdCoinPair,
            "SplitPriceUpdateFeesToBtcOracleAndRifOracle output 0 should be BTC/USD"
        );
        (address splitPriceUpdateFeesOutput1, , , ) = splitPriceUpdateFeesToBtcOracleAndRifOracle.getOutput(1);
        assertEq(
            splitPriceUpdateFeesOutput1,
            addTasksRunnerChanger.rifOracleCoinPair(),
            "SplitPriceUpdateFeesToBtcOracleAndRifOracle output 1 should be the new RIF/USD coin pair"
        );

        IBufferTokenView splitRifFeesToFoundationAndRifOracle = IBufferTokenView(
            addTasksRunnerChanger.splitRifFeesToFoundationAndRifOracle()
        );
        (address splitRifFeesOutput0, , , ) = splitRifFeesToFoundationAndRifOracle.getOutput(0);
        assertEq(splitRifFeesOutput0, foundation, "RIF fee-routing buffer output 0 should be Foundation");
        (address splitRifFeesOutput1, , , ) = splitRifFeesToFoundationAndRifOracle.getOutput(1);
        assertEq(
            splitRifFeesOutput1,
            swapRifFeesToMocForRifOracle,
            "RIF fee-routing buffer output 1 should be the new RIF->MOC auction"
        );

        IBufferTokenView splitDocFeesToFoundationAndRifOracle = IBufferTokenView(
            addTasksRunnerChanger.splitDocFeesToFoundationAndRifOracle()
        );
        (address splitDocFeesOutput0, , , ) = splitDocFeesToFoundationAndRifOracle.getOutput(0);
        assertEq(splitDocFeesOutput0, foundation, "DOC fee-routing buffer output 0 should be Foundation");
        (address splitDocFeesOutput1, , , ) = splitDocFeesToFoundationAndRifOracle.getOutput(1);
        assertEq(
            splitDocFeesOutput1,
            swapDocFeesToMocForRifOracle,
            "DOC fee-routing buffer output 1 should be the new DOC->MOC auction"
        );

        IBufferTokenView splitMocFeesToFoundationAndRifOracle = IBufferTokenView(
            addTasksRunnerChanger.splitMocFeesToFoundationAndRifOracle()
        );
        (address splitMocFeesOutput0, , , ) = splitMocFeesToFoundationAndRifOracle.getOutput(0);
        assertEq(splitMocFeesOutput0, foundation, "MOC fee-routing buffer output 0 should be Foundation");
        (address splitMocFeesOutput1, , , ) = splitMocFeesToFoundationAndRifOracle.getOutput(1);
        assertEq(
            splitMocFeesOutput1,
            addTasksRunnerChanger.rifOracleCoinPair(),
            "MOC fee-routing buffer output 1 should be the new RIF/USD coin pair"
        );
    }

    function test_RegistryEntriesAreRemoved() public {
        _executeAddTasksRunnerChanger();

        IGovernedRegistryView registry = IGovernedRegistryView(address(addTasksRunnerChanger.governedRegistry()));

        assertFalse(
            registry.addressArrayContains(
                MOC_FLOW_REVERSE_AUCTIONS,
                addTasksRunnerChanger.revAuctionRIFtoMOC_rocRewardsBuffer()
            ),
            "Registry should not contain revAuctionRIFtoMOC_rocRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(
                MOC_FLOW_BUFFERS,
                addTasksRunnerChanger.rifProRewardsBuffer_rocRewardsBuffer()
            ),
            "Registry should not contain rifProRewardsBuffer_rocRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(
                MOC_FLOW_REVERSE_AUCTIONS,
                addTasksRunnerChanger.revAuctionMOCtoRIF_rifBucket()
            ),
            "Registry should not contain revAuctionMOCtoRIF_rifBucket"
        );
        assertFalse(
            registry.addressArrayContains(
                MOC_FLOW_REVERSE_AUCTIONS,
                addTasksRunnerChanger.revAuctionDOCtoMOC_rocRewardsBuffer()
            ),
            "Registry should not contain revAuctionDOCtoMOC_rocRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(
                MOC_FLOW_REVERSE_AUCTIONS,
                addTasksRunnerChanger.revAuctionMOCtoDOC_docBucket()
            ),
            "Registry should not contain revAuctionMOCtoDOC_docBucket"
        );
        assertFalse(
            registry.addressArrayContains(
                MOC_FLOW_REVERSE_AUCTIONS,
                addTasksRunnerChanger.revAuctionRBTCtoMOC_mocRewardsBuffer()
            ),
            "Registry should not contain revAuctionRBTCtoMOC_mocRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(MOC_FLOW_REVERSE_AUCTIONS, addTasksRunnerChanger.revAuctionMOCtoRBTC_mocV1()),
            "Registry should not contain revAuctionMOCtoRBTC_mocV1"
        );
        assertFalse(
            registry.addressArrayContains(MOC_FLOW_BUFFERS, addTasksRunnerChanger.rocrRewardsBuffer()),
            "Registry should not contain rocrRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(MOC_FLOW_BUFFERS, addTasksRunnerChanger.bitProRewardsBuffer()),
            "Registry should not contain bitProRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(MOC_FLOW_BUFFERS, addTasksRunnerChanger.bproRewardsBuffer()),
            "Registry should not contain bproRewardsBuffer"
        );
        assertFalse(
            registry.addressArrayContains(MOC_FLOW_BUFFERS, addTasksRunnerChanger.mocRewardsBuffer()),
            "Registry should not contain mocRewardsBuffer"
        );
    }

    function test_SubscribedOraclesCanRunTasks() public {
        _executeAddTasksRunnerChanger();

        ITasksRunnerView tasksRunner = ITasksRunnerView(addTasksRunnerChanger.tasksRunner());
        address staking = IOracleManagerView(preTasksRunnerChanger.oracleManagerProxy()).getStakingContract();

        uint256 pk1 = 0xA11CE01;
        uint256 pk2 = 0xA11CE02;
        uint256 pk3 = 0xA11CE03;
        address oracle1 = vm.addr(pk1);
        address oracle2 = vm.addr(pk2);
        address oracle3 = vm.addr(pk3);

        vm.deal(oracleOwner1, 1 ether);
        vm.deal(oracleOwner2, 1 ether);
        vm.deal(oracleOwner3, 1 ether);

        vm.prank(oracleOwner1);
        IStakingOracleOps(staking).setOracleAddress(oracle1);
        vm.prank(oracleOwner2);
        IStakingOracleOps(staking).setOracleAddress(oracle2);
        vm.prank(oracleOwner3);
        IStakingOracleOps(staking).setOracleAddress(oracle3);

        bytes32 coinPair = tasksRunner.getName();
        _subscribeIfNeeded(IStakingOracleOps(staking), oracleOwner1, coinPair);
        _subscribeIfNeeded(IStakingOracleOps(staking), oracleOwner2, coinPair);
        _subscribeIfNeeded(IStakingOracleOps(staking), oracleOwner3, coinPair);

        (, , uint256 lockPeriodTimestamp, , , ) = tasksRunner.getRoundInfo();
        vm.warp(lockPeriodTimestamp + 1);
        tasksRunner.switchRound();

        uint256 version = 3;
        uint256 tasksFlags = tasksRunner.getTasksAvailableAsFlags();
        assertGt(tasksFlags, 0, "No available tasks to execute");

        (uint256 pointsBefore, ) = tasksRunner.getOracleRoundInfo(oracleOwner1);
        uint256 blockNumber = tasksRunner.getLastPublicationBlock();
        address votedOracle = oracle1;
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n148",
                version,
                coinPair,
                tasksFlags,
                votedOracle,
                blockNumber
            )
        );

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pk1, messageHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pk2, messageHash);
        (uint8 v3, bytes32 r3, bytes32 s3) = vm.sign(pk3, messageHash);

        address[] memory signers = new address[](3);
        signers[0] = oracle1;
        signers[1] = oracle2;
        signers[2] = oracle3;

        uint8[] memory sigV = new uint8[](3);
        bytes32[] memory sigR = new bytes32[](3);
        bytes32[] memory sigS = new bytes32[](3);
        sigV[0] = v1;
        sigV[1] = v2;
        sigV[2] = v3;
        sigR[0] = r1;
        sigR[1] = r2;
        sigR[2] = r3;
        sigS[0] = s1;
        sigS[1] = s2;
        sigS[2] = s3;

        _sortSignaturesBySigner(signers, sigV, sigR, sigS);

        vm.recordLogs();
        vm.prank(votedOracle);
        tasksRunner.runTasks(version, coinPair, tasksFlags, votedOracle, blockNumber, sigV, sigR, sigS);

        (uint256 pointsAfter, ) = tasksRunner.getOracleRoundInfo(oracleOwner1);
        assertGt(pointsAfter, pointsBefore, "Oracle owner points should increase after running tasks");

        Vm.Log[] memory entries = vm.getRecordedLogs();
        bytes32 taskExecutedSig = keccak256("TaskExecuted(address,address,address,uint256,bool)");
        bool sawTaskExecuted = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (
                entries[i].emitter == address(tasksRunner) &&
                entries[i].topics.length > 0 &&
                entries[i].topics[0] == taskExecutedSig
            ) {
                sawTaskExecuted = true;
                break;
            }
        }
        assertTrue(sawTaskExecuted, "At least one TaskExecuted event should be emitted");
    }

    function _sortSignaturesBySigner(
        address[] memory signers,
        uint8[] memory sigV,
        bytes32[] memory sigR,
        bytes32[] memory sigS
    ) internal pure {
        for (uint256 i = 0; i < signers.length; i++) {
            for (uint256 j = i + 1; j < signers.length; j++) {
                if (signers[j] < signers[i]) {
                    (signers[i], signers[j]) = (signers[j], signers[i]);
                    (sigV[i], sigV[j]) = (sigV[j], sigV[i]);
                    (sigR[i], sigR[j]) = (sigR[j], sigR[i]);
                    (sigS[i], sigS[j]) = (sigS[j], sigS[i]);
                }
            }
        }
    }

    function _subscribeIfNeeded(IStakingOracleOps staking_, address ownerAddr, bytes32 coinPair) internal {
        if (!staking_.isSubscribed(ownerAddr, coinPair)) {
            vm.prank(ownerAddr);
            staking_.subscribeToCoinPair(coinPair);
        }
    }

    function test_TargemaTPIsSetOnUsdRif() public {
        uint256 expectedTargetEma = addTasksRunnerChanger.rifBucketUsdrifTargetEma();
        address usdRif = address(rifBucket.tpTokens(0));

        uint256 tpCtargBefore = rifBucket.tpCtarg(0);
        assertEq(tpCtargBefore, 5.5e18, "tpCtarg on usdRIF pegged token should be 5.5e18 before changer");

        uint256 ctargemaCA = rifBucket.getCtargemaCA();
        uint256 ctargemaTP = rifBucket.getCtargemaTP(usdRif);
        assertEq(ctargemaCA, ctargemaTP, "ctargemaCA should equal ctargemaTP (only one pegged token in the bucket)");
        assertEq(ctargemaCA, 11866059643163247835, "calcCtargemaCA should equal 11.86 before changer");

        _executeAddTasksRunnerChanger();

        uint256 tpCtargAfter = rifBucket.tpCtarg(0);
        assertEq(
            tpCtargAfter,
            expectedTargetEma,
            "tpCtarg on usdRIF pegged token should be set to rifBucketUsdrifTargetEma after changer"
        );

        _publishPriceOnRifOracle();

        ctargemaCA = rifBucket.getCtargemaCA();
        ctargemaTP = rifBucket.getCtargemaTP(usdRif);
        assertEq(ctargemaCA, ctargemaTP, "ctargemaCA should equal ctargemaTP (only one pegged token in the bucket)");
        assertEq(ctargemaCA, 13944792337996270365, "calcCtargemaCA should equal 13.9 after changer");
    }

    /// @dev After both changers run, queues a mintTP on the RIF bucket (usdRIF) and on the DOC
    ///      bucket in the same flow, then executes both via a single
    ///      `mocMultiCollateralGuard.execute()` call and verifies that both recipients received
    ///      their pegged tokens.
    function test_MintTPInBothBucketsAfterChanger() public {
        _executeAddTasksRunnerChanger();
        _publishPriceOnRifOracle();

        // mock the DOC price to be valid after the vm.roll
        vm.mockCall(
            _getNetworkAddress("docToUsdRifPriceProvider"),
            abi.encodeWithSelector(ICoinPairPriceView.peek.selector),
            abi.encode(bytes32(uint256(1e18)), true)
        );

        uint256 qACmax = 1000e18; // max collateral AC to spend per operation
        uint256 qTP = 1e18; // 1 usdRIF

        uint256 usdRifBalanceBefore = usdRifToken.balanceOf(holder);

        // TP_MINT opType = 3; query the fee from each bucket's queue
        uint8 TP_MINT = 3;
        uint256 rifMintFee = IQueueExecFeesView(address(rifQueue)).getExecFee(TP_MINT);
        uint256 docMintFee = IQueueExecFeesView(address(docBucket.mocQueue())).getExecFee(TP_MINT);

        // --- queue mintTP on RIF bucket (usdRIF) ---
        deal(address(rifToken), holder, qACmax);
        vm.startPrank(holder);
        rifToken.approve(address(rifBucket), qACmax);
        rifBucket.mintTP{ value: rifMintFee }(address(usdRifToken), qTP, qACmax, holder, address(0));
        vm.stopPrank();

        // --- queue mintTP on DOC bucket ---
        deal(address(docToken), holder, qACmax);
        vm.startPrank(holder);
        docToken.approve(address(docBucket), qACmax);
        docBucket.mintTP{ value: docMintFee }(address(usdRifToken), qTP, qACmax, holder, address(0));
        vm.stopPrank();

        // advance past minOperWaitingBlk so both operations become executable
        vm.roll(block.number + 10);

        // --- execute both queues in a single guard call ---
        mocMultiCollateralGuard.execute();

        // --- assertions ---
        assertEq(
            usdRifToken.balanceOf(holder),
            usdRifBalanceBefore + qTP + qTP,
            "holder should have received usdRIF after mintTP"
        );
    }

    /// @dev After both changers run, queues a mintTP on the RIF bucket, then verifies that:
    ///      1. Updating only the RIF price (lastPublicationBlock) is not enough to execute the queue.
    ///      2. Once the DOC price is also updated, the queue executes successfully.
    function test_QueueExecutionRequiresBothPriceUpdates_RifFirst() public {
        _executeAddTasksRunnerChanger();

        address rifPriceProvider = addTasksRunnerChanger.rifOracleCoinPair();
        address docPriceProvider = _getNetworkAddress("docToUsdRifPriceProvider");

        // Mock both peek() calls as always valid — validity is not what gates execution here.
        vm.mockCall(
            rifPriceProvider,
            abi.encodeWithSelector(ICoinPairPriceView.peek.selector),
            abi.encode(bytes32(uint256(1e18)), true)
        );
        vm.mockCall(
            docPriceProvider,
            abi.encodeWithSelector(ICoinPairPriceView.peek.selector),
            abi.encode(bytes32(uint256(1e18)), true)
        );

        uint256 qACmax = 1000e18;
        uint256 qTP = 1e18; // 1 usdRIF

        uint8 TP_MINT = 3;
        uint256 rifMintFee = IQueueExecFeesView(address(rifQueue)).getExecFee(TP_MINT);

        // --- queue mintTP on RIF bucket (usdRIF) ---
        deal(address(rifToken), holder, qACmax);
        vm.startPrank(holder);
        rifToken.approve(address(rifBucket), qACmax);
        rifBucket.mintTP{ value: rifMintFee }(address(usdRifToken), qTP, qACmax, holder, address(0));
        vm.stopPrank();

        // Advance one block — this becomes the "publication block" we will simulate.
        vm.roll(block.number + 1);
        uint256 pubBlock = block.number;

        uint256 usdRifBalanceBefore = usdRifToken.balanceOf(holder);

        // Step 2: only RIF published at pubBlock — DOC lastPublicationBlock is still old.
        // The guard uses the MINIMUM lastPublicationBlock (useMaxLastPublicationBlock=false),
        // so the DOC's stale block prevents execution.
        vm.mockCall(
            rifPriceProvider,
            abi.encodeWithSelector(bytes4(keccak256("getLastPublicationBlock()"))),
            abi.encode(pubBlock)
        );
        // DOC is NOT mocked: its real on-chain lastPublicationBlock predates the enqueue block.

        mocMultiCollateralGuard.execute();

        assertEq(
            usdRifToken.balanceOf(holder),
            usdRifBalanceBefore,
            "operation should NOT execute when only RIF price is updated"
        );

        // Step 3: DOC also publishes at pubBlock — both prices are now current.
        vm.mockCall(
            docPriceProvider,
            abi.encodeWithSelector(bytes4(keccak256("getLastPublicationBlock()"))),
            abi.encode(pubBlock)
        );

        mocMultiCollateralGuard.execute();

        assertEq(
            usdRifToken.balanceOf(holder),
            usdRifBalanceBefore + qTP,
            "operation should execute once both RIF and DOC prices are updated"
        );
    }

    /// @dev Same as test_QueueExecutionRequiresBothPriceUpdates_RifFirst but the DOC
    ///      lastPublicationBlock is simulated first. The operation must still wait for
    ///      the RIF publication before it can be executed.
    function test_QueueExecutionRequiresBothPriceUpdates_DocFirst() public {
        _executeAddTasksRunnerChanger();

        address rifPriceProvider = addTasksRunnerChanger.rifOracleCoinPair();
        address docPriceProvider = _getNetworkAddress("docToUsdRifPriceProvider");

        // Mock both peek() calls as always valid — validity is not what gates execution here.
        vm.mockCall(
            rifPriceProvider,
            abi.encodeWithSelector(ICoinPairPriceView.peek.selector),
            abi.encode(bytes32(uint256(1e18)), true)
        );
        vm.mockCall(
            docPriceProvider,
            abi.encodeWithSelector(ICoinPairPriceView.peek.selector),
            abi.encode(bytes32(uint256(1e18)), true)
        );

        uint256 qACmax = 1000e18;
        uint256 qTP = 1e18; // 1 usdRIF

        uint8 TP_MINT = 3;
        uint256 rifMintFee = IQueueExecFeesView(address(rifQueue)).getExecFee(TP_MINT);

        // --- queue mintTP on RIF bucket (usdRIF) ---
        deal(address(rifToken), holder, qACmax);
        vm.startPrank(holder);
        rifToken.approve(address(rifBucket), qACmax);
        rifBucket.mintTP{ value: rifMintFee }(address(usdRifToken), qTP, qACmax, holder, address(0));
        vm.stopPrank();

        // Advance one block — this becomes the "publication block" we will simulate.
        vm.roll(block.number + 1);
        uint256 pubBlock = block.number;

        uint256 usdRifBalanceBefore = usdRifToken.balanceOf(holder);

        // Step 2: only DOC published at pubBlock — RIF lastPublicationBlock is still old.
        vm.mockCall(
            docPriceProvider,
            abi.encodeWithSelector(bytes4(keccak256("getLastPublicationBlock()"))),
            abi.encode(pubBlock)
        );
        // RIF is NOT mocked: its real on-chain lastPublicationBlock is 0 (freshly deployed pair).

        mocMultiCollateralGuard.execute();

        assertEq(
            usdRifToken.balanceOf(holder),
            usdRifBalanceBefore,
            "operation should NOT execute when only DOC price is updated"
        );

        // Step 3: RIF also publishes at pubBlock — both prices are now current.
        vm.mockCall(
            rifPriceProvider,
            abi.encodeWithSelector(bytes4(keccak256("getLastPublicationBlock()"))),
            abi.encode(pubBlock)
        );

        mocMultiCollateralGuard.execute();

        assertEq(
            usdRifToken.balanceOf(holder),
            usdRifBalanceBefore + qTP,
            "operation should execute once both DOC and RIF prices are updated"
        );
    }

    /// @dev Publishes a real price on the newly created RIF/USD CoinPairPrice so that
    ///      subsequent peek() calls return a valid price.  The new pair starts with no
    ///      publication history, so we:
    ///      1. Subscribe oracleOwner1/2/3 to the new coin pair.
    ///      2. switchRound() to select them.
    ///      3. Rotate their oracle signing keys to known private keys.
    ///      4. Call publishPrice() with a quorum of signatures and the TP0 price read in setUp().
    function _publishPriceOnRifOracle() internal {
        uint256 PUBLISH_MESSAGE_VERSION = 3;

        IOracleManagerView om = IOracleManagerView(preTasksRunnerChanger.oracleManagerProxy());
        IStakingFull staking = IStakingFull(om.getStakingContract());
        ICoinPairPriceFull feed = ICoinPairPriceFull(addTasksRunnerChanger.rifOracleCoinPair());

        // Subscribe the three known oracle owners to the new RIF/USD pair
        bytes32 coinpair = feed.getCoinPair();
        _subscribeIfNeeded(IStakingOracleOps(address(staking)), oracleOwner1, coinpair);
        _subscribeIfNeeded(IStakingOracleOps(address(staking)), oracleOwner2, coinpair);
        _subscribeIfNeeded(IStakingOracleOps(address(staking)), oracleOwner3, coinpair);

        // Retrieve selected owners after the round switch
        (, , , , address[] memory newOwners, ) = feed.getRoundInfo();
        require(newOwners.length >= 1, "no selected owners for new RIF/USD pair");
        (, , uint256 newLastPubBlock) = feed.getPriceInfo();

        // Need strictly more than 50% of selected owners to sign
        uint256 needed = newOwners.length / 2 + 1;
        uint256[] memory privateKeys = new uint256[](needed);
        for (uint256 i = 0; i < needed; i++) {
            privateKeys[i] = 0x3000 + i + 1;
        }

        // Rotate oracle signing addresses for each selected owner
        address[] memory signers = _rotationSignersFromKeys(IOracleCheats(address(vm)), privateKeys);
        for (uint256 i = 0; i < signers.length; i++) {
            vm.prank(newOwners[i]);
            staking.setOracleAddress(signers[i]);
            require(om.getOracleAddress(newOwners[i]) == signers[i], "failed to set signer for RIF/USD oracle");
        }

        // Advance one more block so block.number > newLastPubBlock
        vm.roll(block.number + 1);

        address votedOracle = signers[0];

        bytes32 digest = _buildDigest(
            PUBLISH_MESSAGE_VERSION,
            coinpair,
            rifBucketTp0Price,
            votedOracle,
            newLastPubBlock
        );
        (uint8[] memory sigV, bytes32[] memory sigR, bytes32[] memory sigS) = _buildSortedSignatures(
            IOracleCheats(address(vm)),
            privateKeys,
            signers,
            digest
        );

        vm.prank(votedOracle);
        feed.publishPrice(
            PUBLISH_MESSAGE_VERSION,
            coinpair,
            rifBucketTp0Price,
            votedOracle,
            newLastPubBlock,
            sigV,
            sigR,
            sigS
        );
    }
}
