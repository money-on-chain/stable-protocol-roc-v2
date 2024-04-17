import { BigNumber } from "ethers";
import { DeployParameters } from "moc-main/export/scripts/types";
import { MigrateParameters } from "../hardhat.base.config";

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 2880;
const WEEK_BLOCK_SPAN = DAY_BLOCK_SPAN * 7;
const MONTH_BLOCK_SPAN = DAY_BLOCK_SPAN * 30;

// Reference gasPrice average on RSK network
const gasPrice = BigNumber.from("65800000");

const commonParams = {
  queueParams: {
    minOperWaitingBlk: 3,
    maxOperPerBatch: 65,
    execFeeParams: {
      tcMintExecFee: BigNumber.from("103000").mul(gasPrice),
      tcRedeemExecFee: BigNumber.from("105000").mul(gasPrice),
      tpMintExecFee: BigNumber.from("131500").mul(gasPrice),
      tpRedeemExecFee: BigNumber.from("121500").mul(gasPrice),
      mintTCandTPExecFee: BigNumber.from("165000").mul(gasPrice),
      redeemTCandTPExecFee: BigNumber.from("174500").mul(gasPrice),
      swapTPforTPExecFee: BigNumber.from("154000").mul(gasPrice),
      swapTPforTCExecFee: BigNumber.from("140000").mul(gasPrice),
      swapTCforTPExecFee: BigNumber.from("147500").mul(gasPrice),
    },
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetMigrationParams: MigrateParameters = {
  mocV1Address: "0x4512f4C1d984bbf8B7f7404EddFb1881cFA79EfD",
  coreParams: {
    appreciationFactor: BigNumber.from(0), // 0%
    successFee: BigNumber.from(0), // 0%
    decayBlockSpan: DAY_BLOCK_SPAN,
  },
  feeParams: {
    feeRetainer: BigNumber.from(0), // 0%
    mintFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    redeemFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTPforTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTPforTCFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTCforTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    redeemTCandTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    mintTCandTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    feeTokenPct: PCT_BASE.mul(75).div(100), // 75% (Using feeToken gives 25% cheeper fees)
  },
  mocAddresses: {
    mocAppreciationBeneficiaryAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
  },
  ...commonParams,
};

export const rskAlphaTestnetDeployParams: DeployParameters = {
  coreParams: {
    protThrld: PCT_BASE.mul(15).div(10), // 1.5
    liqThrld: PCT_BASE.mul(104).div(100), // 1.04
    emaCalculationBlockSpan: DAY_BLOCK_SPAN,
    successFee: BigNumber.from(0), // 0% - Feature disabled
    appreciationFactor: BigNumber.from(0), // 0% - Feature disabled
    tcInterestRate: PCT_BASE.mul(5).div(100000), // 0.005% : weekly 0.0025 / 365 * 7
    tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
    decayBlockSpan: DAY_BLOCK_SPAN,
  },
  settlementParams: {
    bes: MONTH_BLOCK_SPAN,
  },
  feeParams: {
    feeRetainer: BigNumber.from(0), // 0% - feeRetainer use must be in coordination with mocFlow update
    mintFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    redeemFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTPforTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTPforTCFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTCforTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    redeemTCandTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    mintTCandTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    feeTokenPct: PCT_BASE.mul(75).div(100), // 75% (Using feeToken gives 25% cheeper fees)
  },
  ctParams: {
    name: "RIFPROv2",
    symbol: "RIFPv2",
  },
  tpParams: {
    tpParams: [
      {
        name: "USDRv2",
        symbol: "USDRv2",
        priceProvider: "0x9d4b2c05818A0086e641437fcb64ab6098c7BbEc".toLowerCase(),
        ctarg: PCT_BASE.mul(55).div(10), // 5.5
        mintFee: PCT_BASE.div(100), // 1%
        redeemFee: PCT_BASE.div(100), // 1%
        initialEma: PCT_BASE.mul(6790).div(100000), //0.06790
        smoothingFactor: PCT_BASE.mul(1104).div(100000), // 0.01104
      },
    ],
  },
  mocAddresses: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22", // if not provided a new GovernorMock.sol is deployed
    collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    pauserAddress: "0x5bCdf8A2E61BD238AEe43b99962Ee8BfBda1Beca", // if not provided is set to deployer
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    feeTokenPriceProviderAddress: "0x8DCE78BbD4D757EF7777Be113277cf5A35283b1E",
    mocFeeFlowAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
    mocAppreciationBeneficiaryAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
    vendorsGuardianAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
    tcInterestCollectorAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
    maxAbsoluteOpProviderAddress: "", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
    maxOpDiffProviderAddress: "", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
  },
  ...commonParams,
};
