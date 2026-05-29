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
 *      TaskRefreshACBalanceV3 (bucket0/bucket1)
 *    - Flow: TaskSplit, TaskTriggerOrder, TaskFlush, TaskLiquidate
 * 3) Encodes and executes TasksRunner.initialize(...) on ERC1967 proxy deployment
 *    using all deployed task addresses (in the order defined in this module)
 * 4) TasksRunner proxy (ERC1967)
 * 5) Four MocReverseAuction contracts used as fee recipients in AddTasksRunnerChanger
 * 6) RocNodesBuffer proxy (ERC1967) for MOC distribution from roc-nodes reverse auction
 * 7) AddTasksRunnerChanger configured to apply protocol wiring/upgrade steps
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

  const v1Tasks = {
    mocV1: getParameter<string>("v1Tasks.mocV1"),
    mocStateV1: getParameter<string>("v1Tasks.mocStateV1"),
  };

  const coinerTasks = {
    coiner: getParameter<string>("coinerTasks.coiner"),
  };

  const oracleTasks = {
    coinPair: getParameter<string>("oracleTasks.coinPair"),
    supporters: getParameter<string>("oracleTasks.supporters"),
  };

  const bufferTasks = {
    rifProRewardsBuffer: getParameter<string>("bufferTasks.rifProRewardsBuffer"),
    rocrRewardsBuffer: getParameter<string>("bufferTasks.rocrRewardsBuffer"),
    bitProRewardsBuffer: getParameter<string>("bufferTasks.bitProRewardsBuffer"),
    bproRewardsBuffer: getParameter<string>("bufferTasks.bproRewardsBuffer"),
    mocRewardsBuffer: getParameter<string>("bufferTasks.mocRewardsBuffer"),
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
    revAuctionRBTCtoMOC_mocRewardsBuffer: getParameter<string>(
      "triggerOrderRevAuctions.revAuctionRBTCtoMOC_mocRewardsBuffer",
    ),
    revAuctionMOCtoRBTC_mocV1: getParameter<string>("triggerOrderRevAuctions.revAuctionMOCtoRBTC_mocV1"),
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
  const mocCommissionSplitterV2 = {
    commissionSplitter: getParameter<string>("mocCommissionSplitterV2.commissionSplitter"),
    token: getParameter<string>("mocCommissionSplitterV2.token"),
    feeToken: getParameter<string>("mocCommissionSplitterV2.feeToken"),
    tokenBalanceThreshold: getParameter<bigint>("mocCommissionSplitterV2.tokenBalanceThreshold"),
    feeTokenBalanceThreshold: getParameter<bigint>("mocCommissionSplitterV2.feeTokenBalanceThreshold"),
  };

  const mocCommissionSplitterV3 = {
    commissionSplitter: getParameter<string>("mocCommissionSplitterV3.commissionSplitter"),
    token: getParameter<string>("mocCommissionSplitterV3.token"),
    feeToken: getParameter<string>("mocCommissionSplitterV3.feeToken"),
    tokenBalanceThreshold: getParameter<bigint>("mocCommissionSplitterV3.tokenBalanceThreshold"),
    feeTokenBalanceThreshold: getParameter<bigint>("mocCommissionSplitterV3.feeTokenBalanceThreshold"),
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
  // 3.1 - V1 tasks
  const updateEmaTaskV1 = m.contract(
    "@moc/oracles/contracts/tasks/v1/TaskUpdateEmaV1.sol:TaskUpdateEmaV1",
    [v1Tasks.mocStateV1],
    {
      id: "TaskUpdateEmaV1",
    },
  );
  const dailyInratePaymentTaskV1 = m.contract(
    "@moc/oracles/contracts/tasks/v1/TaskDailyInratePaymentV1.sol:TaskDailyInratePaymentV1",
    [v1Tasks.mocV1],
    {
      id: "TaskDailyInratePaymentV1",
    },
  );
  const evalLiquidationTaskV1 = m.contract(
    "@moc/oracles/contracts/tasks/v1/TaskEvalLiquidationV1.sol:TaskEvalLiquidationV1",
    [v1Tasks.mocV1, v1Tasks.mocStateV1],
    {
      id: "TaskEvalLiquidationV1",
    },
  );
  const interestPaymentTaskV1 = m.contract(
    "@moc/oracles/contracts/tasks/v1/TaskInterestPaymentV1.sol:TaskInterestPaymentV1",
    [v1Tasks.mocV1],
    {
      id: "TaskInterestPaymentV1",
    },
  );
  const settlementTaskV1 = m.contract(
    "@moc/oracles/contracts/tasks/v1/TaskSettlementV1.sol:TaskSettlementV1",
    [v1Tasks.mocV1],
    {
      id: "TaskSettlementV1",
    },
  );

  // 3.2 - Coiner and oracle tasks
  const mintStepTask = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/coiner/TaskMintStep.sol:TaskMintStep",
    [coinerTasks.coiner],
    {
      id: "TaskMintStep",
    },
  );
  const switchRoundCoinPairTask = m.contract(
    "@moc/oracles/contracts/tasks/oracles/TaskSwitchRoundCoinPair.sol:TaskSwitchRoundCoinPair",
    [oracleTasks.coinPair],
    {
      id: "TaskSwitchRoundCoinPair",
    },
  );
  const distributeSupportersTask = m.contract(
    "@moc/oracles/contracts/tasks/oracles/TaskDistributeSupporters.sol:TaskDistributeSupporters",
    [oracleTasks.supporters],
    {
      id: "TaskDistributeSupporters",
    },
  );

  // 3.3 - V3 operational tasks
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
    "@moc/oracles/contracts/tasks/v3/TaskRefreshACBalanceV3.sol:TaskRefreshACBalanceV3",
    [core.bucket0, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV3Bucket0" },
  );
  const refreshAcBalanceTaskBucket1 = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskRefreshACBalanceV3.sol:TaskRefreshACBalanceV3",
    [core.bucket1, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV3Bucket1" },
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
  const flowSplitTaskMocCommissionSplitterV2 = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
    [
      mocCommissionSplitterV2.commissionSplitter,
      mocCommissionSplitterV2.token,
      mocCommissionSplitterV2.feeToken,
      mocCommissionSplitterV2.tokenBalanceThreshold,
      mocCommissionSplitterV2.feeTokenBalanceThreshold,
    ],
    {
      id: "TaskSplitMocCommissionSplitterV2",
    },
  );
  const flowSplitTaskMocCommissionSplitterV3 = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
    [
      mocCommissionSplitterV3.commissionSplitter,
      mocCommissionSplitterV3.token,
      mocCommissionSplitterV3.feeToken,
      mocCommissionSplitterV3.tokenBalanceThreshold,
      mocCommissionSplitterV3.feeTokenBalanceThreshold,
    ],
    {
      id: "TaskSplitMocCommissionSplitterV3",
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
  const flowTriggerOrderTaskRevAuctionRBTCtoMOC_mocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionRBTCtoMOC_mocRewardsBuffer, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRBTCtoMOC_mocRewardsBuffer" },
  );
  const flowTriggerOrderTaskRevAuctionMOCtoRBTC_mocV1 = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionMOCtoRBTC_mocV1, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionMOCtoRBTC_mocV1" },
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
  const flowFlushTaskBitProRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.bitProRewardsBuffer],
    {
      id: "TaskFlushBitProRewardsBuffer",
    },
  );
  const flowFlushTaskBproRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.bproRewardsBuffer],
    {
      id: "TaskFlushBproRewardsBuffer",
    },
  );
  const flowLiquidateTaskBproRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.bproRewardsBuffer],
    {
      id: "TaskLiquidateBproRewardsBuffer",
    },
  );
  const flowFlushTaskMocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.mocRewardsBuffer],
    {
      id: "TaskFlushMocRewardsBuffer",
    },
  );
  const flowLiquidateTaskMocRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.mocRewardsBuffer],
    {
      id: "TaskLiquidateMocRewardsBuffer",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 4 - TasksRunner Deployment and Initialization
  // ---------------------------------------------------------------------------
  const tasks = [
    updateEmaTaskV1,
    dailyInratePaymentTaskV1,
    evalLiquidationTaskV1,
    interestPaymentTaskV1,
    settlementTaskV1,
    mintStepTask,
    switchRoundCoinPairTask,
    distributeSupportersTask,
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
    flowSplitTaskMocCommissionSplitterV2,
    flowSplitTaskMocCommissionSplitterV3,
    flowSplitTaskMocCommissionSplitterV2,
    flowSplitTaskMocCommissionSplitterV3,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_rocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoRIF_rifBucket,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_rocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoDOC_docBucket,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_mocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoRBTC_mocV1,
    flowFlushTaskRifProRewardsBuffer,
    flowLiquidateTaskRifProRewardsBuffer,
    flowFlushTaskRocrRewardsBuffer,
    flowLiquidateTaskRocrRewardsBuffer,
    flowFlushTaskBitProRewardsBuffer,
    flowFlushTaskBproRewardsBuffer,
    flowLiquidateTaskBproRewardsBuffer,
    flowFlushTaskMocRewardsBuffer,
    flowLiquidateTaskMocRewardsBuffer,
  ];

  const tasksRunnerProxy = m.contract("ERC1967Proxy", [tasksRunnerImpl, "0x"], {
    id: "TasksRunnerProxy",
  });

  const tasksRunnerContract = m.contractAt("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", tasksRunnerProxy, {
    id: "TasksRunner",
  });

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
  // Stage 5 - AddTasksRunnerChanger Deployment
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
      triggerOrderRevAuctions.revAuctionRBTCtoMOC_mocRewardsBuffer,
      triggerOrderRevAuctions.revAuctionMOCtoRBTC_mocV1,
      bufferTasks.rifProRewardsBuffer,
      bufferTasks.rocrRewardsBuffer,
      bufferTasks.bitProRewardsBuffer,
      bufferTasks.bproRewardsBuffer,
      bufferTasks.mocRewardsBuffer,
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
  // Stage 6 - Module Exports
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
    mocMultiCollateralGuardLatestImpl,
    mocCoreBucketLatestImpl,
    mocQueueLatestImpl,
    mocCoreExpansionLatestImpl,
    executeQueueTask,
    updateEmaTaskV1,
    dailyInratePaymentTaskV1,
    evalLiquidationTaskV1,
    interestPaymentTaskV1,
    settlementTaskV1,
    mintStepTask,
    switchRoundCoinPairTask,
    distributeSupportersTask,
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
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_mocRewardsBuffer,
    flowTriggerOrderTaskRevAuctionMOCtoRBTC_mocV1,
    flowFlushTaskRifProRewardsBuffer,
    flowLiquidateTaskRifProRewardsBuffer,
    flowFlushTaskRocrRewardsBuffer,
    flowLiquidateTaskRocrRewardsBuffer,
    flowFlushTaskBitProRewardsBuffer,
    flowFlushTaskBproRewardsBuffer,
    flowLiquidateTaskBproRewardsBuffer,
    flowFlushTaskMocRewardsBuffer,
    flowLiquidateTaskMocRewardsBuffer,
    addTasksRunnerChanger,
  };
});

export default AddTasksRunnerModule;
