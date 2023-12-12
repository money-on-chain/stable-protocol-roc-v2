import { BigNumber } from "ethers";
import { DeployParameters } from "moc-main/export/scripts/types";
import { MigrateParameters } from "../hardhat.base.config";

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 2880;
const WEEK_BLOCK_SPAN = DAY_BLOCK_SPAN * 7;
const MONTH_BLOCK_SPAN = DAY_BLOCK_SPAN * 30;

const commonParams = {
  queueParams: {
    minOperWaitingBlk: 5,
    maxOperPerBatch: 65,
    execFeeParams: {
      tcMintExecFee: BigNumber.from("100"),
      tcRedeemExecFee: BigNumber.from("100"),
      tpMintExecFee: BigNumber.from("100"),
      tpRedeemExecFee: BigNumber.from("100"),
      mintTCandTPExecFee: BigNumber.from("100"),
      redeemTCandTPExecFee: BigNumber.from("100"),
      swapTPforTPExecFee: BigNumber.from("100"),
      swapTPforTCExecFee: BigNumber.from("100"),
      swapTCforTPExecFee: BigNumber.from("100"),
    },
  },
  gasLimit: 6800000,
};

export const rskTestnetMigrationParams: MigrateParameters = {
  mocV1Address: "0x4512f4C1d984bbf8B7f7404EddFb1881cFA79EfD",
  coreParams: {
    appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
    successFee: PCT_BASE.mul(10).div(100), // 10%
    decayBlockSpan: DAY_BLOCK_SPAN,
  },
  feeParams: {
    feeRetainer: PCT_BASE.mul(0), // 0%
    swapTPforTPFee: PCT_BASE.mul(1).div(100), // 1%
    swapTPforTCFee: PCT_BASE.mul(1).div(100), // 1%
    swapTCforTPFee: PCT_BASE.mul(1).div(100), // 1%
    redeemTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
    mintTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
    feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
  },
  mocAddresses: {
    mocAppreciationBeneficiaryAddress: "0x26A00aF444928D689ddEC7B4D17C0E4A8C9d407F",
  },
  ...commonParams,
};

export const rskTestnetDeployParams: DeployParameters = {
  coreParams: {
    protThrld: PCT_BASE.mul(15).div(10), // 1.5
    liqThrld: PCT_BASE.mul(104).div(100), // 1.04
    emaCalculationBlockSpan: DAY_BLOCK_SPAN,
    successFee: PCT_BASE.mul(10).div(100), // 10%
    appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
    tcInterestRate: PCT_BASE.mul(5).div(100000), // 0.005% : weekly 0.0025 / 365 * 7
    tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
    decayBlockSpan: DAY_BLOCK_SPAN,
  },
  settlementParams: {
    bes: MONTH_BLOCK_SPAN,
  },
  feeParams: {
    feeRetainer: PCT_BASE.div(10), // 10%
    mintFee: PCT_BASE.div(1000), // 0.1%
    redeemFee: PCT_BASE.div(1000), // 0.1%
    swapTPforTPFee: PCT_BASE.div(1000), // 0.1%
    swapTPforTCFee: PCT_BASE.div(1000), // 0.1%
    swapTCforTPFee: PCT_BASE.div(1000), // 0.1%
    redeemTCandTPFee: PCT_BASE.mul(8).div(10000), // 0.08%
    mintTCandTPFee: PCT_BASE.mul(8).div(10000), // 0.08%
    feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
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
    governorAddress: "", // if not provided a new GovernorMock.sol is deployed
    collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    pauserAddress: "", // if not provided is set to deployer
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
