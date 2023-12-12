# How to deploy and execute migration from V1 protocol

Go to the [RDOC-Contract-Internal repository](https://github.com/money-on-chain/RDOC-Contract-Internal), look at RDOC-Contract-Internal/scripts/deploy/upgrade_v0.2.0/V2Migration.md to follow the upgrade process

`V2MigrationChanger.sol` is the changer that will execute the migration on V1 contracts. In that process, it will check that some parameters are the same in the new V2 contract, otherwise the transaction will revert.
To prevent this, you can set MoCV1 address in `hardhat.base.config.ts` and before deploying the script will dynamically fetch all the parameters from it and overwrite them.

in [hardhat.base.config.ts](hardhat.base.config.ts):

```
network: {
deployParameters: {
      ....
      },
      mocV1Address: "0x24a1a1......5050EE1",
      },
    },
```

Those parameters are:

```typescript
deployParameters = {
  coreParams: {
    protThrld: await mocStateV1.getProtected(),
    liqThrld: await mocStateV1.liq(),
    emaCalculationBlockSpan: (await mocStateV1.emaCalculationBlockSpan()).toNumber(),
    tcInterestRate: await mocInrateV1.riskProRate(),
    tcInterestPaymentBlockSpan: (await mocInrateV1.riskProInterestBlockSpan()).toNumber(),
  },
  settlementParams: {
    bes: (await mocSettlementV1.getBlockSpan()).toNumber(),
  },
  feeParams: {
    mintFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.MINT_RISKPRO_FEES_RESERVE()),
    redeemFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.REDEEM_RISKPRO_FEES_RESERVE()),
  },
  mocAddresses: {
    governorAddress: await mocV1.governor(),
    collateralAssetAddress: await mocConnectorV1.reserveToken(),
    collateralTokenAddress: await mocConnectorV1.riskProToken(),
    feeTokenAddress: await mocStateV1.getMoCToken(),
    feeTokenPriceProviderAddress: await mocStateV1.getMoCPriceProvider(),
    mocFeeFlowAddress: await mocInrateV1.commissionsAddress(),
    vendorsGuardianAddress: await mocVendorsV1.getVendorGuardianAddress(),
    tcInterestCollectorAddress: await mocInrateV1.riskProInterestAddress(),
  },
  tpParams: {
    tpParams: [
      {
        name: await mocConnectorV1.stableToken(), //use name here for stableToken address
        priceProvider: await mocStateV1.getPriceProvider(),
        ctarg: await mocStateV1.cobj(),
        mintFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.MINT_STABLETOKEN_FEES_RESERVE()),
        redeemFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.REDEEM_STABLETOKEN_FEES_RESERVE()),
        initialEma: await mocStateV1.getLastEmaCalculation(),
        smoothingFactor: await mocStateV1.getSmoothingFactor(),
      },
    ],
  },
};
```
