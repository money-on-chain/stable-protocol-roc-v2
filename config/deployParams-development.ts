import { BigNumber } from "ethers";
import { MigrateParameters } from "../hardhat.base.config";

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 2880;

export const developmentMigrateParams: MigrateParameters = {
  mocV1Address: "0xe9BEf610cDfB7138F98cA5Cd2A2d3cf0a81C0cF5",
  coreParams: {
    decayBlockSpan: DAY_BLOCK_SPAN,
    successFee: PCT_BASE.mul(10).div(100), // 10%
    appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
    allowDifferentRecipient: false,
  },
  mocAddresses: {
    mocAppreciationBeneficiaryAddress: "0x26a00af444928d689dDEc7B4D17C0e4A8c9D407A",
  },
  feeParams: {
    feeRetainer: PCT_BASE.mul(25).div(100), // 25%
    swapTPforTPFee: PCT_BASE.mul(1).div(100), // 1%
    swapTPforTCFee: PCT_BASE.mul(1).div(100), // 1%
    swapTCforTPFee: PCT_BASE.mul(1).div(100), // 1%
    redeemTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
    mintTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
    feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
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
  gasLimit: 6800000,
};
