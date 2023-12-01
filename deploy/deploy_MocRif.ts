import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import {
  addPeggedTokensAndChangeGovernor,
  deployUUPSArtifact,
  waitForTxConfirmation,
} from "moc-main/export/scripts/utils";
import { MocRif__factory, MocTC__factory, MoC__factory } from "../typechain";
import { getOrFetchNetworkDeployParams } from "../scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { coreParams, settlementParams, feeParams, ctParams, tpParams, mocAddresses, gasLimit } =
    await getOrFetchNetworkDeployParams(hre);
  const signer = ethers.provider.getSigner();

  const deployedMocExpansionContract = await deployments.getOrNull("MocRifExpansion");
  if (!deployedMocExpansionContract) throw new Error("No MocRifExpansion deployed.");

  const deployedMocVendors = await deployments.getOrNull("MocRifVendorsProxy");
  if (!deployedMocVendors) throw new Error("No MocRifVendors deployed.");

  const deployedMocQueue = await deployments.getOrNull("MocRifQueueProxy");
  if (!deployedMocQueue) throw new Error("No MocRifQueue deployed.");
  const mocQueue = await ethers.getContractAt("MocQueue", deployedMocQueue.address, signer);

  let {
    collateralAssetAddress,
    collateralTokenAddress,
    governorAddress,
    feeTokenAddress,
    feeTokenPriceProviderAddress,
    mocFeeFlowAddress,
    mocAppreciationBeneficiaryAddress,
    tcInterestCollectorAddress,
    maxAbsoluteOpProviderAddress,
    maxOpDiffProviderAddress,
  } = mocAddresses;

  let stopperAddress: string;

  // for live networks we get the real stopper contract address if mocV1 address is provided
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;

  if (hre.network.tags.migration) {
    if (!hre.config.networks[network].mocV1Address) throw Error("mocV1Address cannot be null on migration");
    if (!hre.config.networks[network].mocV1Address) throw Error("mocV1Address cannot be null on migration");
    if (!governorAddress) throw Error("governorAddress cannot be null on migration");
  }

  if (hre.config.networks[network].mocV1Address) {
    const mocV1Address = hre.config.networks[network].mocV1Address!;
    const mocV1 = MoC__factory.connect(mocV1Address, signer);
    stopperAddress = await mocV1.stopper();
  } else {
    stopperAddress = mocAddresses.pauserAddress;
  }

  if (!stopperAddress) {
    stopperAddress = deployer;
    console.log(`pauser address for MocRif set at deployer: ${stopperAddress}`);
  }

  let collateralTokenDeployed;
  if (!hre.network.tags.migration) {
    // if governor address is not provided we use the mock one
    if (!governorAddress) {
      const governorMock = (
        await deploy("GovernorMock", {
          from: deployer,
        })
      ).address;
      governorAddress = governorMock;
      console.log(`using a governorMock for MocRif at: ${governorAddress}`);
    }

    if (!collateralTokenAddress) {
      collateralTokenAddress = (
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
      collateralTokenDeployed = true;
    }
  }

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
        pauserAddress: hre.network.tags.migration ? deployer : stopperAddress, // for migration use deployer and set the real one on the changer
        mocCoreExpansion: deployedMocExpansionContract.address,
        emaCalculationBlockSpan: coreParams.emaCalculationBlockSpan,
        mocVendors: deployedMocVendors.address,
      },
      acTokenAddress: collateralAssetAddress,
      mocQueue: deployedMocQueue.address,
    },
  ];

  const mocRif = await deployUUPSArtifact({
    hre,
    contract: "MocRif",
    initializeArgs,
  });

  if (collateralTokenDeployed) {
    console.log("Delegating CT roles to Moc");
    // Assign TC Roles, and renounce deployer ADMIN
    await waitForTxConfirmation(
      MocTC__factory.connect(collateralTokenAddress, signer).transferAllRoles(mocRif.address),
    );
  }

  if (hre.network.tags.migration) {
    console.log("pausing MocRif until migration from V1 has been completed...");
    // pause
    await waitForTxConfirmation(MocRif__factory.connect(mocRif.address, signer).pause({ gasLimit }));
  } else {
    console.log(`Registering mocRif bucket as enqueuer: ${mocRif.address}`);
    await waitForTxConfirmation(mocQueue.registerBucket(mocRif.address, { gasLimit }));

    // for testing we add some Pegged Token and then transfer governance to the real governor
    const mocRifV2 = MocRif__factory.connect(mocRif.address, signer);

    if (tpParams) {
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
  }

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRif"; // id required to prevent re-execution
deployFunc.tags = ["MocRif"];
deployFunc.dependencies = ["MocRifExpansion", "MocRifQueue", "MocRifVendors"];
