import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import {
  addPeggedTokensAndChangeGovernor,
  deployUUPSArtifact,
  waitForTxConfirmation,
} from "moc-main/export/scripts/utils";
import { getNetworkDeployParams } from "../scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const deployParams = getNetworkDeployParams(hre);
  if (!deployParams.deploy) throw new Error("No deploy params config found.");
  const { mocAddresses, coreParams, settlementParams, feeParams, ctParams, queueParams, tpParams, gasLimit } =
    deployParams.deploy;
  const signer = ethers.provider.getSigner();

  const deployedMocExpansionContract = await deployments.getOrNull("MocRifExpansion");
  if (!deployedMocExpansionContract) throw new Error("No MocRifExpansion deployed.");

  let {
    collateralAssetAddress,
    governorAddress,
    pauserAddress,
    feeTokenAddress,
    feeTokenPriceProviderAddress,
    mocFeeFlowAddress,
    mocAppreciationBeneficiaryAddress,
    tcInterestCollectorAddress,
    vendorsGuardianAddress,
    maxAbsoluteOpProviderAddress,
    maxOpDiffProviderAddress,
  } = mocAddresses;

  let stopperAddress = pauserAddress;

  if (!pauserAddress) {
    pauserAddress = deployer;
    stopperAddress = deployer;
    console.log(`pauser address for MocRif set at deployer: ${stopperAddress}`);
  }

  // We need a governor Mock for intermediate protected actions
  const governorMock = (
    await deploy("GovernorMock", {
      from: deployer,
    })
  ).address;
  console.log(`using a governorMock for MocRif at: ${governorMock}`);
  let governorProvided = true;
  if (!governorAddress) {
    governorProvided = false;
    governorAddress = governorMock;
  }

  const collateralTokenAddress = (
    await deployUUPSArtifact({
      hre,
      artifactBaseName: "CollateralToken",
      contract: "MocTC",
      initializeArgs: [
        ctParams.name,
        ctParams.symbol,
        deployer, // proper Moc roles are gonna be assigned after it's deployed
        governorAddress,
      ],
    })
  ).address;

  const mocQueue = await deployUUPSArtifact({
    hre,
    artifactBaseName: "MocRifQueue",
    contract: "MocQueue",
    initializeArgs: [
      governorMock,
      pauserAddress,
      queueParams.minOperWaitingBlk,
      queueParams.maxOperPerBatch,
      queueParams.execFeeParams,
    ],
  });

  const mocQueueProxy = await ethers.getContractAt("MocQueue", mocQueue.address, signer);

  const mocVendorsDeployed = await deployUUPSArtifact({
    hre,
    artifactBaseName: "MocRifVendors",
    contract: "MocVendors",
    initializeArgs: [vendorsGuardianAddress, governorAddress, pauserAddress],
  });

  if (!maxAbsoluteOpProviderAddress) {
    const deployImplResult = await deploy("FCMaxAbsoluteOpProvider", {
      from: deployer,
      args: [stopperAddress],
      gasLimit,
    });
    console.log(`FCMaxAbsoluteOpProvider deployed at ${deployImplResult.address} with owner at ${stopperAddress}`);
    maxAbsoluteOpProviderAddress = deployImplResult.address;
  }

  if (!maxOpDiffProviderAddress) {
    const deployImplResult = await deploy("FCMaxOpDifferenceProvider", {
      from: deployer,
      args: [stopperAddress],
      gasLimit,
    });
    console.log(`FCMaxOpDifferenceProvider deployed at ${deployImplResult.address} with owner at ${stopperAddress}`);
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
        governorAddress: tpParams ? governorMock : governorAddress, // Use mock to add TPs
        pauserAddress: stopperAddress,
        mocCoreExpansion: deployedMocExpansionContract.address,
        emaCalculationBlockSpan: coreParams.emaCalculationBlockSpan,
        mocVendors: mocVendorsDeployed.address,
      },
      acTokenAddress: collateralAssetAddress,
    },
  ];

  console.log("Initializing MocRif with:", initializeArgs[0]);

  const mocRif = await deployUUPSArtifact({
    hre,
    contract: "MocRif",
    initializeArgs,
  });

  console.log("Delegating CT roles to Moc");

  const mocTCProxy = await ethers.getContractAt("MocTC", collateralTokenAddress, signer);
  // Assign TC Roles, and renounce deployer ADMIN
  await waitForTxConfirmation(mocTCProxy.transferAllRoles(mocRif.address));

  console.log(`Registering mocRif bucket as enqueuer: ${mocRif.address}`);
  await waitForTxConfirmation(mocQueueProxy.registerBucket(mocRif.address, { gasLimit }));

  if (governorProvided) {
    console.log(`Restating Queue governor: ${governorAddress} after registration`);
    await waitForTxConfirmation(
      mocQueueProxy.changeGovernor(governorAddress, {
        gasLimit,
      }),
    );
  }

  if (tpParams) {
    // for testing we add some Pegged Token and then transfer governance to the real governor
    const mocRifV2 = await ethers.getContractAt("MocRif", mocRif.address, signer);
    for (let tpParam of tpParams.tpParams) {
      if (!tpParam.priceProvider) {
        const tpPriceProvider = await deploy("PriceProviderMock", {
          from: deployer,
          args: [ethers.utils.parseEther("1")],
          gasLimit,
        });
        tpParam.priceProvider = tpPriceProvider.address;
        console.log(`Deploying Fake PriceProvider for ${tpParam.name} at ${tpPriceProvider.address}`);
      }
    }
    await addPeggedTokensAndChangeGovernor(hre, governorAddress, mocRifV2, tpParams);
  }

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRif"; // id required to prevent re-execution
deployFunc.tags = ["MocRifDeploy"];
deployFunc.dependencies = ["MocRifExpansion"];
