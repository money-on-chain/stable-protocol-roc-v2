import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNetworkChangerParams } from "../../../config/changers/mocVendorsUpgrade/mocVendorsUpgradeParams";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { mocVendorsAddress, maxVendorMarkup, vendors, gasLimit } = getNetworkChangerParams(hre);

  console.log(`
    ########################################################################
    ################## Deploying MocVendorsImplementation ##########################
    ########################################################################
  `);

  const deployedMocVendorsImplementation = await deploy("Rif_MocVendors_Implementation", {
    contract: "MocVendors",
    from: deployer,
    gasLimit,
  });

  console.log(`MocVendorsImplementation deployed at: ${deployedMocVendorsImplementation.address}`);

  console.log(`
    ########################################################################
    ################## Deploying MocVendorsUpgradeChanger ##########################
    ########################################################################
  `);

  const mocVendorsUpgradeChanger = (
    await deploy("MocVendorsUpgradeChanger", {
      from: deployer,
      args: [mocVendorsAddress, deployedMocVendorsImplementation.address, maxVendorMarkup, vendors],
      gasLimit,
    })
  ).address;
  console.log(`MocVendorsUpgradeChanger deployed at: ${mocVendorsUpgradeChanger}`);

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocVendorsUpgradeChanger"; // id required to prevent re-execution
deployFunc.tags = ["MocVendorsUpgradeChanger"];
