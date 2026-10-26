import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { batchModule } from "ignition-utils";
// ethers.encodeBytes32String("TASKSRUNNER")
const TASKS_RUNNER_NAME = "0x5441534b5352554e4e4552000000000000000000000000000000000000000000";
const PreTasksRunnerModule = buildModule("PreTasksRunnerModule", m => {
    const oracleManagerProxy = m.getParameter("oracleManagerProxy");
    const upgradeDelegator = m.getParameter("upgradeDelegator");
    const proxyAdmin = m.getParameter("proxyAdmin");
    const multiSigCoinPairPauser = m.getParameter("multiSigCoinPairPauser");
    // TasksRunner initializer parameters
    const governor = m.getParameter("governor");
    const mocTokenAddress = m.getParameter("mocTokenAddress");
    const registry = m.getParameter("registry");
    const minOraclesPerRound = m.getParameter("minOraclesPerRound");
    const maxOraclesPerRound = m.getParameter("maxOraclesPerRound");
    const maxSubscribedOraclesPerRound = m.getParameter("maxSubscribedOraclesPerRound");
    const roundLockPeriod = m.getParameter("roundLockPeriod");
    const maxMissedSigRounds = m.getParameter("maxMissedSigRounds");
    const maxTasksPerBatch = m.getParameter("maxTasksPerBatch");
    const tokenToCoinbasePriceProvider = m.getParameter("tokenToCoinbasePriceProvider");
    const sharesCapMultiplier = m.getParameter("sharesCapMultiplier");
    // MocSwapper RIF <-> MoC path parameters
    const mocSwapper = m.getParameter("mocSwapper");
    const rifToken = m.getParameter("rifToken");
    const mocToken = m.getParameter("mocToken");
    const rifToMocIntermediateTokens = m.getParameter("rifToMocIntermediateTokens");
    const rifToMocFees = m.getParameter("rifToMocFees");
    const mocToRifIntermediateTokens = m.getParameter("mocToRifIntermediateTokens");
    const mocToRifFees = m.getParameter("mocToRifFees");
    // Deploy new OracleManager implementation
    const newOracleManagerImplementation = m.contract("@moc/oracles/contracts/OracleManager.sol:OracleManager", [], {
        id: "OracleManagerImplementation",
    });
    // Deploy a single new CoinPairPrice implementation (used for all CoinPairs)
    const newCoinPairImplementation = m.contract("@moc/oracles/contracts/CoinPairPrice.sol:CoinPairPrice", [], {
        id: "CoinPairImplementation",
    });
    // Deploy BasefeeProvider (no proxy needed)
    const baseFeeProvider = m.contract("@moc/oracles/contracts/BasefeeProvider.sol:BasefeeProvider", [], {
        id: "BasefeeProvider",
    });
    // Deploy TasksRunner implementation
    const tasksRunnerImplementation = m.contract("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", [], {
        id: "TasksRunnerImplementation",
    });
    // Deploy the TasksRunner proxy (TransparentUpgradeableProxy: impl, admin, data)
    const tasksRunnerProxy = m.contract("TransparentUpgradeableProxy", [tasksRunnerImplementation, proxyAdmin, "0x"], {
        id: "TasksRunnerProxy",
    });
    // Bind to the proxy as a TasksRunner to call initialize through delegatecall
    const tasksRunnerAtProxy = m.contractAt("@moc/oracles/contracts/TasksRunner.sol:TasksRunner", tasksRunnerProxy, {
        id: "TasksRunnerAtProxy",
    });
    // Initialize the TasksRunner proxy
    m.call(tasksRunnerAtProxy, "initialize", [
        governor,
        TASKS_RUNNER_NAME,
        [], // no initial tasks
        mocTokenAddress,
        [maxOraclesPerRound, maxSubscribedOraclesPerRound, roundLockPeriod, maxMissedSigRounds],
        oracleManagerProxy,
        registry,
        minOraclesPerRound,
        [maxTasksPerBatch, tokenToCoinbasePriceProvider, baseFeeProvider, sharesCapMultiplier],
    ], { id: "InitializeTasksRunner" });
    // Deploy the PreTasksRunner changer
    // CoinPair proxies are read dynamically from the OracleManager at construction time
    const changer = m.contract("PreTasksRunnerChanger", [
        oracleManagerProxy,
        upgradeDelegator,
        newOracleManagerImplementation,
        newCoinPairImplementation,
        multiSigCoinPairPauser,
        tasksRunnerProxy,
        TASKS_RUNNER_NAME,
        mocSwapper,
        rifToken,
        mocToken,
        rifToMocIntermediateTokens,
        rifToMocFees,
        mocToRifIntermediateTokens,
        mocToRifFees,
    ]);
    return {
        newOracleManagerImplementation,
        newCoinPairImplementation,
        baseFeeProvider,
        tasksRunnerImplementation,
        tasksRunnerProxy,
        changer,
    };
});
export default batchModule(PreTasksRunnerModule);
//# sourceMappingURL=preTasksRunner.js.map