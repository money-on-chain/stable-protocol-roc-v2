import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { MoCConnector__factory, MoC__factory } from "../typechain/factories/dependencies/mocV1Imports";
import { MoCState__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCState__factory";
import { MoCInrate__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCInrate__factory";
import { MoCSettlement__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCSettlement__factory";
import { MoCVendors__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCVendors__factory";
import { RifFullDeployParameters } from "../deploy/migrate_MocRif";

export const getNetworkDeployParams = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  return hre.config.networks[network].deployParameters;
};

export const fetchNetworkDeployParams = async (hre: HardhatRuntimeEnvironment): Promise<RifFullDeployParameters> => {
  const signer = ethers.provider.getSigner();
  let deployParameters = getNetworkDeployParams(hre);
  if (!deployParameters.migrate) throw new Error("No migration params config found.");
  const { mocV1Address, coreParams, mocAddresses, feeParams, queueParams, gasLimit } = deployParameters.migrate;

  console.log(`###### fetching parameters from MoCV1: ${mocV1Address} ######`);

  const mocV1 = MoC__factory.connect(mocV1Address, signer);
  const mocConnectorV1 = MoCConnector__factory.connect(await mocV1.connector(), signer);
  const mocStateV1 = MoCState__factory.connect(await mocConnectorV1.mocState(), signer);
  const mocInrateV1 = MoCInrate__factory.connect(await mocConnectorV1.mocInrate(), signer);
  const mocSettlementV1 = MoCSettlement__factory.connect(await mocConnectorV1.mocSettlement(), signer);
  const mocVendorsV1 = MoCVendors__factory.connect(await mocStateV1.getMoCVendors(), signer);

  const fullDeployParameters: RifFullDeployParameters = {
    coreParams: Object.assign(coreParams, {
      protThrld: await mocStateV1.getProtected(),
      liqThrld: await mocStateV1.liq(),
      emaCalculationBlockSpan: (await mocStateV1.emaCalculationBlockSpan()).toNumber(),
      tcInterestRate: await mocInrateV1.riskProRate(),
      tcInterestPaymentBlockSpan: (await mocInrateV1.riskProInterestBlockSpan()).toNumber(),
    }),
    settlementParams: {
      bes: (await mocSettlementV1.getBlockSpan()).toNumber(),
    },
    feeParams: Object.assign(feeParams, {
      mintFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.MINT_RISKPRO_FEES_RESERVE()),
      redeemFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.REDEEM_RISKPRO_FEES_RESERVE()),
    }),
    mocAddresses: Object.assign(mocAddresses, {
      governorAddress: await mocV1.governor(),
      collateralAssetAddress: await mocConnectorV1.reserveToken(),
      collateralTokenAddress: await mocConnectorV1.riskProToken(),
      pauserAddress: await mocV1.stopper(),
      feeTokenAddress: await mocStateV1.getMoCToken(),
      feeTokenPriceProviderAddress: await mocStateV1.getMoCPriceProvider(),
      mocFeeFlowAddress: await mocInrateV1.commissionsAddress(),
      vendorsGuardianAddress: await mocVendorsV1.getVendorGuardianAddress(),
      tcInterestCollectorAddress: await mocInrateV1.riskProInterestAddress(),
    }),
    queueParams,
    gasLimit,
  };
  return fullDeployParameters;
};
