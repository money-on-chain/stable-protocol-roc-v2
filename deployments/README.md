
# Changer Upgrade deployment

```bash
npx hardhat deploy --network rskAlphaTestnet --tags MocQueue_Imp
```

```bash
npx hardhat deploy --network rskAlphaTestnet --tags FeesSplitter
```

```bash
npx hardhat deploy --network rskAlphaTestnet --tags TCInterestSplitter
```

```bash
npx hardhat deploy --network rskAlphaTestnet --tags FlowChangeProposal
```

Test

```bash
npx hardhat run --network rskAlphaTestnet ./scripts/check-deployed-changer.ts
```
