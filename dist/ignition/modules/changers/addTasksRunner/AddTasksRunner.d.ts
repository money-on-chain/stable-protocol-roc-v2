import type { IgnitionModule } from "@nomicfoundation/ignition-core";
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
declare const AddTasksRunnerModule: IgnitionModule;
export default AddTasksRunnerModule;
//# sourceMappingURL=AddTasksRunner.d.ts.map