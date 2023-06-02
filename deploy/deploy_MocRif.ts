import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { deployUUPSArtifact, waitForTxConfirmation } from "moc-main/export/scripts/utils";
import { MocRif__factory } from "../typechain";
import { addPeggedToken, getOrFetchNetworkDeployParams } from "../scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { coreParams, settlementParams, feeParams, tpParams, mocAddresses, gasLimit } =
    await getOrFetchNetworkDeployParams(hre);
  const signer = ethers.provider.getSigner();

  const deployedMocExpansionContract = await deployments.getOrNull("MocRifExpansion");
  if (!deployedMocExpansionContract) throw new Error("No MocRifExpansion deployed.");

  const deployedMocVendors = await deployments.getOrNull("MocVendorsRifProxy");
  if (!deployedMocVendors) throw new Error("No MocVendors deployed.");
  const MocVendors = await ethers.getContractAt("MocVendors", deployedMocVendors.address, signer);

  let {
    collateralAssetAddress,
    collateralTokenAddress,
    governorAddress,
    feeTokenAddress,
    feeTokenPriceProviderAddress,
    mocFeeFlowAddress,
    mocAppreciationBeneficiaryAddress,
    tcInterestCollectorAddress,
  } = mocAddresses;

  let governorMock;
  // for tests and testnet we deploy a Governor Mock
  if (hre.network.tags.testnet || hre.network.tags.local) {
    const governorMockFactory = await deploy("GovernorMock", {
      from: deployer,
    });
    governorMock = governorMockFactory.address;
  }

  const mocCARC20 = await deployUUPSArtifact({
    hre,
    contract: "MocRif",
    initializeArgs: [
      {
        initializeCoreParams: {
          initializeBaseBucketParams: {
            feeTokenAddress,
            feeTokenPriceProviderAddress,
            tcTokenAddress: collateralTokenAddress,
            mocFeeFlowAddress,
            mocAppreciationBeneficiaryAddress,
            protThrld: coreParams.protThrld,
            liqThrld: coreParams.liqThrld,
            feeRetainer: feeParams.feeRetainer,
            tcMintFee: feeParams.mintFee,
            tcRedeemFee: feeParams.redeemFee,
            swapTPforTPFee: feeParams.swapTPforTPFee,
            swapTPforTCFee: feeParams.swapTPforTCFee,
            swapTCforTPFee: feeParams.swapTCforTPFee,
            redeemTCandTPFee: feeParams.redeemTCandTPFee,
            mintTCandTPFee: feeParams.mintTCandTPFee,
            feeTokenPct: feeParams.feeTokenPct,
            successFee: coreParams.successFee,
            appreciationFactor: coreParams.appreciationFactor,
            bes: settlementParams.bes,
            tcInterestCollectorAddress,
            tcInterestRate: coreParams.tcInterestRate,
            tcInterestPaymentBlockSpan: coreParams.tcInterestPaymentBlockSpan,
          },
          governorAddress: governorMock || governorAddress,
          pauserAddress: deployer,
          mocCoreExpansion: deployedMocExpansionContract.address,
          emaCalculationBlockSpan: coreParams.emaCalculationBlockSpan,
          mocVendors: MocVendors.address,
        },
        acTokenAddress: collateralAssetAddress!,
      },
    ],
  });
  console.log("pausing MocRif until migration from V1 has been completed...");
  // pause
  await waitForTxConfirmation(MocRif__factory.connect(mocCARC20.address, signer).pause({ gasLimit }));
  // add stable token
  await addPeggedToken(hre, MocRif__factory.connect(mocCARC20.address, signer), governorAddress, tpParams?.tpParams);
  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRif"; // id required to prevent re-execution
deployFunc.tags = ["MocRif"];
deployFunc.dependencies = ["MocRifExpansion", "MocVendorsRif"];
