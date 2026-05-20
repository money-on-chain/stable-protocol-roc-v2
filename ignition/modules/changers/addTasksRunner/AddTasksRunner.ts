import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition module for TasksRunner deployment.
 *
 * Deploys:
 * 1) TasksRunner implementation
 * 2) Task contracts from @moc/oracles:
 *    - V3: TaskExecuteQueueV3, TaskUpdateEmaV3 (bucket0/bucket1),
 *      TaskExecuteLiquidationV3 (bucket0/bucket1),
 *      TaskExecuteMicroLiquidationV3 (bucket0/bucket1),
 *      TaskInterestPaymentV3 (bucket0/bucket1),
 *      TaskSettlementV3 (bucket0/bucket1)
 *    - V2V3: TaskRefreshACBalanceV2V3 (bucket0/bucket1)
 *    - Flow: TaskSplit, TaskTriggerOrder, TaskFlush, TaskLiquidate
 * 3) Encodes and executes TasksRunner.initialize(...) on ERC1967 proxy deployment
 *    using all deployed task addresses (in the order defined in this module)
 * 4) TasksRunner proxy (ERC1967)
 * 5) Four MocReverseAuction contracts used as fee recipients in AddTasksRunnerChanger
 * 6) RocNodesBuffer proxy (ERC1967) for MOC distribution from roc-nodes reverse auction
 * 7) RocRewardsBuffer proxy (ERC1967) for MOC distribution to TasksRunner and MocRewardsBuffer
 * 8) AddTasksRunnerChanger configured to apply protocol wiring/upgrade steps
 */
