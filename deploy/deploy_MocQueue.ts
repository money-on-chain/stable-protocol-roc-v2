import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { deployUUPSArtifact, waitForTxConfirmation } from "moc-main/export/scripts/utils";
import { getOrFetchNetworkDeployParams, EXECUTOR_ROLE } from "../scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { mocAddresses, queueParams } = await getOrFetchNetworkDeployParams(hre);
  const signer = ethers.provider.getSigner();

  let { pauserAddress } = mocAddresses;

  if (!pauserAddress) {
    pauserAddress = deployer;
    console.log(`pauser address for MocRifQueue set at deployer: ${pauserAddress}`);
  }

  // use a governorMock to initialization and later transfer to the real one
  const governorMock = (
    await deploy("GovernorMock", {
      from: deployer,
    })
  ).address;

  const mocQueue = await deployUUPSArtifact({
    hre,
    artifactBaseName: "MocRifQueue",
    contract: "MocQueue",
    initializeArgs: [governorMock, pauserAddress, queueParams.minOperWaitingBlk, queueParams.execFeeParams],
  });

  const mocQueueProxy = await ethers.getContractAt("MocQueue", mocQueue.address, signer);

  if (hre.network.tags.testnet || hre.network.tags.local) {
    console.log(`Whitelisting queue executor: ${deployer}`);
    await waitForTxConfirmation(mocQueueProxy.grantRole(EXECUTOR_ROLE, deployer));
  }
  for (let authorizedExecutor in mocAddresses.authorizedExecutors) {
    console.log(`Whitelisting queue executor: ${authorizedExecutor}`);
    await waitForTxConfirmation(mocQueueProxy.grantRole(EXECUTOR_ROLE, authorizedExecutor));
  }

  // TODO: IMPORTANT: deployer needs to renounce to ADMIN_ROLE,
  // but if we're gonna do bucket adding by governance, init fnc needs to change.

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRifQueue"; // id required to prevent re-execution
deployFunc.tags = ["MocRifQueue"];
deployFunc.dependencies = [];
