import { BigNumber } from "ethers";
import { MigrateParameters } from "../hardhat.base.config";

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 2880;

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

export const rskMainnetMigrationParams: MigrateParameters = {
  mocV1Address: "0xCfF3fcaeC2352C672C38d77cb1a064B7D50ce7e1",
  coreParams: {
    appreciationFactor: BigNumber.from(0), // 0%
    successFee: BigNumber.from(0), // 0%
    decayBlockSpan: DAY_BLOCK_SPAN,
    allowDifferentRecipient: false,
  },
  feeParams: {
    feeRetainer: PCT_BASE.mul(25).div(100), // 25%
    swapTPforTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTPforTCFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    swapTCforTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    redeemTCandTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    mintTCandTPFee: PCT_BASE.mul(2).div(1000), // 0.002 = 0.2%
    feeTokenPct: PCT_BASE.mul(75).div(100), // 75% (Using feeToken gives 25% cheeper fees)
  },
  mocAddresses: {
    mocAppreciationBeneficiaryAddress: "0xC61820bFB8F87391d62Cd3976dDc1d35e0cf7128",
    mocVendorsAddress: "0x5F69df7e853686a794c13be029FF228642C07012", // if not provided a new MocVendors will be deployed
    maxAbsoluteOpProviderAddress: "0x99aCDaF05b900a4Db37B0FaA7270855b186135cD", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
    maxOpDiffProviderAddress: "0x60744BE41058Aa876153CdBeE75aD281Ab1a9738", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
  },
  ...commonParams,
};
