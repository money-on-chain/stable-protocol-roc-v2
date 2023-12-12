import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployUUPSArtifact } from "moc-main/export/scripts/utils";
import { DeployParameters } from "moc-main/export/scripts/types";
import { fetchNetworkDeployParams } from "../scripts/utils";
import { MigrateParameters } from "../hardhat.base.config";

// Combined Type withe all migration initialization config params
export type RifFullDeployParameters = Omit<DeployParameters, "mocAddresses" | "ctParams"> &
  Omit<MigrateParameters, "mocV1Address"> & {
    mocAddresses: Omit<
      DeployParameters["mocAddresses"],
      "maxAbsoluteOpProviderAddress" | "maxOpDiffProviderAddress"
    > & {
      collateralTokenAddress: string;
      maxAbsoluteOpProviderAddress?: string;
      maxOpDiffProviderAddress?: string;
    };
  };

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const params = await fetchNetworkDeployParams(hre);

  const deployedMocExpansionContract = await deployments.getOrNull("MocRifExpansion");
  if (!deployedMocExpansionContract) throw new Error("No MocRifExpansion deployed.");

  let {
    coreParams,
    feeParams,
    settlementParams,
    gasLimit,
    queueParams,
    mocAddresses: {
      collateralAssetAddress,
      collateralTokenAddress,
      governorAddress,
      feeTokenAddress,
      pauserAddress,
      feeTokenPriceProviderAddress,
      mocFeeFlowAddress,
      mocAppreciationBeneficiaryAddress,
      tcInterestCollectorAddress,
      vendorsGuardianAddress,
      maxAbsoluteOpProviderAddress,
      maxOpDiffProviderAddress,
    },
  } = params;

  const deployedMocVendors = await deployUUPSArtifact({
    hre,
    artifactBaseName: "MocRifVendors",
    contract: "MocVendors",
    initializeArgs: [vendorsGuardianAddress, governorAddress, pauserAddress],
  });

  const mocQueue = await deployUUPSArtifact({
    hre,
    artifactBaseName: "MocRifQueue",
    contract: "MocQueue",
    initializeArgs: [
      governorAddress,
      pauserAddress,
      queueParams.minOperWaitingBlk,
      queueParams.maxOperPerBatch,
      queueParams.execFeeParams,
    ],
  });

  if (!maxAbsoluteOpProviderAddress) {
    const deployImplResult = await deploy("FCMaxAbsoluteOpProvider", {
      from: deployer,
      args: [pauserAddress],
      gasLimit,
    });
    console.log(`FCMaxAbsoluteOpProvider deployed at ${deployImplResult.address} with owner at ${pauserAddress}`);
    maxAbsoluteOpProviderAddress = deployImplResult.address;
  }

  if (!maxOpDiffProviderAddress) {
    const deployImplResult = await deploy("FCMaxOpDifferenceProvider", {
      from: deployer,
      args: [pauserAddress],
      gasLimit,
    });
    console.log(`FCMaxOpDifferenceProvider deployed at ${deployImplResult.address} with owner at ${pauserAddress}`);
    maxOpDiffProviderAddress = deployImplResult.address;
  }

  const initializeArgs = [
    {
      initializeCoreParams: {
        initializeBaseBucketParams: {
          mocQueueAddress: mocQueue.address,
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
          decayBlockSpan: coreParams.decayBlockSpan,
          maxAbsoluteOpProviderAddress,
          maxOpDiffProviderAddress,
        },
        governorAddress: governorAddress,
        pauserAddress,
        mocCoreExpansion: deployedMocExpansionContract.address,
        emaCalculationBlockSpan: coreParams.emaCalculationBlockSpan,
        mocVendors: deployedMocVendors.address,
      },
      acTokenAddress: collateralAssetAddress,
    },
  ];

  console.log("Initializing MocRif with:", initializeArgs[0]);

  await deployUUPSArtifact({
    hre,
    contract: "MocRif",
    initializeArgs,
  });

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRif"; // id required to prevent re-execution
deployFunc.tags = ["MocRifMigrate"];
deployFunc.dependencies = ["MocRifExpansion"];
