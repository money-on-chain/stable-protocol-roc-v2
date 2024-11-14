import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, getNamedAccounts, network } from "hardhat";
import { MoCConnector__factory, MoC__factory } from "../typechain/factories/dependencies/mocV1Imports";
import { MoCState__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCState__factory";
import { MoCInrate__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCInrate__factory";
import { MoCSettlement__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCSettlement__factory";
import { MoCVendors__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCVendors__factory";
import { CommissionSplitterV2__factory } from "../typechain/factories/dependencies/mocV1Imports/CommissionSplitterV2__factory";
import { CommissionSplitterV3__factory } from "../typechain/factories/dependencies/mocV1Imports/CommissionSplitterV3__factory";
import { RifFullDeployParameters } from "../deploy/migrate_MocRif";
import { CommissionSplitterV2 } from "../typechain/dependencies/mocV1Imports/CommissionSplitterV2";
import { CommissionSplitter } from "../typechain/dependencies/CommissionSplitter";

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

  let feesSplitterParams;
  let tcInterestsSplitterParams;

  // For development network, commissionSplitterV2 and commissionSplitterV3 are not deployed
  if (network.name != "development") {
    const commissionSplitterV2 = CommissionSplitterV2__factory.connect(await mocInrateV1.commissionsAddress(), signer);
    const commissionSplitterV3 = CommissionSplitterV3__factory.connect(
      await mocInrateV1.riskProInterestAddress(),
      signer,
    );
    feesSplitterParams = {
      acTokenAddressRecipient1: await commissionSplitterV2.outputAddress_2(),
      acTokenAddressRecipient2: await commissionSplitterV2.outputAddress_3(),
      acTokenPctToRecipient1: await calcOutput1(commissionSplitterV2),
      feeTokenAddressRecipient1: await commissionSplitterV2.outputTokenGovernAddress_1(),
      feeTokenAddressRecipient2: await commissionSplitterV2.outputTokenGovernAddress_2(),
      feeTokenPctToRecipient1: await commissionSplitterV2.outputProportionTokenGovern_1(),
    };
    tcInterestsSplitterParams = {
      acTokenAddressRecipient1: await commissionSplitterV3.outputAddress_1(),
      acTokenAddressRecipient2: await commissionSplitterV3.outputAddress_2(),
      acTokenPctToRecipient1: await commissionSplitterV3.outputProportion_1(),
    };
  } else {
    console.log(`[WARNING] Only local: Using custom feesSplitter and tcInterestsSplitter params`);
    const { deployer } = await getNamedAccounts();
    feesSplitterParams = {
      acTokenAddressRecipient1: deployer,
      acTokenAddressRecipient2: deployer,
      acTokenPctToRecipient1: BigNumber.from((1e16).toString()),
      feeTokenAddressRecipient1: deployer,
      feeTokenAddressRecipient2: deployer,
      feeTokenPctToRecipient1: BigNumber.from((1e16).toString()),
    };
    tcInterestsSplitterParams = {
      acTokenAddressRecipient1: deployer,
      acTokenAddressRecipient2: deployer,
      acTokenPctToRecipient1: BigNumber.from((1e16).toString()),
    };
  }

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
      vendorsGuardianAddress: await mocVendorsV1.getVendorGuardianAddress(),
    }),
    queueParams,
    feesSplitterParams,
    tcInterestsSplitterParams,
    gasLimit,
  };
  return fullDeployParameters;
};

const calcOutput1 = async (commissionSplitterV2: CommissionSplitterV2) => {
  const PCT_BASE = BigNumber.from((1e18).toString());
  const output1 = await commissionSplitterV2.outputProportion_1();
  const output2 = await commissionSplitterV2.outputProportion_2();
  // newOutput1 = output2 / (1 - output1)
  return output2.mul(PCT_BASE).div(PCT_BASE.sub(output1));
};
