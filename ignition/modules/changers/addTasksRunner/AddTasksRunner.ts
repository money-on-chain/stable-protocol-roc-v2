import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition module for TasksRunner deployment.
 *
 * Deploys:
 * 1) TasksRunner implementation
 * 2) Task contracts from @moc/shared:
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
 * 6) RocRewardsBuffer proxy (ERC1967) for MOC distribution to TasksRunner and MocRewardsBuffer
 * 7) AddTasksRunnerChanger configured to apply protocol wiring/upgrade steps
 */
const AddTasksRunnerModule = buildModule("AddTasksRunner", m => {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  // ---------------------------------------------------------------------------
  // Stage 0 - Module Parameters
  // ---------------------------------------------------------------------------
  const core = m.getParameter("core") as unknown as {
    governor: string;
    name: string;
    mocTokenAddress: string;
    oracleManager: string;
    registry: string;
    minOraclesPerRound: bigint;
    mocMultiCollateralGuard: string;
    bucket0: string;
    bucket1: string;
    refreshAcBalanceThreshold: bigint;
    mocRewardsBuffer: string;
  };

  const tasksRunnerCfg = m.getParameter("tasksRunner") as unknown as {
    maxOraclesPerRound: bigint;
    maxSubscribedOraclesPerRound: bigint;
    roundLockPeriod: bigint;
    maxMissedSigRounds: bigint;
    maxTasksPerBatch: bigint;
    tokenToCoinbasePriceProvider: string;
    baseFeeProvider: string;
    sharesCapMultiplier: bigint;
  };

  const flow = m.getParameter("flow") as unknown as {
    revertSleepTime: bigint;
    taskOwner: string;
  };

  const bufferTasks = m.getParameter("bufferTasks") as unknown as {
    rocRewardsBuffer: string;
    rifProRewardsBuffer: string;
  };

  const triggerOrderRevAuctions = m.getParameter("triggerOrderRevAuctions") as unknown as {
    revAuctionRIFtoMOC_rocRewardsBuffer: string;
    revAuctionMOCtoRIF_rifBucket: string;
    revAuctionDOCtoMOC_rocRewardsBuffer: string;
  };

  const rifCommissionSplitterV2 = m.getParameter("rifCommissionSplitterV2") as unknown as {
    commissionSplitter: string;
    token: string;
    feeToken: string;
    tokenBalanceThreshold: bigint;
    feeTokenBalanceThreshold: bigint;
  };

  const rifCommissionSplitterV3 = m.getParameter("rifCommissionSplitterV3") as unknown as {
    commissionSplitter: string;
    token: string;
    feeToken: string;
    tokenBalanceThreshold: bigint;
    feeTokenBalanceThreshold: bigint;
  };

  const docCommissionSplitterV2 = m.getParameter("docCommissionSplitterV2") as unknown as {
    commissionSplitter: string;
    token: string;
    feeToken: string;
    tokenBalanceThreshold: bigint;
    feeTokenBalanceThreshold: bigint;
  };

  const changer = m.getParameter("changer") as unknown as {
    mocMultiCollateralGuardImplementation: string;
    mocCoreBucket0Implementation: string;
    mocCoreBucket1Implementation: string;
    mocQueueBucket0Implementation: string;
    mocQueueBucket1Implementation: string;
    mocCoreExpansionBucket0: string;
    mocCoreExpansionBucket1: string;
  };

  const mocSwapperV3Cfg = m.getParameter("mocSwapperV3") as unknown as {
    pauserAddress: string;
    swapRouterAddress: string;
    coinbaseWrapperAddress: string;
    maxRbtcToMocToSwap: bigint;
    maxMocToRbtcToSwap: bigint;
    rbtcToMocPoolFee: bigint;
    mocToRbtcPoolFee: bigint;
  };

  const reverseAuctions = m.getParameter("reverseAuctions") as unknown as {
    revAuctionRBTCtoMOC_tasksRunner: {
      mocSwapper: string;
      tokenIn: string;
      tokenOut: string;
      orderThreshold: bigint;
      priceProvider: string;
      slippage: bigint;
    };
    revAuctionRIFtoMOC_tasksRunner: {
      mocSwapper: string;
      tokenIn: string;
      tokenOut: string;
      orderThreshold: bigint;
      priceProvider: string;
      slippage: bigint;
    };
    revAuctionDOCtoMOC_tasksRunner: {
      mocSwapper: string;
      tokenIn: string;
      tokenOut: string;
      orderThreshold: bigint;
      priceProvider: string;
      slippage: bigint;
    };
    revAuctionRBTCtoMOC_rocNodes: {
      mocSwapper: string;
      tokenIn: string;
      tokenOut: string;
      orderThreshold: bigint;
      priceProvider: string;
      slippage: bigint;
      outputAccount: string;
    };
  };

  const rocRewardsBufferCfg = m.getParameter("rocRewardsBuffer") as unknown as {
    threshold: bigint;
    tasksRunnerSplit: bigint;
    mocRewardsBufferSplit: bigint;
    tasksRunnerOutputThreshold: bigint;
    mocRewardsBufferOutputThreshold: bigint;
  };

  // ---------------------------------------------------------------------------
  // Stage 1 - TasksRunner Base Deployment
  // ---------------------------------------------------------------------------
  const tasksRunnerImpl = m.contract("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", [], {
    id: "TasksRunnerImplementation",
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
    baseFeeProvider: tasksRunnerCfg.baseFeeProvider,
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
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.outputAccount,
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
    "@moc/shared/contracts/tasks/v3/TaskExecuteQueueV3.sol:TaskExecuteQueueV3",
    [core.mocMultiCollateralGuard],
    { id: "TaskExecuteQueueV3" },
  );

  const updateEmaTaskBucket0 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskUpdateEmaV3.sol:TaskUpdateEmaV3",
    [core.bucket0],
    {
      id: "TaskUpdateEmaV3Bucket0",
    },
  );
  const updateEmaTaskBucket1 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskUpdateEmaV3.sol:TaskUpdateEmaV3",
    [core.bucket1],
    {
      id: "TaskUpdateEmaV3Bucket1",
    },
  );

  const executeLiquidationTaskBucket0 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskExecuteLiquidationV3.sol:TaskExecuteLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket0],
    { id: "TaskExecuteLiquidationV3Bucket0" },
  );
  const executeLiquidationTaskBucket1 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskExecuteLiquidationV3.sol:TaskExecuteLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket1],
    { id: "TaskExecuteLiquidationV3Bucket1" },
  );

  const executeMicroLiquidationTaskBucket0 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol:TaskExecuteMicroLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket0],
    { id: "TaskExecuteMicroLiquidationV3Bucket0" },
  );
  const executeMicroLiquidationTaskBucket1 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol:TaskExecuteMicroLiquidationV3",
    [core.mocMultiCollateralGuard, core.bucket1],
    { id: "TaskExecuteMicroLiquidationV3Bucket1" },
  );

  const interestPaymentTaskBucket0 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskInterestPaymentV3.sol:TaskInterestPaymentV3",
    [core.bucket0],
    { id: "TaskInterestPaymentV3Bucket0" },
  );
  const interestPaymentTaskBucket1 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskInterestPaymentV3.sol:TaskInterestPaymentV3",
    [core.bucket1],
    { id: "TaskInterestPaymentV3Bucket1" },
  );

  const settlementTaskBucket0 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskSettlementV3.sol:TaskSettlementV3",
    [core.bucket0],
    {
      id: "TaskSettlementV3Bucket0",
    },
  );
  const settlementTaskBucket1 = m.contract(
    "@moc/shared/contracts/tasks/v3/TaskSettlementV3.sol:TaskSettlementV3",
    [core.bucket1],
    {
      id: "TaskSettlementV3Bucket1",
    },
  );

  const refreshAcBalanceTaskBucket0 = m.contract(
    "@moc/shared/contracts/tasks/v2v3/TaskRefreshACBalanceV2V3.sol:TaskRefreshACBalanceV2V3",
    [core.bucket0, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV2V3Bucket0" },
  );
  const refreshAcBalanceTaskBucket1 = m.contract(
    "@moc/shared/contracts/tasks/v2v3/TaskRefreshACBalanceV2V3.sol:TaskRefreshACBalanceV2V3",
    [core.bucket1, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV2V3Bucket1" },
  );

  // 3.2 - Flow tasks (split, trigger-order, flush, liquidate)
  const flowSplitTaskRifCommissionSplitterV2 = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
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
    "@moc/shared/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
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
    "@moc/shared/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol:TaskSplit",
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
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionRBTCtoMOC_tasksRunner, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRBTCtoMOC_tasksRunner" },
  );
  const flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionRIFtoMOC_tasksRunner, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRIFtoMOC_tasksRunner" },
  );
  const flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionDOCtoMOC_tasksRunner, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionDOCtoMOC_tasksRunner" },
  );
  const flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [revAuctionRBTCtoMOC_rocNodes, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRBTCtoMOC_rocNodes" },
  );
  const flowTriggerOrderTaskRevAuctionRIFtoMOC_rocRewardsBuffer = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionRIFtoMOC_rocRewardsBuffer, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionRIFtoMOC_rocRewardsBuffer" },
  );
  const flowTriggerOrderTaskRevAuctionMOCtoRIF_rifBucket = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionMOCtoRIF_rifBucket, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionMOCtoRIF_rifBucket" },
  );
  const flowTriggerOrderTaskRevAuctionDOCtoMOC_rocRewardsBuffer = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [triggerOrderRevAuctions.revAuctionDOCtoMOC_rocRewardsBuffer, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderRevAuctionDOCtoMOC_rocRewardsBuffer" },
  );
  const flowFlushTaskRocRewardsBuffer = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.rocRewardsBuffer],
    {
      id: "TaskFlushRocRewardsBuffer",
    },
  );
  const flowLiquidateTaskRocRewardsBuffer = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.rocRewardsBuffer],
    {
      id: "TaskLiquidateRocRewardsBuffer",
    },
  );
  const flowFlushTaskRifProRewardsBuffer = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush",
    [bufferTasks.rifProRewardsBuffer],
    {
      id: "TaskFlushRifProRewardsBuffer",
    },
  );
  const flowLiquidateTaskRifProRewardsBuffer = m.contract(
    "@moc/shared/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.rifProRewardsBuffer],
    {
      id: "TaskLiquidateRifProRewardsBuffer",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 4 - TasksRunner Initialization and Proxy
  // ---------------------------------------------------------------------------
  const tasks = [
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
    flowFlushTaskRocRewardsBuffer,
    flowLiquidateTaskRocRewardsBuffer,
    flowFlushTaskRifProRewardsBuffer,
    flowLiquidateTaskRifProRewardsBuffer,
  ];

  const initData = m.encodeFunctionCall(tasksRunnerImpl, "initialize", [
    core.governor,
    core.name,
    tasks,
    core.mocTokenAddress,
    roundConfig,
    core.oracleManager,
    core.registry,
    core.minOraclesPerRound,
    tasksRunnerParams,
  ]);

  const tasksRunnerProxy = m.contract("ERC1967Proxy", [tasksRunnerImpl, initData], {
    id: "TasksRunnerProxy",
  });

  const tasksRunnerContract = m.contractAt("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", tasksRunnerProxy, {
    id: "TasksRunner",
  });

  // ---------------------------------------------------------------------------
  // Stage 5 - RocRewardsBuffer Deployment
  // ---------------------------------------------------------------------------
  const rocRewardsBufferImpl = m.contract("@moc/flow/contracts/BufferToken.sol:BufferToken", [], {
    id: "RocRewardsBufferImplementation",
  });

  const rocRewardsBufferInitData = m.encodeFunctionCall(rocRewardsBufferImpl, "initialize", [
    core.governor,
    core.mocTokenAddress,
    rocRewardsBufferCfg.threshold,
    [tasksRunnerContract, core.mocRewardsBuffer],
    [rocRewardsBufferCfg.tasksRunnerSplit, rocRewardsBufferCfg.mocRewardsBufferSplit],
    [rocRewardsBufferCfg.tasksRunnerOutputThreshold, rocRewardsBufferCfg.mocRewardsBufferOutputThreshold],
  ]);

  const rocRewardsBufferProxy = m.contract("ERC1967Proxy", [rocRewardsBufferImpl, rocRewardsBufferInitData], {
    id: "RocRewardsBufferProxy",
  });

  const rocRewardsBuffer = m.contractAt("@moc/flow/contracts/BufferToken.sol:BufferToken", rocRewardsBufferProxy, {
    id: "RocRewardsBuffer",
  });

  // ---------------------------------------------------------------------------
  // Stage 6 - MocSwapperV3 Deployment (RBTC <-> MOC)
  // ---------------------------------------------------------------------------
  const mocSwapperV3Impl = m.contract("MocSwapperV3", [], {
    id: "MocSwapperV3Implementation",
  });

  const mocSwapperV3InitData = m.encodeFunctionCall(mocSwapperV3Impl, "initialize", [
    core.governor,
    mocSwapperV3Cfg.pauserAddress,
    mocSwapperV3Cfg.swapRouterAddress,
    mocSwapperV3Cfg.coinbaseWrapperAddress,
  ]);

  const mocSwapperV3Proxy = m.contract("ERC1967Proxy", [mocSwapperV3Impl, mocSwapperV3InitData], {
    id: "MocSwapperV3Proxy",
  });

  const mocSwapperV3 = m.contractAt("MocSwapperV3", mocSwapperV3Proxy, {
    id: "MocSwapperV3",
  });

  const maxRbtcToMocProvider = m.contract(
    "DataProvider",
    [mocSwapperV3Cfg.pauserAddress, mocSwapperV3Cfg.maxRbtcToMocToSwap],
    {
      id: "MaxRbtcToMocProvider",
    },
  );

  const maxMocToRbtcProvider = m.contract(
    "DataProvider",
    [mocSwapperV3Cfg.pauserAddress, mocSwapperV3Cfg.maxMocToRbtcToSwap],
    {
      id: "MaxMocToRbtcProvider",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 7 - AddTasksRunnerChanger Deployment
  // ---------------------------------------------------------------------------
  const addTasksRunnerChanger = m.contract(
    "AddTasksRunnerChanger",
    [
      core.mocMultiCollateralGuard,
      changer.mocMultiCollateralGuardImplementation,
      changer.mocCoreBucket0Implementation,
      changer.mocCoreBucket1Implementation,
      changer.mocQueueBucket0Implementation,
      changer.mocQueueBucket1Implementation,
      changer.mocCoreExpansionBucket0,
      changer.mocCoreExpansionBucket1,
      revAuctionRBTCtoMOC_tasksRunner,
      revAuctionRIFtoMOC_tasksRunner,
      revAuctionDOCtoMOC_tasksRunner,
      revAuctionRBTCtoMOC_rocNodes,
      triggerOrderRevAuctions.revAuctionRIFtoMOC_rocRewardsBuffer,
      triggerOrderRevAuctions.revAuctionMOCtoRIF_rifBucket,
      triggerOrderRevAuctions.revAuctionDOCtoMOC_rocRewardsBuffer,
      rifCommissionSplitterV2.commissionSplitter,
      bufferTasks.rifProRewardsBuffer,
      mocSwapperV3,
      core.mocTokenAddress,
      maxRbtcToMocProvider,
      maxMocToRbtcProvider,
      mocSwapperV3Cfg.rbtcToMocPoolFee,
      mocSwapperV3Cfg.mocToRbtcPoolFee,
      rocRewardsBuffer,
      core.registry,
      core.oracleManager,
      tasksRunnerContract,
    ],
    {
      id: "AddTasksRunnerChanger",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 8 - Module Exports
  // ---------------------------------------------------------------------------
  return {
    tasksRunnerImpl,
    tasksRunnerProxy,
    tasksRunner: tasksRunnerContract,
    revAuctionRBTCtoMOC_tasksRunner,
    revAuctionRIFtoMOC_tasksRunner,
    revAuctionDOCtoMOC_tasksRunner,
    revAuctionRBTCtoMOC_rocNodes,
    rocRewardsBufferImpl,
    rocRewardsBufferProxy,
    rocRewardsBuffer,
    mocSwapperV3Impl,
    mocSwapperV3Proxy,
    mocSwapperV3,
    maxRbtcToMocProvider,
    maxMocToRbtcProvider,
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
    flowFlushTaskRocRewardsBuffer,
    flowLiquidateTaskRocRewardsBuffer,
    flowFlushTaskRifProRewardsBuffer,
    flowLiquidateTaskRifProRewardsBuffer,
    addTasksRunnerChanger,
  };
});

export default AddTasksRunnerModule;
