import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNetworkChangerParams } from "../../../config/changers/commissionSplitterQueue-params";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");
  const {
    changer,
    gasLimit
  } = changerParams;

  const mocQueueImp = await deployments.getOrNull("MocQueue");
  if (!mocQueueImp) throw new Error("No mocQueueImp deployed.");

  const feesSplitterProxy = await deployments.getOrNull("FeesSplitterProxy");
  if (!feesSplitterProxy) throw new Error("No FeesSplitter deployed.");

  const commissionSplitterQueueChanger = (
    await deploy("CommissionSplitterQueueChanger", {
      from: deployer,
      args: [
        changer.mocCoreProxyAddress,
        mocQueueImp.address,
        changer.feeTokenPriceProvider,
        feesSplitterProxy.address
        ],
      gasLimit,
    })
  ).address;
  console.log(`CommissionSplitterQueueChanger deployed at: ${commissionSplitterQueueChanger}`);

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_CommissionSplitterQueueChanger"; // id required to prevent re-execution
deployFunc.tags = ["CommissionSplitterQueueChanger"];
deployFunc.dependencies = ["MocQueue_Imp", "FeesSplitter"];
