import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNetworkChangerParams } from "../../../config/changers/commissionSplitter-params";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");
  const {
    addresses: { upgradeDelegatorAddress, newCommissionSplitterV2Address, mocCoreProxyAddress },
    gasLimit,
  } = changerParams;

  const feesSplitterProxy = await deployments.getOrNull("FeesSplitterProxy");
  if (!feesSplitterProxy) throw new Error("No FeesSplitter deployed.");

  const tcInterestsSplitterProxy = await deployments.getOrNull("TCInterestsSplitterProxy");
  if (!tcInterestsSplitterProxy) throw new Error("No TCInterestsSplitter deployed.");

  const commissionSplitterChanger = (
    await deploy("CommissionSplitterChanger", {
      from: deployer,
      args: [
        upgradeDelegatorAddress,
        mocCoreProxyAddress,
        newCommissionSplitterV2Address,
        feesSplitterProxy.address,
        tcInterestsSplitterProxy.address,
      ],
      gasLimit,
    })
  ).address;
  console.log(`CommissionSplitterChanger deployed at: ${commissionSplitterChanger}`);

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_CommissionSplitterChanger"; // id required to prevent re-execution
deployFunc.tags = ["CommissionSplitterChanger"];
deployFunc.dependencies = ["FeesSplitter", "TCInterestsSplitter"];
