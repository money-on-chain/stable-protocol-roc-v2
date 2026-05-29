// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { BaseFork } from "./helpers/BaseFork.sol";
import { Vm } from "forge-std/Vm.sol";

interface IReverseAuctionView {
    function outputAccount() external view returns (address);
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
}

interface IStakingOracleOps {
    function setOracleAddress(address oracleAddr) external;
    function subscribeToCoinPair(bytes32 coinPair) external;
}

contract AddTasksRunnerChangerForkTests is BaseFork {
    string private constant TASKS_DEPLOYED_ADDRESSES_PATH =
        "test/changers/addTasksRunner/fixtures/deployed-addresses.json";
    address private constant MOC_REWARDS_BUFFER = 0xf09006E812BE98c7B18c877Af5C126629acB6cAb;
    bytes32 private constant MOC_FLOW_BUFFERS = 0x4cb845794d5472a713e41e8e4ddc566dab8d695f1dc6c8edd43dad9d55112a22;
    bytes32 private constant MOC_FLOW_REVERSE_AUCTIONS =
        0x0428ec087e0cce276a71d1caf1afe4da32a2d48b3ebe579040612b5bd262ff73;
    address private constant ORACLE_OWNER_1 = 0x4e9e0e64ff95f9a629D1F756119fA636F30BbACD;
    address private constant ORACLE_OWNER_2 = 0xd6fdad4e02477A05A492F1AC51cfE0883C470022;
    address private constant ORACLE_OWNER_3 = 0xC9acAf0Ab55cADC285F109E20d9Ba5cCa81d02D6;

    function setUp() public override {
        super.setUp();
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
            "bucket0 rebalance recipient should be set by AddTasksRunnerChanger"
        );

        assertEq(
            mocMultiCollateralGuard.rebalanceExecFeeRecipient(mocMultiCollateralGuard.buckets(1)),
            addTasksRunnerChanger.revAuctionDOCtoMOC_tasksRunner(),
            "bucket1 rebalance recipient should be set by AddTasksRunnerChanger"
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
            IReverseAuctionView(addTasksRunnerChanger.revAuctionRIFtoMOC_rocRewardsBuffer()).outputAccount(),
            MOC_REWARDS_BUFFER,
            "RIF->MOC legacy auction output should point to mocRewardsBuffer"
        );
        assertEq(
            IReverseAuctionView(addTasksRunnerChanger.revAuctionDOCtoMOC_rocRewardsBuffer()).outputAccount(),
            MOC_REWARDS_BUFFER,
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

    function test_TasksRunnerContainsAllExpectedTasks() public {
        _executeAddTasksRunnerChanger();

        string memory json = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
        string[45] memory taskKeys = [
            "TaskUpdateEmaV1",
            "TaskDailyInratePaymentV1",
            "TaskEvalLiquidationV1",
            "TaskInterestPaymentV1",
            "TaskSettlementV1",
            "TaskMintStep",
            "TaskSwitchRoundCoinPair",
            "TaskDistributeSupporters",
            "TaskExecuteQueueV3",
            "TaskUpdateEmaV3Bucket0",
            "TaskUpdateEmaV3Bucket1",
            "TaskExecuteLiquidationV3Bucket0",
            "TaskExecuteLiquidationV3Bucket1",
            "TaskExecuteMicroLiquidationV3Bucket0",
            "TaskExecuteMicroLiquidationV3Bucket1",
            "TaskInterestPaymentV3Bucket0",
            "TaskInterestPaymentV3Bucket1",
            "TaskSettlementV3Bucket0",
            "TaskSettlementV3Bucket1",
            "TaskRefreshACBalanceV3Bucket0",
            "TaskRefreshACBalanceV3Bucket1",
            "TaskSplitRifCommissionSplitterV2",
            "TaskSplitRifCommissionSplitterV3",
            "TaskSplitDocCommissionSplitterV2",
            "TaskSplitMocCommissionSplitterV2",
            "TaskSplitMocCommissionSplitterV3",
            "TaskTriggerOrderRevAuctionRBTCtoMOC_tasksRunner",
            "TaskTriggerOrderRevAuctionRIFtoMOC_tasksRunner",
            "TaskTriggerOrderRevAuctionDOCtoMOC_tasksRunner",
            "TaskTriggerOrderRevAuctionRBTCtoMOC_rocNodes",
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
            "TaskLiquidateMocRewardsBuffer"
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
        assertEq(rocrOutput0, MOC_REWARDS_BUFFER, "RocrRewardsBuffer output 0 should be mocRewardsBuffer");
        (address rocrOutput1, , , ) = rocrBuffer.getOutput(1);
        assertEq(
            rocrOutput1,
            addTasksRunnerChanger.revAuctionMOCtoDOC_docBucket(),
            "RocrRewardsBuffer output 1 should be revAuctionMOCtoDOC_docBucket"
        );

        IBufferTokenView rifProBuffer = IBufferTokenView(addTasksRunnerChanger.rifProRewardsBuffer_rocRewardsBuffer());
        (address rifProOutput0, , , ) = rifProBuffer.getOutput(0);
        assertEq(rifProOutput0, MOC_REWARDS_BUFFER, "RifProRewardsBuffer output 0 should be mocRewardsBuffer");
        (address rifProOutput1, , , ) = rifProBuffer.getOutput(1);
        assertEq(
            rifProOutput1,
            addTasksRunnerChanger.revAuctionMOCtoRIF_rifBucket(),
            "RifProRewardsBuffer output 1 should be revAuctionMOCtoRIF_rifBucket"
        );

        string memory json = vm.readFile(TASKS_DEPLOYED_ADDRESSES_PATH);
        address expectedRocNodesBuffer = vm.parseJsonAddress(json, ".RocNodesBuffer");
        address rocNodesBuffer = IReverseAuctionView(addTasksRunnerChanger.revAuctionRBTCtoMOC_rocNodes())
            .outputAccount();
        assertEq(rocNodesBuffer, expectedRocNodesBuffer, "RBTC->MOC rocNodes auction output should be RocNodesBuffer");

        IBufferTokenView rocNodesBufferView = IBufferTokenView(rocNodesBuffer);
        (address rocNodesOutput0, , , ) = rocNodesBufferView.getOutput(0);
        assertEq(rocNodesOutput0, MOC_REWARDS_BUFFER, "RocNodesBuffer output 0 should be mocRewardsBuffer");
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

        vm.deal(ORACLE_OWNER_1, 1 ether);
        vm.deal(ORACLE_OWNER_2, 1 ether);
        vm.deal(ORACLE_OWNER_3, 1 ether);

        vm.prank(ORACLE_OWNER_1);
        IStakingOracleOps(staking).setOracleAddress(oracle1);
        vm.prank(ORACLE_OWNER_2);
        IStakingOracleOps(staking).setOracleAddress(oracle2);
        vm.prank(ORACLE_OWNER_3);
        IStakingOracleOps(staking).setOracleAddress(oracle3);

        bytes32 coinPair = addTasksRunnerChanger.tasksRunnerCoinPair();
        vm.prank(ORACLE_OWNER_1);
        IStakingOracleOps(staking).subscribeToCoinPair(coinPair);
        vm.prank(ORACLE_OWNER_2);
        IStakingOracleOps(staking).subscribeToCoinPair(coinPair);
        vm.prank(ORACLE_OWNER_3);
        IStakingOracleOps(staking).subscribeToCoinPair(coinPair);

        tasksRunner.switchRound();

        uint256 version = 3;
        uint256 tasksFlags = tasksRunner.getTasksAvailableAsFlags();
        assertGt(tasksFlags, 0, "No available tasks to execute");

        (uint256 pointsBefore, ) = tasksRunner.getOracleRoundInfo(ORACLE_OWNER_1);
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

        (uint256 pointsAfter, ) = tasksRunner.getOracleRoundInfo(ORACLE_OWNER_1);
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
