import { BigNumber } from "ethers";
import { DeployParameters } from "moc-main/export/scripts/types";

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 2880;
const WEEK_BLOCK_SPAN = DAY_BLOCK_SPAN * 7;
const MONTH_BLOCK_SPAN = DAY_BLOCK_SPAN * 30;

export const hardhatDeployParams: DeployParameters = {
  coreParams: {
    protThrld: PCT_BASE.mul(2), // 2
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
    feeRetainer: PCT_BASE.mul(0), // 0%
    mintFee: PCT_BASE.mul(5).div(100), // 5%
    redeemFee: PCT_BASE.mul(5).div(100), // 5%
    swapTPforTPFee: PCT_BASE.mul(1).div(100), // 1%
    swapTPforTCFee: PCT_BASE.mul(1).div(100), // 1%
    swapTCforTPFee: PCT_BASE.mul(1).div(100), // 1%
    redeemTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
    mintTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
    feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
  },
  mocAddresses: {
    governorAddress: "", // if not provided a new GovernorMock.sol is deployed
    collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    pauserAddress: "", // if not provided is set to deployer
    feeTokenAddress: "0x26a00AF444928d689DDeC7b4d17c0e4A8c9D4060",
    feeTokenPriceProviderAddress: "0x26A00AF444928d689ddec7b4d17c0E4A8C9D4061",
    mocFeeFlowAddress: "0x26a00aF444928d689DDEC7b4D17c0E4a8c9D407d",
    mocAppreciationBeneficiaryAddress: "0x26A00aF444928D689ddEC7B4D17C0E4A8C9d407F",
    vendorsGuardianAddress: "0x26a00AF444928D689DDeC7b4D17c0E4a8C9d407E",
    tcInterestCollectorAddress: "0x27a00Af444928D689DDec7B4D17c0E4a8c9d407F",
    maxAbsoluteOpProviderAddress: "", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
    maxOpDiffProviderAddress: "", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
  },
  ctParams: {
    name: "RIFPROv2",
    symbol: "RIFPv2",
  },
  tpParams: {
    tpParams: [
      {
        name: "tUSDRIF",
        symbol: "tUSDRIF",
        priceProvider: "", // if not provided a new FakePriceProvider with price = 1 will be deployed
        ctarg: PCT_BASE.mul(55).div(10), // 5.5
        mintFee: PCT_BASE.div(100), // 1%
        redeemFee: PCT_BASE.div(100), // 1%
        initialEma: PCT_BASE.mul(6790).div(100000), //0.06790
        smoothingFactor: PCT_BASE.mul(1104).div(100000), // 0.01104
      },
    ],
  },
  queueParams: {
    minOperWaitingBlk: 1,
    maxOperPerBatch: 10,
    execFeeParams: {
      tcMintExecFee: BigNumber.from("1000000"),
      tcRedeemExecFee: BigNumber.from("1000001"),
      tpMintExecFee: BigNumber.from("1000002"),
      tpRedeemExecFee: BigNumber.from("1000003"),
      mintTCandTPExecFee: BigNumber.from("2000000"),
      redeemTCandTPExecFee: BigNumber.from("2000001"),
      swapTPforTPExecFee: BigNumber.from("2000002"),
      swapTPforTCExecFee: BigNumber.from("1000003"),
      swapTCforTPExecFee: BigNumber.from("1000004"),
    },
  },
  gasLimit: 30000000, // high value to avoid coverage issue. https://github.com/NomicFoundation/hardhat/issues/3121
};
