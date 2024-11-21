import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNetworkChangerParams } from "../../../config/changers/flowChangeProposal-params";

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

  const tcInterestSplitterProxy = await deployments.getOrNull("TCInterestSplitterProxy");
  if (!tcInterestSplitterProxy) throw new Error("No tcInterestSplitterProxy deployed.");

  console.log("Deploying Changer ...")

  const flowChangeProposal = (
    await deploy("FlowChangeProposal", {
      from: deployer,
      args: [
        changer.mocCoreProxyAddress,
        mocQueueImp.address,
        changer.feeTokenPriceProvider,
        feesSplitterProxy.address,
        tcInterestSplitterProxy.address,
        changer.tcInterestPaymentBlockSpan.toString(),
        changer.settlementBlockSpan.toString(),
        changer.decayBlockSpan.toString(),
        changer.emaCalculationBlockSpan.toString()
        ],
      gasLimit,
    })
  ).address;
  console.log(`FlowChangeProposal deployed at: ${flowChangeProposal}`);

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_FlowChangeProposal"; // id required to prevent re-execution
deployFunc.tags = ["FlowChangeProposal"];
deployFunc.dependencies = ["MocQueue_Imp", "FeesSplitter", "TCInterestSplitter"];
