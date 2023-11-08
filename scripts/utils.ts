import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  addPeggedTokensAndChangeGovernor,
  getNetworkDeployParams,
  waitForTxConfirmation,
} from "moc-main/export/scripts/utils";
import { ethers } from "hardhat";
import { TPParams } from "moc-main/export/scripts/types";
import { MoCConnector__factory, MoC__factory } from "../typechain/factories/dependencies/mocV1Imports";
import { MoCState__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCState__factory";
import { MoCInrate__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCInrate__factory";
import { MoCSettlement__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCSettlement__factory";
import { MoCVendors__factory } from "../typechain/factories/dependencies/mocV1Imports/MoCVendors__factory";
import { MocRif } from "../typechain/artifacts/contracts";

export const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));

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
    deployParameters = {
      coreParams: {
        protThrld: await mocStateV1.getProtected(),
        liqThrld: await mocStateV1.liq(),
        emaCalculationBlockSpan: (await mocStateV1.emaCalculationBlockSpan()).toNumber(),
        successFee: deployParameters.coreParams.successFee,
        appreciationFactor: deployParameters.coreParams.appreciationFactor,
        tcInterestRate: await mocInrateV1.riskProRate(),
        tcInterestPaymentBlockSpan: (await mocInrateV1.riskProInterestBlockSpan()).toNumber(),
      },
      settlementParams: {
        bes: (await mocSettlementV1.getBlockSpan()).toNumber(),
      },
      feeParams: {
        feeRetainer: deployParameters.feeParams.feeRetainer,
        mintFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.MINT_RISKPRO_FEES_RESERVE()),
        redeemFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.REDEEM_RISKPRO_FEES_RESERVE()),
        swapTPforTPFee: deployParameters.feeParams.swapTPforTPFee,
        swapTPforTCFee: deployParameters.feeParams.swapTPforTCFee,
        swapTCforTPFee: deployParameters.feeParams.swapTCforTPFee,
        redeemTCandTPFee: deployParameters.feeParams.redeemTCandTPFee,
        mintTCandTPFee: deployParameters.feeParams.mintTCandTPFee,
        feeTokenPct: deployParameters.feeParams.feeTokenPct,
      },
      mocAddresses: {
        governorAddress: await mocV1.governor(),
        collateralAssetAddress: await mocConnectorV1.reserveToken(),
        collateralTokenAddress: await mocConnectorV1.riskProToken(),
        pauserAddress: deployer,
        feeTokenAddress: await mocStateV1.getMoCToken(),
        feeTokenPriceProviderAddress: await mocStateV1.getMoCPriceProvider(),
        mocFeeFlowAddress: await mocInrateV1.commissionsAddress(),
        mocAppreciationBeneficiaryAddress: deployParameters.mocAddresses.mocAppreciationBeneficiaryAddress,
        vendorsGuardianAddress: await mocVendorsV1.getVendorGuardianAddress(),
        tcInterestCollectorAddress: await mocInrateV1.riskProInterestAddress(),
        authorizedExecutors: deployParameters.mocAddresses.authorizedExecutors,
      },
      tpParams: {
        tpParams: [
          {
            name: await mocConnectorV1.stableToken(), //use name here for stableToken address
            symbol: "",
            priceProvider: await mocStateV1.getPriceProvider(),
            ctarg: await mocStateV1.cobj(),
            mintFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.MINT_STABLETOKEN_FEES_RESERVE()),
            redeemFee: await mocInrateV1.commissionRatesByTxType(await mocInrateV1.REDEEM_STABLETOKEN_FEES_RESERVE()),
            initialEma: await mocStateV1.getLastEmaCalculation(),
            smoothingFactor: await mocStateV1.getSmoothingFactor(),
          },
        ],
      },
      queueParams: deployParameters.queueParams,
      gasLimit: deployParameters.gasLimit,
    };
  }
  return deployParameters;
};

export const addPeggedToken = async (
  hre: HardhatRuntimeEnvironment,
  mocRifV2: MocRif,
  governorAddress: string,
  tpParams?: TPParams[],
) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  if (hre.config.networks[network].mocV1Address && tpParams) {
    // add Legacy stableToken in MocV2
    await waitForTxConfirmation(
      mocRifV2.addPeggedToken({
        tpTokenAddress: tpParams[0].name,
        priceProviderAddress: tpParams[0].priceProvider,
        tpCtarg: tpParams[0].ctarg,
        tpMintFee: tpParams[0].mintFee,
        tpRedeemFee: tpParams[0].redeemFee,
        tpEma: tpParams[0].initialEma,
        tpEmaSf: tpParams[0].smoothingFactor,
      }),
    );
    console.log(`Transferring MocRif governance to executor: ${governorAddress}`);
    await waitForTxConfirmation(mocRifV2.changeGovernor(governorAddress));
  } else {
    // for testing we add some Pegged Token and then transfer governance to the real governor
    await addPeggedTokensAndChangeGovernor(hre, governorAddress, mocRifV2, { tpParams });
  }
};
