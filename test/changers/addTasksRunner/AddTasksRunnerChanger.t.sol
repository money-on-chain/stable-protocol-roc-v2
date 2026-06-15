// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { BaseFork } from "./helpers/BaseFork.sol";
import { IMocV2 } from "moc-main-latest/contracts/interfaces/IMocV2.sol";
import { Vm } from "forge-std/Vm.sol";

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
}

interface IOracleManagerView {
    function getStakingContract() external view returns (address);
    function getContractAddress(bytes32 coinPair) external view returns (address);
}

interface IQueueExecFeesView {
    function priceUpdatesCost() external view returns (uint256);
}

interface IStakingOracleOps {
    function setOracleAddress(address oracleAddr) external;
    function subscribeToCoinPair(bytes32 coinPair) external;
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

    function setUp() public override {
        super.setUp();
        mocRewardsBuffer = getMainnetAddress("mocRewardsBuffer");
        supporters = getMainnetAddress("supporters");
        btcUsdCoinPair = getMainnetAddress("btcUsdCoinPair");
        foundation = getMainnetAddress("foundation");
        rifCommissionSplitterV2 = getMainnetAddress("rifCommissionSplitterV2");
        rifCommissionSplitterV3 = getMainnetAddress("rifCommissionSplitterV3");
        docCommissionSplitterV2 = getMainnetAddress("docCommissionSplitterV2");
        oracleOwner1 = getMainnetAddress("oracleOwner1");
        oracleOwner2 = getMainnetAddress("oracleOwner2");
        oracleOwner3 = getMainnetAddress("oracleOwner3");
    }

    function test_ExecuteAddTasksRunnerChanger() public {
        vm.expectCall(
            address(addTasksRunnerChanger.oracleManager()),
            abi.encodeWithSignature(
                "registerCoinPair(bytes32,address)",
                addTasksRunnerChanger.tasksRunnerCoinPair(),
                addTasksRunnerChanger.tasksRunner()
            )
        );

        _executeAddTasksRunnerChanger();

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
            IReverseAuctionView(addTasksRunnerChanger.swapRifFeesToMocForRifOracle()).outputAccount(),
            addTasksRunnerChanger.rifOracleCoinPair(),
            "RIF->MOC fee-routing auction output should point to the RIF/USD coin pair"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.swapDocFeesToMocForRifOracle()).outputAccount(),
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
        IOracleManagerView oracleManager = IOracleManagerView(address(addTasksRunnerChanger.oracleManager()));
        (, address currentBucketPriceProvider) = IMocV2(address(rifBucket)).pegContainer(0);
        address currentRifUsdRegistration = oracleManager.getContractAddress(RIF_USD);
        address currentAcCoinbasePriceProvider = address(mocMultiCollateralGuard.acCoinbasePriceProvider(rifBucket));

        _executeAddTasksRunnerChanger();

        (, address migratedBucketPriceProvider) = IMocV2(address(rifBucket)).pegContainer(0);
        address migratedRifUsdRegistration = oracleManager.getContractAddress(RIF_USD);
        address migratedAcCoinbasePriceProvider = address(mocMultiCollateralGuard.acCoinbasePriceProvider(rifBucket));

        assertEq(currentBucketPriceProvider, getMainnetAddress("rifUsdLegacyPriceProvider"));
        assertEq(currentAcCoinbasePriceProvider, getMainnetAddress("rifToRbtcPriceProvider"));
        assertEq(migratedBucketPriceProvider, addTasksRunnerChanger.rifOracleCoinPair());
        assertEq(migratedAcCoinbasePriceProvider, addTasksRunnerChanger.rifToRbtcPriceProvider());
        assertEq(migratedRifUsdRegistration, addTasksRunnerChanger.rifOracleCoinPair());
        assertTrue(currentRifUsdRegistration != address(0), "RIFUSD should be registered before migration");

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
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.swapRifFeesToMocForRifOracle()).priceProvider(),
            addTasksRunnerChanger.rifToMocPriceProvider(),
            "new RIF->MOC fee-routing auction should use the replacement RIF/MOC provider"
        );

        ICoinPairPriceView rifOracleCoinPair = ICoinPairPriceView(addTasksRunnerChanger.rifOracleCoinPair());
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
            rifSplitterV3.acTokenAddressRecipient2(),
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
        string[58] memory taskKeys = [
            "TaskUpdateEmaV1",
            "TaskDailyInratePaymentV1",
            "TaskEvalLiquidationV1",
            "TaskInterestPaymentV1",
            "TaskSettlementV1",
            "TaskMintStep",
            "TaskSwitchRoundCoinPair",
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
            "TaskSettlementV3RifBucket",
            "TaskSettlementV3DocBucket",
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
            addTasksRunnerChanger.swapRifFeesToMocForRifOracle(),
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
            addTasksRunnerChanger.swapDocFeesToMocForRifOracle(),
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
        address staking = IOracleManagerView(address(addTasksRunnerChanger.oracleManager())).getStakingContract();

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

        bytes32 coinPair = addTasksRunnerChanger.tasksRunnerCoinPair();
        vm.prank(oracleOwner1);
        IStakingOracleOps(staking).subscribeToCoinPair(coinPair);
        vm.prank(oracleOwner2);
        IStakingOracleOps(staking).subscribeToCoinPair(coinPair);
        vm.prank(oracleOwner3);
        IStakingOracleOps(staking).subscribeToCoinPair(coinPair);

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
}
