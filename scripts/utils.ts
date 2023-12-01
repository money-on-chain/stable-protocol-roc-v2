import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getNetworkDeployParams } from "moc-main/export/scripts/utils";
import { ethers } from "hardhat";
import { MoCConnector__factory, MoC__factory } from "../typechain/factories/dependencies/mocV1Imports";
import { MoCState__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCState__factory";
import { MoCInrate__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCInrate__factory";
import { MoCSettlement__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCSettlement__factory";
import { MoCVendors__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCVendors__factory";

export const getOrFetchNetworkDeployParams = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = ethers.provider.getSigner();
  let deployParameters = getNetworkDeployParams(hre);
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  if (hre.config.networks[network].mocV1Address) {
    const mocV1Address = hre.config.networks[network].mocV1Address!;

    console.log(`###### fetching parameters from MoCV1: ${mocV1Address} ######`);

    const mocV1 = MoC__factory.connect(mocV1Address, signer);
    const mocConnectorV1 = MoCConnector__factory.connect(await mocV1.connector(), signer);
    const mocStateV1 = MoCState__factory.connect(await mocConnectorV1.mocState(), signer);
    const mocInrateV1 = MoCInrate__factory.connect(await mocConnectorV1.mocInrate(), signer);
    const mocSettlementV1 = MoCSettlement__factory.connect(await mocConnectorV1.mocSettlement(), signer);
    const mocVendorsV1 = MoCVendors__factory.connect(await mocStateV1.getMoCVendors(), signer);
    // Overrides all migration related params
    deployParameters = Object.assign(deployParameters, {
      coreParams: Object.assign(deployParameters.coreParams, {
        protThrld: await mocStateV1.getProtected(),
        liqThrld: await mocStateV1.liq(),
        emaCalculationBlockSpan: (await mocStateV1.emaCalculationBlockSpan()).toNumber(),
        tcInterestRate: await mocInrateV1.riskProRate(),
        tcInterestPaymentBlockSpan: (await mocInrateV1.riskProInterestBlockSpan()).toNumber(),
      }),
      settlementParams: Object.assign(deployParameters.settlementParams, {
        bes: (await mocSettlementV1.getBlockSpan()).toNumber(),
      }),
      feeParams: Object.assign(deployParameters.feeParams, {
        mintFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.MINT_RISKPRO_FEES_RESERVE()),
        redeemFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.REDEEM_RISKPRO_FEES_RESERVE()),
      }),
      mocAddresses: Object.assign(deployParameters.mocAddresses, {
        governorAddress: await mocV1.governor(),
        collateralAssetAddress: await mocConnectorV1.reserveToken(),
        collateralTokenAddress: await mocConnectorV1.riskProToken(),
        pauserAddress: deployer, // For Migration, V2 will be paused after deployment until actual migration
        feeTokenAddress: await mocStateV1.getMoCToken(),
        feeTokenPriceProviderAddress: await mocStateV1.getMoCPriceProvider(),
        mocFeeFlowAddress: await mocInrateV1.commissionsAddress(),
        vendorsGuardianAddress: await mocVendorsV1.getVendorGuardianAddress(),
        tcInterestCollectorAddress: await mocInrateV1.riskProInterestAddress(),
      }),
    });
  }
  return deployParameters;
};