const AddTasksRunnerModule = buildModule("AddTasksRunner", m => {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const getParameter = <T extends string | bigint | boolean | string[] | bigint[]>(parameterName: string) =>
    m.getParameter<T>(parameterName);
  // ---------------------------------------------------------------------------
  // Stage 0 - Module Parameters
  // ---------------------------------------------------------------------------
  const core = {
    governor: getParameter<string>("core.governor"),
    name: getParameter<string>("core.name"),
    mocTokenAddress: getParameter<string>("core.mocTokenAddress"),
    oracleManager: getParameter<string>("core.oracleManager"),
    registry: getParameter<string>("core.registry"),
    mocMultiCollateralGuard: getParameter<string>("core.mocMultiCollateralGuard"),
    bucket0: getParameter<string>("core.bucket0"),
    bucket1: getParameter<string>("core.bucket1"),
    refreshAcBalanceThreshold: getParameter<bigint>("core.refreshAcBalanceThreshold"),
    mocRewardsBuffer: getParameter<string>("core.mocRewardsBuffer"),
  };

  const tasksRunnerCfg = {
    minOraclesPerRound: getParameter<bigint>("tasksRunner.minOraclesPerRound"),
    maxOraclesPerRound: getParameter<bigint>("tasksRunner.maxOraclesPerRound"),
    maxSubscribedOraclesPerRound: getParameter<bigint>("tasksRunner.maxSubscribedOraclesPerRound"),
    roundLockPeriod: getParameter<bigint>("tasksRunner.roundLockPeriod"),
    maxMissedSigRounds: getParameter<bigint>("tasksRunner.maxMissedSigRounds"),
    maxTasksPerBatch: getParameter<bigint>("tasksRunner.maxTasksPerBatch"),
    tokenToCoinbasePriceProvider: getParameter<string>("tasksRunner.tokenToCoinbasePriceProvider"),
    sharesCapMultiplier: getParameter<bigint>("tasksRunner.sharesCapMultiplier"),
  };

  const flow = {
    revertSleepTime: getParameter<bigint>("flow.revertSleepTime"),
    taskOwner: getParameter<string>("flow.taskOwner"),
  };

  const bufferTasks = {
    rifProRewardsBuffer: getParameter<string>("bufferTasks.rifProRewardsBuffer"),
    rocrRewardsBuffer: getParameter<string>("bufferTasks.rocrRewardsBuffer"),
  };

  const triggerOrderRevAuctions = {
    revAuctionRIFtoMOC_rocRewardsBuffer: getParameter<string>(
      "triggerOrderRevAuctions.revAuctionRIFtoMOC_rocRewardsBuffer",
    ),
    revAuctionMOCtoRIF_rifBucket: getParameter<string>("triggerOrderRevAuctions.revAuctionMOCtoRIF_rifBucket"),
    revAuctionDOCtoMOC_rocRewardsBuffer: getParameter<string>(
      "triggerOrderRevAuctions.revAuctionDOCtoMOC_rocRewardsBuffer",
    ),
    revAuctionMOCtoDOC_docBucket: getParameter<string>("triggerOrderRevAuctions.revAuctionMOCtoDOC_docBucket"),
  };

  const rifCommissionSplitterV2 = {
    commissionSplitter: getParameter<string>("rifCommissionSplitterV2.commissionSplitter"),
    token: getParameter<string>("rifCommissionSplitterV2.token"),
    feeToken: getParameter<string>("rifCommissionSplitterV2.feeToken"),
    tokenBalanceThreshold: getParameter<bigint>("rifCommissionSplitterV2.tokenBalanceThreshold"),
    feeTokenBalanceThreshold: getParameter<bigint>("rifCommissionSplitterV2.feeTokenBalanceThreshold"),
  };

  const rifCommissionSplitterV3 = {
    commissionSplitter: getParameter<string>("rifCommissionSplitterV3.commissionSplitter"),
    token: getParameter<string>("rifCommissionSplitterV3.token"),
    feeToken: getParameter<string>("rifCommissionSplitterV3.feeToken"),
    tokenBalanceThreshold: getParameter<bigint>("rifCommissionSplitterV3.tokenBalanceThreshold"),
    feeTokenBalanceThreshold: getParameter<bigint>("rifCommissionSplitterV3.feeTokenBalanceThreshold"),
  };

  const docCommissionSplitterV2 = {
    commissionSplitter: getParameter<string>("docCommissionSplitterV2.commissionSplitter"),
    token: getParameter<string>("docCommissionSplitterV2.token"),
    feeToken: getParameter<string>("docCommissionSplitterV2.feeToken"),
    tokenBalanceThreshold: getParameter<bigint>("docCommissionSplitterV2.tokenBalanceThreshold"),
    feeTokenBalanceThreshold: getParameter<bigint>("docCommissionSplitterV2.feeTokenBalanceThreshold"),
  };

  const reverseAuctions = {
    revAuctionRBTCtoMOC_tasksRunner: {
      mocSwapper: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.mocSwapper"),
      tokenIn: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.tokenIn"),
      tokenOut: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.tokenOut"),
      orderThreshold: getParameter<bigint>("reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.orderThreshold"),
      priceProvider: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.priceProvider"),
      slippage: getParameter<bigint>("reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.slippage"),
    },
    revAuctionRIFtoMOC_tasksRunner: {
      mocSwapper: getParameter<string>("reverseAuctions.revAuctionRIFtoMOC_tasksRunner.mocSwapper"),
      tokenIn: getParameter<string>("reverseAuctions.revAuctionRIFtoMOC_tasksRunner.tokenIn"),
      tokenOut: getParameter<string>("reverseAuctions.revAuctionRIFtoMOC_tasksRunner.tokenOut"),
      orderThreshold: getParameter<bigint>("reverseAuctions.revAuctionRIFtoMOC_tasksRunner.orderThreshold"),
      priceProvider: getParameter<string>("reverseAuctions.revAuctionRIFtoMOC_tasksRunner.priceProvider"),
      slippage: getParameter<bigint>("reverseAuctions.revAuctionRIFtoMOC_tasksRunner.slippage"),
    },
    revAuctionDOCtoMOC_tasksRunner: {
      mocSwapper: getParameter<string>("reverseAuctions.revAuctionDOCtoMOC_tasksRunner.mocSwapper"),
      tokenIn: getParameter<string>("reverseAuctions.revAuctionDOCtoMOC_tasksRunner.tokenIn"),
      tokenOut: getParameter<string>("reverseAuctions.revAuctionDOCtoMOC_tasksRunner.tokenOut"),
      orderThreshold: getParameter<bigint>("reverseAuctions.revAuctionDOCtoMOC_tasksRunner.orderThreshold"),
      priceProvider: getParameter<string>("reverseAuctions.revAuctionDOCtoMOC_tasksRunner.priceProvider"),
      slippage: getParameter<bigint>("reverseAuctions.revAuctionDOCtoMOC_tasksRunner.slippage"),
    },
    revAuctionRBTCtoMOC_rocNodes: {
      mocSwapper: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_rocNodes.mocSwapper"),
      tokenIn: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_rocNodes.tokenIn"),
      tokenOut: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_rocNodes.tokenOut"),
      orderThreshold: getParameter<bigint>("reverseAuctions.revAuctionRBTCtoMOC_rocNodes.orderThreshold"),
      priceProvider: getParameter<string>("reverseAuctions.revAuctionRBTCtoMOC_rocNodes.priceProvider"),
      slippage: getParameter<bigint>("reverseAuctions.revAuctionRBTCtoMOC_rocNodes.slippage"),
    },
  };

  const rocNodesBufferCfg = {
    threshold: getParameter<bigint>("rocNodesBuffer.threshold"),
    outputs: getParameter<string[]>("rocNodesBuffer.outputs"),
    splits: getParameter<bigint[]>("rocNodesBuffer.splits"),
    outputThresholds: getParameter<bigint[]>("rocNodesBuffer.outputThresholds"),
  };

  const rocRewardsBufferCfg = {
    threshold: getParameter<bigint>("rocRewardsBuffer.threshold"),
    tasksRunnerSplit: getParameter<bigint>("rocRewardsBuffer.tasksRunnerSplit"),
    mocRewardsBufferSplit: getParameter<bigint>("rocRewardsBuffer.mocRewardsBufferSplit"),
    tasksRunnerOutputThreshold: getParameter<bigint>("rocRewardsBuffer.tasksRunnerOutputThreshold"),
    mocRewardsBufferOutputThreshold: getParameter<bigint>("rocRewardsBuffer.mocRewardsBufferOutputThreshold"),
  };

  // ---------------------------------------------------------------------------
  // Stage 1 - TasksRunner Base Deployment
  // ---------------------------------------------------------------------------
  const tasksRunnerImpl = m.contract("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", [], {
    id: "TasksRunnerImplementation",
  });
  const basefeeProvider = m.contract("@moc/oracles/contracts/BasefeeProvider.sol:BasefeeProvider", [], {
    id: "BasefeeProvider",
  });
  const bufferTokenImpl = m.contract("@moc/flow/contracts/BufferToken.sol:BufferToken", [], {
    id: "BufferTokenImplementation",
  });
  const rocNodesBufferProxy = m.contract("ERC1967Proxy", [bufferTokenImpl, "0x"], {
    id: "RocNodesBufferProxy",
  });
  const rocNodesBuffer = m.contractAt("@moc/flow/contracts/BufferToken.sol:BufferToken", rocNodesBufferProxy, {
    id: "RocNodesBuffer",
  });

  const roundConfig = {
    maxOraclesPerRound: tasksRunnerCfg.maxOraclesPerRound,
    maxSubscribedOraclesPerRound: tasksRunnerCfg.maxSubscribedOraclesPerRound,
    roundLockPeriod: tasksRunnerCfg.roundLockPeriod,
    maxMissedSigRounds: tasksRunnerCfg.maxMissedSigRounds,
  };

  const tasksRunnerParams = {
    maxTasksPerBatch: tasksRunnerCfg.maxTasksPerBatch,
    tokenToCoinbasePriceProvider: tasksRunnerCfg.tokenToCoinbasePriceProvider,
    baseFeeProvider: basefeeProvider,
    sharesCapMultiplier: tasksRunnerCfg.sharesCapMultiplier,
  };

  // ---------------------------------------------------------------------------
  // Stage 2 - Reverse Auctions for Fee Routing
  // ---------------------------------------------------------------------------
  // These 3 auctions are initialized with placeholder outputAccount and then
  // pointed to TasksRunner by AddTasksRunnerChanger to avoid circular deps.
  const revAuctionRBTCtoMOC_tasksRunner = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.mocSwapper,
      reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.tokenIn,
      reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.tokenOut,
      ZERO_ADDRESS,
      reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.orderThreshold,
      reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.priceProvider,
      reverseAuctions.revAuctionRBTCtoMOC_tasksRunner.slippage,
    ],
    { id: "RevAuctionRBTCtoMOC_tasksRunner" },
  );

  const revAuctionRIFtoMOC_tasksRunner = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.revAuctionRIFtoMOC_tasksRunner.mocSwapper,
      reverseAuctions.revAuctionRIFtoMOC_tasksRunner.tokenIn,
      reverseAuctions.revAuctionRIFtoMOC_tasksRunner.tokenOut,
      ZERO_ADDRESS,
      reverseAuctions.revAuctionRIFtoMOC_tasksRunner.orderThreshold,
      reverseAuctions.revAuctionRIFtoMOC_tasksRunner.priceProvider,
      reverseAuctions.revAuctionRIFtoMOC_tasksRunner.slippage,
    ],
    { id: "RevAuctionRIFtoMOC_tasksRunner" },
  );

  const revAuctionDOCtoMOC_tasksRunner = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.revAuctionDOCtoMOC_tasksRunner.mocSwapper,
      reverseAuctions.revAuctionDOCtoMOC_tasksRunner.tokenIn,
      reverseAuctions.revAuctionDOCtoMOC_tasksRunner.tokenOut,
      ZERO_ADDRESS,
      reverseAuctions.revAuctionDOCtoMOC_tasksRunner.orderThreshold,
      reverseAuctions.revAuctionDOCtoMOC_tasksRunner.priceProvider,
      reverseAuctions.revAuctionDOCtoMOC_tasksRunner.slippage,
    ],
    { id: "RevAuctionDOCtoMOC_tasksRunner" },
  );

  const revAuctionRBTCtoMOC_rocNodes = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.mocSwapper,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.tokenIn,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.tokenOut,
      rocNodesBuffer,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.orderThreshold,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.priceProvider,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.slippage,
    ],
    { id: "RevAuctionRBTCtoMOC_rocNodes" },
  );

  // ---------------------------------------------------------------------------
  // Stage 3 - Task Contracts Deployment
  // ---------------------------------------------------------------------------
  // 3.1 - V3 and V2V3 operational tasks
  const executeQueueTask = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteQueueV3.sol:TaskExecuteQueueV3",
    [core.mocMultiCollateralGuard],
    { id: "TaskExecuteQueueV3" },
  );

  const updateEmaTaskBucket0 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskUpdateEmaV3.sol:TaskUpdateEmaV3",
    [core.bucket0],
    {
      id: "TaskUpdateEmaV3Bucket0",
    },
  );
  const updateEmaTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskUpdateEmaV3.sol:TaskUpdateEmaV3",
    [core.bucket1],
    {
      id: "TaskUpdateEmaV3Bucket1",
    },
  );

  const executeLiquidationTaskBucket0 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteLiquidationV3.sol:TaskExecuteLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket0],
    { id: "TaskExecuteLiquidationV3Bucket0" },
  );
  const executeLiquidationTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteLiquidationV3.sol:TaskExecuteLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket1],
    { id: "TaskExecuteLiquidationV3Bucket1" },
  );

  const executeMicroLiquidationTaskBucket0 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol:TaskExecuteMicroLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket0],
    { id: "TaskExecuteMicroLiquidationV3Bucket0" },
  );
  const executeMicroLiquidationTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol:TaskExecuteMicroLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket1],
    { id: "TaskExecuteMicroLiquidationV3Bucket1" },
  );

  const interestPaymentTaskBucket0 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskInterestPaymentV3.sol:TaskInterestPaymentV3",
    [core.bucket0],
    { id: "TaskInterestPaymentV3Bucket0" },
  );
  const interestPaymentTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskInterestPaymentV3.sol:TaskInterestPaymentV3",
    [core.bucket1],
    { id: "TaskInterestPaymentV3Bucket1" },
  );

  const settlementTaskBucket0 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskSettlementV3.sol:TaskSettlementV3",
    [core.bucket0],
    {
      id: "TaskSettlementV3Bucket0",
    },
  );
  const settlementTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskSettlementV3.sol:TaskSettlementV3",
    [core.bucket1],
    {
      id: "TaskSettlementV3Bucket1",
    },
  );

  const refreshAcBalanceTaskBucket0 = m.contract(
    "@moc/oracles/contracts/tasks/v2v3/TaskRefreshACBalanceV2V3.sol:TaskRefreshACBalanceV2V3",
    [core.bucket0, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV2V3Bucket0" },
  );
  const refreshAcBalanceTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v2v3/TaskRefreshACBalanceV2V3.sol:TaskRefreshACBalanceV2V3",
    [core.bucket1, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV2V3Bucket1" },
  );

  // 3.2 - Flow tasks (split, trigger-order, flush, liquidate)
  const flowSplitTaskRifCommissionSplitterV2 = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
    [
      rifCommissionSplitterV2.commissionSplitter,
      rifCommissionSplitterV2.token,
      rifCommissionSplitterV2.feeToken,
      rifCommissionSplitterV2.tokenBalanceThreshold,
      rifCommissionSplitterV2.feeTokenBalanceThreshold,
    ],
    {
      id: "TaskSplitRifCommissionSplitterV2",
    },
  );
  const flowSplitTaskRifCommissionSplitterV3 = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
    [
      rifCommissionSplitterV3.commissionSplitter,
      rifCommissionSplitterV3.token,
      rifCommissionSplitterV3.feeToken,
      rifCommissionSplitterV3.tokenBalanceThreshold,
      rifCommissionSplitterV3.feeTokenBalanceThreshold,
    ],
    {
      id: "TaskSplitRifCommissionSplitterV3",
    },
  );
  const flowSplitTaskDocCommissionSplitterV2 = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
    [
      docCommissionSplitterV2.commissionSplitter,
      docCommissionSplitterV2.token,
      docCommissionSplitterV2.feeToken,
      docCommissionSplitterV2.tokenBalanceThreshold,
      docCommissionSplitterV2.feeTokenBalanceThreshold,
    ],
    {
      id: "TaskSplitDocCommissionSplitterV2",
    },
  );
  const flowTriggerOrderTaskRevAuctionRBTCtoMOC_tasksRunner = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionRBTCtoMOC_tasksRunner, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRBTCtoMOC_tasksRunner" },
  );
  const flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionRIFtoMOC_tasksRunner, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRIFtoMOC_tasksRunner" },
  );
  const flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionDOCtoMOC_tasksRunner, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionDOCtoMOC_tasksRunner" },
  );
  const flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionRBTCtoMOC_rocNodes, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRBTCtoMOC_rocNodes" },
  );
  const flowTriggerOrderTaskRevAuctionRIFtoMOC_rocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionRIFtoMOC_rocRewardsBuffer, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRIFtoMOC_rocRewardsBuffer" },
  );
  const flowTriggerOrderTaskRevAuctionMOCtoRIF_rifBucket = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionMOCtoRIF_rifBucket, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionMOCtoRIF_rifBucket" },
  );
  const flowTriggerOrderTaskRevAuctionDOCtoMOC_rocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionDOCtoMOC_rocRewardsBuffer, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionDOCtoMOC_rocRewardsBuffer" },
  );
  const flowTriggerOrderTaskRevAuctionMOCtoDOC_docBucket = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionMOCtoDOC_docBucket, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionMOCtoDOC_docBucket" },
  );
  // ---------------------------------------------------------------------------
  // Stage 4 - TasksRunner Initialization and Proxy
  // ---------------------------------------------------------------------------
  const tasksBeforeRocRewardsBuffer = [
    executeQueueTask,
    updateEmaTaskBucket0,
    updateEmaTaskBucket1,
    executeLiquidationTaskBucket0,
    executeLiquidationTaskBucket1,
    executeMicroLiquidationTaskBucket0,
    executeMicroLiquidationTaskBucket1,
    interestPaymentTaskBucket0,
    interestPaymentTaskBucket1,
    settlementTaskBucket0,
    settlementTaskBucket1,
    refreshAcBalanceTaskBucket0,
    refreshAcBalanceTaskBucket1,
    flowSplitTaskRifCommissionSplitterV2,
    flowSplitTaskRifCommissionSplitterV3,
    flowSplitTaskDocCommissionSplitterV2,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_rocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoRIF_rifBucket,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_rocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoDOC_docBucket,
  ];

  const tasksRunnerProxy = m.contract("ERC1967Proxy", [tasksRunnerImpl, "0x"], {
    id: "TasksRunnerProxy",
  });

  const tasksRunnerContract = m.contractAt("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", tasksRunnerProxy, {
    id: "TasksRunner",
  });

  // ---------------------------------------------------------------------------
  // Stage 5 - Buffers Deployment
  // ---------------------------------------------------------------------------
  const rocRewardsBufferProxy = m.contract("ERC1967Proxy", [bufferTokenImpl, "0x"], {
    id: "RocRewardsBufferProxy",
  });

  const rocRewardsBuffer = m.contractAt("@moc/flow/contracts/BufferToken.sol:BufferToken", rocRewardsBufferProxy, {
    id: "RocRewardsBuffer",
  });

  const flowFlushTaskRocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [rocRewardsBuffer],
    {
      id: "TaskFlushRocRewardsBuffer",
    },
  );
  const flowLiquidateTaskRocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [rocRewardsBuffer],
    {
      id: "TaskLiquidateRocRewardsBuffer",
    },
  );
  const flowFlushTaskRifProRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.rifProRewardsBuffer],
    {
      id: "TaskFlushRifProRewardsBuffer",
    },
  );
  const flowLiquidateTaskRifProRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.rifProRewardsBuffer],
    {
      id: "TaskLiquidateRifProRewardsBuffer",
    },
  );
  const flowFlushTaskRocrRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.rocrRewardsBuffer],
    {
      id: "TaskFlushRocrRewardsBuffer",
    },
  );
  const flowLiquidateTaskRocrRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.rocrRewardsBuffer],
    {
      id: "TaskLiquidateRocrRewardsBuffer",
    },
  );

  const tasks = [
    ...tasksBeforeRocRewardsBuffer,
    flowFlushTaskRocRewardsBuffer,
    flowLiquidateTaskRocRewardsBuffer,
    flowFlushTaskRifProRewardsBuffer,
    flowLiquidateTaskRifProRewardsBuffer,
    flowFlushTaskRocrRewardsBuffer,
    flowLiquidateTaskRocrRewardsBuffer,
  ];

  m.call(
    tasksRunnerContract,
    "initialize",
    [
      core.governor,
      core.name,
      tasks,
      core.mocTokenAddress,
      roundConfig,
      core.oracleManager,
      core.registry,
      tasksRunnerCfg.minOraclesPerRound,
      tasksRunnerParams,
    ],
    {
      id: "InitializeTasksRunner",
    },
  );

  m.call(
    rocNodesBuffer,
    "initialize",
    [
      core.governor,
      core.mocTokenAddress,
      rocNodesBufferCfg.threshold,
      rocNodesBufferCfg.outputs,
      rocNodesBufferCfg.splits,
      rocNodesBufferCfg.outputThresholds,
    ],
    {
      id: "InitializeRocNodesBuffer",
    },
  );

  m.call(
    rocRewardsBuffer,
    "initialize",
    [
      core.governor,
      core.mocTokenAddress,
      rocRewardsBufferCfg.threshold,
      [tasksRunnerContract, core.mocRewardsBuffer],
      [rocRewardsBufferCfg.tasksRunnerSplit, rocRewardsBufferCfg.mocRewardsBufferSplit],
      [rocRewardsBufferCfg.tasksRunnerOutputThreshold, rocRewardsBufferCfg.mocRewardsBufferOutputThreshold],
    ],
    {
      id: "InitializeRocRewardsBuffer",
    },
  );

  // These are the latest implementations that AddTasksRunnerChanger will point
  // the already-upgraded proxies to during the second governance change.
  const mocMultiCollateralGuardLatestImpl = m.contract(
    "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol:MocMultiCollateralGuard",
    [],
    {
      id: "MocMultiCollateralGuardLatestImplementation",
    },
  );

  const mocCoreBucketLatestImpl = m.contract("moc-main-latest/contracts/collateral/rc20/MocCARC20.sol:MocCARC20", [], {
    id: "MocCoreBucketLatestImplementation",
  });

  const mocQueueLatestImpl = m.contract("moc-main-latest/contracts/queue/MocQueue.sol:MocQueue", [], {
    id: "MocQueueLatestImplementation",
  });

  const mocCoreExpansionLatestImpl = m.contract(
    "moc-main-latest/contracts/core/MocCoreExpansion.sol:MocCoreExpansion",
    [],
    {
      id: "MocCoreExpansionLatestImplementation",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 6 - AddTasksRunnerChanger Deployment
  // ---------------------------------------------------------------------------
  const addTasksRunnerChanger = m.contract(
    "AddTasksRunnerChanger",
    [
      core.mocMultiCollateralGuard,
      mocMultiCollateralGuardLatestImpl,
      mocCoreBucketLatestImpl,
      mocCoreBucketLatestImpl,
      mocQueueLatestImpl,
      mocQueueLatestImpl,
      mocCoreExpansionLatestImpl,
      mocCoreExpansionLatestImpl,
      revAuctionRBTCtoMOC_tasksRunner,
      revAuctionRIFtoMOC_tasksRunner,
      revAuctionDOCtoMOC_tasksRunner,
      revAuctionRBTCtoMOC_rocNodes,
      triggerOrderRevAuctions.revAuctionRIFtoMOC_rocRewardsBuffer,
      triggerOrderRevAuctions.revAuctionMOCtoRIF_rifBucket,
      triggerOrderRevAuctions.revAuctionDOCtoMOC_rocRewardsBuffer,
      triggerOrderRevAuctions.revAuctionMOCtoDOC_docBucket,
      bufferTasks.rifProRewardsBuffer,
      bufferTasks.rocrRewardsBuffer,
      rocRewardsBuffer,
      core.registry,
      core.oracleManager,
      tasksRunnerContract,
      core.name,
    ],
    {
      id: "AddTasksRunnerChanger",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 7 - Module Exports
  // ---------------------------------------------------------------------------
  return {
    tasksRunnerImpl,
    tasksRunnerProxy,
    tasksRunner: tasksRunnerContract,
    revAuctionRBTCtoMOC_tasksRunner,
    revAuctionRIFtoMOC_tasksRunner,
    revAuctionDOCtoMOC_tasksRunner,
    revAuctionRBTCtoMOC_rocNodes,
    bufferTokenImpl,
    rocNodesBufferProxy,
    rocNodesBuffer,
    rocRewardsBufferProxy,
    rocRewardsBuffer,
    mocMultiCollateralGuardLatestImpl,
    mocCoreBucketLatestImpl,
    mocQueueLatestImpl,
    mocCoreExpansionLatestImpl,
    executeQueueTask,
    updateEmaTaskBucket0,
    updateEmaTaskBucket1,
    executeLiquidationTaskBucket0,
    executeLiquidationTaskBucket1,
    executeMicroLiquidationTaskBucket0,
    executeMicroLiquidationTaskBucket1,
    interestPaymentTaskBucket0,
    interestPaymentTaskBucket1,
    settlementTaskBucket0,
    settlementTaskBucket1,
    refreshAcBalanceTaskBucket0,
    refreshAcBalanceTaskBucket1,
    flowSplitTaskRifCommissionSplitterV2,
    flowSplitTaskRifCommissionSplitterV3,
    flowSplitTaskDocCommissionSplitterV2,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_rocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoRIF_rifBucket,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_rocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoDOC_docBucket,
    flowFlushTaskRocRewardsBuffer,
    flowLiquidateTaskRocRewardsBuffer,
    flowFlushTaskRifProRewardsBuffer,
    flowLiquidateTaskRifProRewardsBuffer,
    flowFlushTaskRocrRewardsBuffer,
    flowLiquidateTaskRocrRewardsBuffer,
    addTasksRunnerChanger,
  };
});

export default AddTasksRunnerModule;
