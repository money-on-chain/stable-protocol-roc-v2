import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNetworkDeployParams } from "moc-main/export/scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const gasLimit = getNetworkDeployParams(hre).gasLimit;
  const deployImplResult = await deploy("MocRif", {
    contract: "MocRif",
    from: deployer,
    gasLimit,
  });
  console.log(`MocRif, as MocRif implementation deployed at ${deployImplResult.address}`);
  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_MocRif_Imp"; // id required to prevent re-execution
deployFunc.tags = ["MocRif_Imp"];
