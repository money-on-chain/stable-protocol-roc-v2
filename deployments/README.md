
# Changer Upgrade deployment

```bash
npx hardhat deploy --network rskMainnet --tags MocQueue_Imp
```

```bash
npx hardhat deploy --network rskMainnet --tags FeesSplitter
```

```bash
npx hardhat deploy --network rskMainnet --tags TCInterestSplitter
```

```bash
npx hardhat deploy --network rskMainnet --tags FlowChangeProposal
```

Test

```bash
npx hardhat run --network rskMainnet ./scripts/check-deployed-changer.ts
```
