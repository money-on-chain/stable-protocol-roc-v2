export const compilers = [
    {
        version: "0.5.8",
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    {
        version: "0.6.12",
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    {
        version: "0.7.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    {
        version: "0.8.16",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            evmVersion: "london",
            outputSelection: {
                "*": {
                    "*": ["storageLayout"],
                },
            },
        },
    },
    {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
                details: {
                    yulDetails: {
                        optimizerSteps: "dhfoDgvulfnTUtnIf[xa[r]EscLMcCTUtTOntnfDIulLculVcul[j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTOtfDnca[r]Iulc]jmul[jul]VcTOculjmul",
                    },
                },
            },
            viaIR: true,
            evmVersion: "london",
            outputSelection: {
                "*": {
                    "*": ["storageLayout"],
                },
            },
        },
    },
    {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
                details: {
                    yulDetails: {
                        optimizerSteps: "dhfoDgvulfnTUtnIf[xa[r]EscLMcCTUtTOntnfDIulLculVcul[j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTOtfDnca[r]Iulc]jmul[jul]VcTOculjmul",
                    },
                },
            },
            viaIR: true,
            evmVersion: "london",
            outputSelection: {
                "*": {
                    "*": ["storageLayout"],
                },
            },
        },
    },
];
export const npmFilesToBuild = [
    "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol",
    "moc-main-latest/contracts/core/MocCoreExpansion.sol",
    "moc-main-latest/contracts/tokens/MocRC20.sol",
    "moc-main-latest/contracts/queue/MocQueue.sol",
    "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol",
    "moc-main-latest/contracts/mocks/PriceProviderMock.sol",
    "moc-main-latest/contracts/auxiliary/CommissionSplitterRC20.sol",
    "moc-main-latest/contracts/governance/InterimGovernor.sol",
    "moc-main-latest/contracts/auxiliary/MocReverseAuction.sol",
    "moc-main-latest/contracts/multiCollateral/swapper/MocSwapperV3.sol",
    "moc-main-latest/contracts/multiCollateral/swapper/MocSwapperV3MultiHop.sol",
    "@moc/price-oracle-interfaces/contracts/PriceProviderInverse.sol",
    "@moc/price-oracle-interfaces/contracts/PriceProviderDummy.sol",
    "@moc/price-oracle-interfaces/contracts/PriceProviderDocRbtc.sol",
    "@moc/price-oracle-interfaces/contracts/PriceProviderDocUsd.sol",
    "@moc/price-oracle-interfaces/contracts/PriceProviderDiv.sol",
    "@moc/price-oracle-interfaces/contracts/UniswapV3Oracle.sol",
    "@moc/oracles/contracts/tasks/v3/TaskExecuteQueueV3.sol",
    "@moc/oracles/contracts/tasks/v3/TaskExecuteQueueV3Fallback.sol",
    "@moc/oracles/contracts/tasks/v1/TaskUpdateEmaV1.sol",
    "@moc/oracles/contracts/tasks/v1/TaskEvalLiquidationV1.sol",
    "@moc/oracles/contracts/tasks/v1/TaskInterestPaymentV1.sol",
    "@moc/oracles/contracts/tasks/v1/TaskSettlementV1.sol",
    "@moc/oracles/contracts/tasks/v3/TaskUpdateEmaV3.sol",
    "@moc/oracles/contracts/tasks/v3/TaskExecuteLiquidationV3.sol",
    "@moc/oracles/contracts/tasks/v3/TaskExecuteMicroLiquidationV3.sol",
    "@moc/oracles/contracts/tasks/v3/TaskInterestPaymentV3.sol",
    "@moc/oracles/contracts/tasks/v3/TaskRefreshACBalanceV3.sol",
    "@moc/oracles/contracts/tasks/mocFlow/commissionSplitter/TaskSplit.sol",
    "@moc/oracles/contracts/tasks/mocFlow/reverseAuction/TaskTriggerOrder.sol",
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskFlush.sol",
    "@moc/oracles/contracts/tasks/mocFlow/buffer/TaskLiquidate.sol",
    "@moc/oracles/contracts/tasks/mocFlow/coiner/TaskMintStep.sol",
    "@moc/oracles/contracts/tasks/oracles/TaskSwitchRoundCoinPair.sol",
    "@moc/oracles/contracts/tasks/oracles/TaskDistributeSupporters.sol",
    "@moc/oracles/contracts/BasefeeProvider.sol",
    "@moc/flow/contracts/BufferToken.sol",
    "@moc/oracles/contracts/TasksRunner.sol",
    "@moc/oracles/contracts/OracleManager.sol",
    "@moc/oracles/contracts/CoinPairPrice.sol",
    "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
];
//# sourceMappingURL=solidity.js.map