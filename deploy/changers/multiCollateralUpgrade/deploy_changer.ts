import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { network } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/multiCollateralUpgrade_params";
import { fetchNetworkDeployParams, deployUUPSArtifact } from "./utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { gasLimit, ...changerParams } = getNetworkChangerParams(hre);

  const { governorAddress, pauserAddress, rifPrice } = await fetchNetworkDeployParams(hre);

  // deploy MocMultiCollateralGuard
  console.log(`
  ########################################################################
  ################## Deploying MocMultiCollateralGuard ###################
  ########################################################################
`);

  const deployedMocMultiCollateralGuard = await deployUUPSArtifact({
    hre,
    artifactBaseName: "Rif_MocMultiCollateralGuard",
    contract: "MocMultiCollateralGuard",
    initializeArgs: [
      governorAddress,
      pauserAddress,
      changerParams.multiCollateralParams.microLiquidationExecCost,
      changerParams.multiCollateralParams.liquidationExecCost,
      changerParams.multiCollateralParams.maxOperPerBatch,
      changerParams.multiCollateralParams.useMaxLastPublicationBlock,
    ],
  });

  // deploy MocQueue
  console.log(`
    ########################################################################
    ################## Deploying MocQueue ##########################
    ########################################################################
  `);
  const deployedMocQueue = await deployUUPSArtifact({
    hre,
    artifactBaseName: "Rif_MocQueue",
    contract: "moc-main/contracts/queue/MocQueue.sol:MocQueue",
    initializeArgs: [
      governorAddress,
      pauserAddress,
      deployedMocMultiCollateralGuard.address,
      changerParams.queueParams.minOperWaitingBlk,
      changerParams.queueParams.maxOperWaitingBlk,
      changerParams.queueParams.execCostParams,
    ],
  });

  // deploy MocCoreRifImplementation
  console.log(`
    ########################################################################
    ################## Deploying MocCoreRifImplementation ##########################
    ########################################################################
  `);

  const deployedMocRifImplementation = await deploy("Rif_MocCARC20Proxy_Implementation", {
    contract: "MocRif",
    from: deployer,
    gasLimit,
  });

  console.log(`MocCoreRifImplementation deployed at: ${deployedMocRifImplementation.address}`);

  // deploy USDRifImplementation
  console.log(`
    ########################################################################
    ################## Deploying USDRifImplementation ##########################
    ########################################################################
  `);

  const deployedUSDRif = await deploy("USDRif_Implementation", {
    contract: "StableTokenV2",
    from: deployer,
    gasLimit,
  });
  console.log(`USDRif_Implementation deployed at: ${deployedUSDRif.address}`);

  // deploy MocCoreExpansion
  console.log(`
    ########################################################################
    ################## Deploying MocCoreExpansion ##########################
    ########################################################################
  `);

  const deployedMocCoreExpansion = await deploy("Rif_MocCoreExpansion", {
    contract: "moc-main/contracts/core/MocCoreExpansion.sol:MocCoreExpansion",
    from: deployer,
    gasLimit,
  });

  console.log(`Rif_MocCoreExpansion deployed at: ${deployedMocCoreExpansion.address}`);

  if (network.tags.testing && !changerParams.rifPriceProvider) {
    // deploy PriceProviderMock
    console.log(`
    ########################################################################
    ### [TESTING] ##### Deploying PriceProviderMock ########################
    ########################################################################
  `);

    const deployedRifPriceProviderMock = await deploy("Rif_PriceProviderMock", {
      contract: "moc-main/contracts/mocks/PriceProviderMock.sol:PriceProviderMock",
      args: [rifPrice],
      from: deployer,
      gasLimit,
    });
    console.log(`Rif_PriceProviderMock deployed at: ${deployedRifPriceProviderMock.address} with price ${rifPrice}`);
    changerParams.rifPriceProvider = deployedRifPriceProviderMock.address;
  }

  const multiCollateralUpgradeChanger = (
    await deploy("MultiCollateralUpgradeChanger", {
      from: deployer,
      args: [
        changerParams.mocCoreAddress,
        deployedMocRifImplementation.address,
        deployedUSDRif.address,
        deployedMocCoreExpansion.address,
        deployedMocQueue.address,
        changerParams.rifPriceProvider,
        changerParams.blockSpan,
      ],
      gasLimit,
    })
  ).address;
  console.log(`MultiCollateralUpgradeChanger deployed at: ${multiCollateralUpgradeChanger}`);

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MultiCollateralUpgradeChanger"; // id required to prevent re-execution
deployFunc.tags = ["MultiCollateralUpgradeChanger"];
