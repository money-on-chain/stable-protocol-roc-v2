import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition module for AddTasksRunner changer deployment.
 *
 * Deploys:
 * 1) Replacement RIF-derived price providers (using the already-deployed RIF/USD CoinPair)
 * 2) Reverse auctions and buffers needed for TasksRunner / oracle funding flows
 *    - includes flow tasks for the dedicated RIF-oracle fee-routing auctions and buffers
 *    - includes flow tasks for the shared price-updates beneficiary buffer
 * 3) Task contracts from @moc/oracles
 * 4) Deploys AddTasksRunnerChanger configured to apply protocol wiring/upgrade steps,
 *    passing all deployed tasks to be added to the already-deployed TasksRunner
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
    mocTokenAddress: getParameter<string>("core.mocTokenAddress"),
    registry: getParameter<string>("core.registry"),
    mocMultiCollateralGuard: getParameter<string>("core.mocMultiCollateralGuard"),
    rifBucket: getParameter<string>("core.rifBucket"),
    docBucket: getParameter<string>("core.docBucket"),
    refreshAcBalanceThreshold: getParameter<bigint>("core.refreshAcBalanceThreshold"),
    proxyAdmin: getParameter<string>("core.proxyAdmin"),
  };

  const tasksRunnerAddress = getParameter<string>("tasksRunner");
  const rifUsdCoinPairAddress = getParameter<string>("rifUsdCoinPair");

  const rifDerived = {
    rifToRbtcDivisor: getParameter<string>("rifDerived.rifToRbtcDivisor"),
    mocToRifBaseProvider: getParameter<string>("rifDerived.mocToRifBaseProvider"),
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
    swapRifFeesToMocForRifOracle: {
      mocSwapper: getParameter<string>("reverseAuctions.swapRifFeesToMocForRifOracle.mocSwapper"),
      tokenIn: getParameter<string>("reverseAuctions.swapRifFeesToMocForRifOracle.tokenIn"),
      tokenOut: getParameter<string>("reverseAuctions.swapRifFeesToMocForRifOracle.tokenOut"),
      orderThreshold: getParameter<bigint>("reverseAuctions.swapRifFeesToMocForRifOracle.orderThreshold"),
      priceProvider: getParameter<string>("reverseAuctions.swapRifFeesToMocForRifOracle.priceProvider"),
      slippage: getParameter<bigint>("reverseAuctions.swapRifFeesToMocForRifOracle.slippage"),
    },
    swapDocFeesToMocForRifOracle: {
      mocSwapper: getParameter<string>("reverseAuctions.swapDocFeesToMocForRifOracle.mocSwapper"),
      tokenIn: getParameter<string>("reverseAuctions.swapDocFeesToMocForRifOracle.tokenIn"),
      tokenOut: getParameter<string>("reverseAuctions.swapDocFeesToMocForRifOracle.tokenOut"),
      orderThreshold: getParameter<bigint>("reverseAuctions.swapDocFeesToMocForRifOracle.orderThreshold"),
      priceProvider: getParameter<string>("reverseAuctions.swapDocFeesToMocForRifOracle.priceProvider"),
      slippage: getParameter<bigint>("reverseAuctions.swapDocFeesToMocForRifOracle.slippage"),
    },
  };

  const oracleFunding = {
    mimLabsMultisig: getParameter<string>("oracleFunding.mimLabsMultisig"),
  };

  const oracleFundingBuffers = {
    splitRifFeesToFoundationAndRifOracle: {
      threshold: getParameter<bigint>("oracleFundingBuffers.splitRifFeesToFoundationAndRifOracle.threshold"),
      splits: getParameter<bigint[]>("oracleFundingBuffers.splitRifFeesToFoundationAndRifOracle.splits"),
      outputThresholds: getParameter<bigint[]>(
        "oracleFundingBuffers.splitRifFeesToFoundationAndRifOracle.outputThresholds",
      ),
    },
    splitDocFeesToFoundationAndRifOracle: {
      threshold: getParameter<bigint>("oracleFundingBuffers.splitDocFeesToFoundationAndRifOracle.threshold"),
      splits: getParameter<bigint[]>("oracleFundingBuffers.splitDocFeesToFoundationAndRifOracle.splits"),
      outputThresholds: getParameter<bigint[]>(
        "oracleFundingBuffers.splitDocFeesToFoundationAndRifOracle.outputThresholds",
      ),
    },
    splitMocFeesToFoundationAndRifOracle: {
      threshold: getParameter<bigint>("oracleFundingBuffers.splitMocFeesToFoundationAndRifOracle.threshold"),
      splits: getParameter<bigint[]>("oracleFundingBuffers.splitMocFeesToFoundationAndRifOracle.splits"),
      outputThresholds: getParameter<bigint[]>(
        "oracleFundingBuffers.splitMocFeesToFoundationAndRifOracle.outputThresholds",
      ),
    },
    tasksRunner: {
      threshold: getParameter<bigint>("oracleFundingBuffers.tasksRunner.threshold"),
      splits: getParameter<bigint[]>("oracleFundingBuffers.tasksRunner.splits"),
      outputThresholds: getParameter<bigint[]>("oracleFundingBuffers.tasksRunner.outputThresholds"),
    },
    splitPriceUpdateFeesToBtcOracleAndRifOracle: {
      threshold: getParameter<bigint>("oracleFundingBuffers.splitPriceUpdateFeesToBtcOracleAndRifOracle.threshold"),
      splits: getParameter<bigint[]>("oracleFundingBuffers.splitPriceUpdateFeesToBtcOracleAndRifOracle.splits"),
      outputThresholds: getParameter<bigint[]>(
        "oracleFundingBuffers.splitPriceUpdateFeesToBtcOracleAndRifOracle.outputThresholds",
      ),
    },
  };

  const queueExecutionCosts = {
    rifBucket: getParameter<bigint[]>("queueExecutionCosts.rifBucket"),
    docBucket: getParameter<bigint[]>("queueExecutionCosts.docBucket"),
  };

  const mocRewardsBufferCfg = {
    btcUsdOutputIndex: getParameter<bigint>("mocRewardsBuffer.btcUsdOutputIndex"),
  };

  const rifBucketUsdrifTargetEma = getParameter<bigint>("rifBucketUsdrifTargetEma");

  // ---------------------------------------------------------------------------
  // Stage 1 - Base Deployments
  // ---------------------------------------------------------------------------
  const tasksRunnerContract = m.contractAt("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", tasksRunnerAddress, {
    id: "TasksRunner",
  });

  const bufferTokenImpl = m.contract("@moc/flow/contracts/BufferToken.sol:BufferToken", [], {
    id: "BufferTokenImplementation",
  });

  const rifOracleCoinPair = m.contractAt(
    "@moc/oracles/contracts/CoinPairPrice.sol:CoinPairPrice",
    rifUsdCoinPairAddress,
    {
      id: "RifOracleCoinPair",
    },
  );

  const rifToRbtcPriceProvider = m.contract(
    "@moc/price-oracle-interfaces/contracts/PriceProviderDiv.sol:PriceProviderDiv",
    [rifOracleCoinPair, rifDerived.rifToRbtcDivisor],
    { id: "RifToRbtcPriceProvider" },
  );

  const mocToRifPriceProvider = m.contract(
    "@moc/price-oracle-interfaces/contracts/PriceProviderDiv.sol:PriceProviderDiv",
    [rifDerived.mocToRifBaseProvider, rifOracleCoinPair],
    { id: "MocToRifPriceProvider" },
  );

  const rifToMocPriceProvider = m.contract(
    "@moc/price-oracle-interfaces/contracts/PriceProviderInverse.sol:PriceProviderInverse",
    [mocToRifPriceProvider],
    { id: "RifToMocPriceProvider" },
  );

  // ---------------------------------------------------------------------------
  // Stage 2 - Reverse Auctions for Fee Routing
  // ---------------------------------------------------------------------------
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
      rifToMocPriceProvider,
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

  const swapRifFeesToMocForRifOracle = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.swapRifFeesToMocForRifOracle.mocSwapper,
      reverseAuctions.swapRifFeesToMocForRifOracle.tokenIn,
      reverseAuctions.swapRifFeesToMocForRifOracle.tokenOut,
      rifOracleCoinPair,
      reverseAuctions.swapRifFeesToMocForRifOracle.orderThreshold,
      rifToMocPriceProvider,
      reverseAuctions.swapRifFeesToMocForRifOracle.slippage,
    ],
    { id: "SwapRifFeesToMocForRifOracle" },
  );

  const swapDocFeesToMocForRifOracle = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.swapDocFeesToMocForRifOracle.mocSwapper,
      reverseAuctions.swapDocFeesToMocForRifOracle.tokenIn,
      reverseAuctions.swapDocFeesToMocForRifOracle.tokenOut,
      rifOracleCoinPair,
      reverseAuctions.swapDocFeesToMocForRifOracle.orderThreshold,
      reverseAuctions.swapDocFeesToMocForRifOracle.priceProvider,
      reverseAuctions.swapDocFeesToMocForRifOracle.slippage,
    ],
    { id: "SwapDocFeesToMocForRifOracle" },
  );

  // ---------------------------------------------------------------------------
  // Stage 3 - New Buffer Deployments
  // ---------------------------------------------------------------------------
  const makeBufferAndTasks = ({
    name,
    token,
    threshold,
    outputs,
    splits,
    outputThresholds,
  }: {
    name: string;
    token: unknown;
    threshold: bigint;
    outputs: readonly unknown[];
    splits: readonly bigint[];
    outputThresholds: readonly bigint[];
  }) => {
    const proxy = m.contract("TransparentUpgradeableProxy", [bufferTokenImpl, core.proxyAdmin, "0x"], {
      id: `${name}Proxy`,
    });
    const buffer = m.contractAt("@moc/flow/contracts/BufferToken.sol:BufferToken", proxy, {
      id: name,
    });

    m.call(buffer, "initialize", [core.governor, token, threshold, outputs, splits, outputThresholds], {
      id: `Initialize${name}`,
    });

    const flushTask = m.contract("@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol:TaskFlush", [buffer], {
      id: `TaskFlush${name}`,
    });
    const liquidateTask = m.contract(
      "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
      [buffer],
      { id: `TaskLiquidate${name}` },
    );

    return { proxy, buffer, tasks: [flushTask, liquidateTask] as const };
  };

  const splitRifFeesToFoundationAndRifOracle = makeBufferAndTasks({
    name: "SplitRifFeesToFoundationAndRifOracle",
    token: rifCommissionSplitterV2.token,
    threshold: oracleFundingBuffers.splitRifFeesToFoundationAndRifOracle.threshold,
    outputs: [oracleFunding.mimLabsMultisig, swapRifFeesToMocForRifOracle],
    splits: oracleFundingBuffers.splitRifFeesToFoundationAndRifOracle.splits,
    outputThresholds: oracleFundingBuffers.splitRifFeesToFoundationAndRifOracle.outputThresholds,
  });
  const splitDocFeesToFoundationAndRifOracle = makeBufferAndTasks({
    name: "SplitDocFeesToFoundationAndRifOracle",
    token: docCommissionSplitterV2.token,
    threshold: oracleFundingBuffers.splitDocFeesToFoundationAndRifOracle.threshold,
    outputs: [oracleFunding.mimLabsMultisig, swapDocFeesToMocForRifOracle],
    splits: oracleFundingBuffers.splitDocFeesToFoundationAndRifOracle.splits,
    outputThresholds: oracleFundingBuffers.splitDocFeesToFoundationAndRifOracle.outputThresholds,
  });
  const splitMocFeesToFoundationAndRifOracle = makeBufferAndTasks({
    name: "SplitMocFeesToFoundationAndRifOracle",
    token: core.mocTokenAddress,
    threshold: oracleFundingBuffers.splitMocFeesToFoundationAndRifOracle.threshold,
    outputs: [oracleFunding.mimLabsMultisig, rifOracleCoinPair],
    splits: oracleFundingBuffers.splitMocFeesToFoundationAndRifOracle.splits,
    outputThresholds: oracleFundingBuffers.splitMocFeesToFoundationAndRifOracle.outputThresholds,
  });
  const splitMocRewardsToBtcOracleAndTasksRunner = makeBufferAndTasks({
    name: "SplitMocRewardsToBtcOracleAndTasksRunner",
    token: core.mocTokenAddress,
    threshold: oracleFundingBuffers.tasksRunner.threshold,
    outputs: [oracleTasks.coinPair, tasksRunnerContract],
    splits: oracleFundingBuffers.tasksRunner.splits,
    outputThresholds: oracleFundingBuffers.tasksRunner.outputThresholds,
  });
  const splitPriceUpdateFeesToBtcOracleAndRifOracle = makeBufferAndTasks({
    name: "SplitPriceUpdateFeesToBtcOracleAndRifOracle",
    token: core.mocTokenAddress,
    threshold: oracleFundingBuffers.splitPriceUpdateFeesToBtcOracleAndRifOracle.threshold,
    outputs: [oracleTasks.coinPair, rifOracleCoinPair],
    splits: oracleFundingBuffers.splitPriceUpdateFeesToBtcOracleAndRifOracle.splits,
    outputThresholds: oracleFundingBuffers.splitPriceUpdateFeesToBtcOracleAndRifOracle.outputThresholds,
  });

  // ---------------------------------------------------------------------------
  // Stage 4 - Queue Price-Updates Reverse Auction
  // ---------------------------------------------------------------------------
  const revAuctionRBTCtoMOC_rocNodes = m.contract(
    "MocReverseAuction",
    [
      core.governor,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.mocSwapper,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.tokenIn,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.tokenOut,
      splitPriceUpdateFeesToBtcOracleAndRifOracle.buffer,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.orderThreshold,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.priceProvider,
      reverseAuctions.revAuctionRBTCtoMOC_rocNodes.slippage,
    ],
    { id: "RevAuctionRBTCtoMOC_rocNodes" },
  );

  // ---------------------------------------------------------------------------
  // Stage 5 - Task Contracts Deployment
  // ---------------------------------------------------------------------------
  const updateEmaTaskV1 = m.contract(
    "@moc/oracles/contracts/tasks/v1/TaskUpdateEmaV1.sol:TaskUpdateEmaV1",
    [v1Tasks.mocStateV1],
    {
      id: "TaskUpdateEmaV1",
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

  const executeQueueTask = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteQueueV3.sol:TaskExecuteQueueV3",
    [core.mocMultiCollateralGuard],
    { id: "TaskExecuteQueueV3" },
  );

  const updateEmaTaskRifBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskUpdateEmaV3.sol:TaskUpdateEmaV3",
    [core.rifBucket],
    {
      id: "TaskUpdateEmaV3RifBucket",
    },
  );
  const updateEmaTaskDocBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskUpdateEmaV3.sol:TaskUpdateEmaV3",
    [core.docBucket],
    {
      id: "TaskUpdateEmaV3DocBucket",
    },
  );

  const executeLiquidationTaskRifBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteLiquidationV3.sol:TaskExecuteLiquidationV3",
    [core.mocMultiCollateralGuard, core.rifBucket],
    { id: "TaskExecuteLiquidationV3RifBucket" },
  );
  const executeLiquidationTaskDocBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteLiquidationV3.sol:TaskExecuteLiquidationV3",
    [core.mocMultiCollateralGuard, core.docBucket],
    { id: "TaskExecuteLiquidationV3DocBucket" },
  );

  const executeMicroLiquidationTaskRifBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol:TaskExecuteMicroLiquidationV3",
    [core.mocMultiCollateralGuard, core.rifBucket],
    { id: "TaskExecuteMicroLiquidationV3RifBucket" },
  );
  const executeMicroLiquidationTaskDocBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol:TaskExecuteMicroLiquidationV3",
    [core.mocMultiCollateralGuard, core.docBucket],
    { id: "TaskExecuteMicroLiquidationV3DocBucket" },
  );

  const interestPaymentTaskRifBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskInterestPaymentV3.sol:TaskInterestPaymentV3",
    [core.rifBucket],
    { id: "TaskInterestPaymentV3RifBucket" },
  );
  const interestPaymentTaskDocBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskInterestPaymentV3.sol:TaskInterestPaymentV3",
    [core.docBucket],
    { id: "TaskInterestPaymentV3DocBucket" },
  );

  const refreshAcBalanceTaskRifBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskRefreshACBalanceV3.sol:TaskRefreshACBalanceV3",
    [core.rifBucket, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV3RifBucket" },
  );
  const refreshAcBalanceTaskDocBucket = m.contract(
    "@moc/oracles/contracts/tasks/v3/TaskRefreshACBalanceV3.sol:TaskRefreshACBalanceV3",
    [core.docBucket, core.refreshAcBalanceThreshold],
    { id: "TaskRefreshACBalanceV3DocBucket" },
  );

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
  const flowTriggerOrderTaskSwapRifFeesToMocForRifOracle = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [swapRifFeesToMocForRifOracle, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderSwapRifFeesToMocForRifOracle" },
  );
  const flowTriggerOrderTaskSwapDocFeesToMocForRifOracle = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol:TaskTriggerOrder",
    [swapDocFeesToMocForRifOracle, flow.revertSleepTime, flow.taskOwner],
    { id: "TaskTriggerOrderSwapDocFeesToMocForRifOracle" },
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
  const flowLiquidateTaskBitProRewardsBuffer = m.contract(
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol:TaskLiquidate",
    [bufferTasks.bitProRewardsBuffer],
    {
      id: "TaskLiquidateBitProRewardsBuffer",
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
  // Stage 6 - TasksRunner Tasks
  // ---------------------------------------------------------------------------
  const switchRoundTasksRunnerCoinPairTask = m.contract(
    "@moc/oracles/contracts/tasks/oracles/TaskSwitchRoundCoinPair.sol:TaskSwitchRoundCoinPair",
    [tasksRunnerContract],
    {
      id: "TaskSwitchRoundTasksRunnerCoinPair",
    },
  );

  const allTasks = [
    updateEmaTaskV1,
    evalLiquidationTaskV1,
    interestPaymentTaskV1,
    settlementTaskV1,
    mintStepTask,
    switchRoundCoinPairTask,
    switchRoundTasksRunnerCoinPairTask,
    distributeSupportersTask,
    executeQueueTask,
    updateEmaTaskRifBucket,
    updateEmaTaskDocBucket,
    executeLiquidationTaskRifBucket,
    executeLiquidationTaskDocBucket,
    executeMicroLiquidationTaskRifBucket,
    executeMicroLiquidationTaskDocBucket,
    interestPaymentTaskRifBucket,
    interestPaymentTaskDocBucket,
    refreshAcBalanceTaskRifBucket,
    refreshAcBalanceTaskDocBucket,
    flowSplitTaskRifCommissionSplitterV2,
    flowSplitTaskRifCommissionSplitterV3,
    flowSplitTaskDocCommissionSplitterV2,
    flowSplitTaskMocCommissionSplitterV2,
    flowSplitTaskMocCommissionSplitterV3,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes,
    flowTriggerOrderTaskSwapRifFeesToMocForRifOracle,
    flowTriggerOrderTaskSwapDocFeesToMocForRifOracle,
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
    flowLiquidateTaskBitProRewardsBuffer,
    flowFlushTaskBproRewardsBuffer,
    flowLiquidateTaskBproRewardsBuffer,
    flowFlushTaskMocRewardsBuffer,
    flowLiquidateTaskMocRewardsBuffer,
    ...splitRifFeesToFoundationAndRifOracle.tasks,
    ...splitDocFeesToFoundationAndRifOracle.tasks,
    ...splitMocFeesToFoundationAndRifOracle.tasks,
    ...splitMocRewardsToBtcOracleAndTasksRunner.tasks,
    ...splitPriceUpdateFeesToBtcOracleAndRifOracle.tasks,
  ];

  // ---------------------------------------------------------------------------
  // Stage 7 - Latest Implementations
  // ---------------------------------------------------------------------------
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
  // Stage 8 - AddTasksRunnerChanger Deployment
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
      tasksRunnerContract,
      allTasks,
      executeQueueTask,
      updateEmaTaskRifBucket,
      core.rifBucket,
      rifOracleCoinPair,
      rifToRbtcPriceProvider,
      rifToMocPriceProvider,
      mocToRifPriceProvider,
      rifCommissionSplitterV2.commissionSplitter,
      rifCommissionSplitterV3.commissionSplitter,
      docCommissionSplitterV2.commissionSplitter,
      splitRifFeesToFoundationAndRifOracle.buffer,
      splitDocFeesToFoundationAndRifOracle.buffer,
      splitMocFeesToFoundationAndRifOracle.buffer,
      splitMocRewardsToBtcOracleAndTasksRunner.buffer,
      splitPriceUpdateFeesToBtcOracleAndRifOracle.buffer,
      oracleTasks.coinPair,
      mocRewardsBufferCfg.btcUsdOutputIndex,
      queueExecutionCosts.rifBucket,
      queueExecutionCosts.docBucket,
      rifBucketUsdrifTargetEma,
    ],
    {
      id: "AddTasksRunnerChanger",
    },
  );

  // ---------------------------------------------------------------------------
  // Stage 9 - Module Exports
  // ---------------------------------------------------------------------------
  return {
    tasksRunner: tasksRunnerContract,
    revAuctionRBTCtoMOC_tasksRunner,
    revAuctionRIFtoMOC_tasksRunner,
    revAuctionDOCtoMOC_tasksRunner,
    revAuctionRBTCtoMOC_rocNodes,
    swapRifFeesToMocForRifOracle,
    swapDocFeesToMocForRifOracle,
    rifOracleCoinPair,
    rifToRbtcPriceProvider,
    rifToMocPriceProvider,
    mocToRifPriceProvider,
    bufferTokenImpl,
    mocMultiCollateralGuardLatestImpl,
    mocCoreBucketLatestImpl,
    mocQueueLatestImpl,
    mocCoreExpansionLatestImpl,
    executeQueueTask,
    updateEmaTaskV1,
    evalLiquidationTaskV1,
    interestPaymentTaskV1,
    settlementTaskV1,
    mintStepTask,
    switchRoundCoinPairTask,
    switchRoundTasksRunnerCoinPairTask,
    distributeSupportersTask,
    updateEmaTaskRifBucket,
    updateEmaTaskDocBucket,
    executeLiquidationTaskRifBucket,
    executeLiquidationTaskDocBucket,
    executeMicroLiquidationTaskRifBucket,
    executeMicroLiquidationTaskDocBucket,
    interestPaymentTaskRifBucket,
    interestPaymentTaskDocBucket,
    refreshAcBalanceTaskRifBucket,
    refreshAcBalanceTaskDocBucket,
    flowSplitTaskRifCommissionSplitterV2,
    flowSplitTaskRifCommissionSplitterV3,
    flowSplitTaskDocCommissionSplitterV2,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRIFtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionDOCtoMOC_tasksRunner,
    flowTriggerOrderTaskRevAuctionRBTCtoMOC_rocNodes,
    flowTriggerOrderTaskSwapRifFeesToMocForRifOracle,
    flowTriggerOrderTaskSwapDocFeesToMocForRifOracle,
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
    flowLiquidateTaskBitProRewardsBuffer,
    flowFlushTaskBproRewardsBuffer,
    flowLiquidateTaskBproRewardsBuffer,
    flowFlushTaskMocRewardsBuffer,
    flowLiquidateTaskMocRewardsBuffer,
    addTasksRunnerChanger,
  };
});

export default AddTasksRunnerModule;
