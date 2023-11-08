import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployUUPSArtifact } from "moc-main/export/scripts/utils";
import { getOrFetchNetworkDeployParams } from "../scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { mocAddresses } = await getOrFetchNetworkDeployParams(hre);

  let { governorAddress, pauserAddress, vendorsGuardianAddress } = mocAddresses;

  if (!pauserAddress) {
    pauserAddress = deployer;
    console.log(`pauser address for MocRifVendors set at deployer: ${pauserAddress}`);
  }

  // for tests and testnet we deploy a Governor Mock
  if (!governorAddress) {
    const governorMockFactory = await deploy("GovernorMock", {
      from: deployer,
    });
    governorAddress = governorMockFactory.address;
    console.log(`using a governorMock for MocRifVendors at: ${governorAddress}`);
  }

  await deployUUPSArtifact({
    hre,
    artifactBaseName: "MocRifVendors",
    contract: "MocVendors",
    initializeArgs: [vendorsGuardianAddress, governorAddress, pauserAddress],
  });

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRifVendors"; // id required to prevent re-execution
deployFunc.tags = ["MocRifVendors"];
