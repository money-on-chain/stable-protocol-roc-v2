import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getNetworkChangerParams } from "../../../config/changers/fixReverseAuctionProposal-params";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");
  const { changer, gasLimit } = changerParams;

  console.log("Deploying Changer ...");

  const fixReverseAuctionProposal = (
    await deploy("FixReverseAuctionProposal", {
      from: deployer,
      args: [
        changer.rocCoreProxy,
        changer.mocMocStateProxy,
        changer.upgradeDelegator,
        changer.mocFeeTokenPriceProvider,
        changer.rocFeeTokenPriceProvider,
        changer.revAucBTC2MOCProxy,
        changer.revAucBTC2MOCNewImplement,
        changer.mocCommissionSplitterV2,
        changer.rocCommissionSplitterV2,
        changer.mocFeeTokenAddressRecipient2,
        changer.rocFeeTokenAddressRecipient2,
        changer.revAuctionRIF2BTC,
        changer.revAuctionBTC2RIF,
        changer.revAuctionFee,
      ],
      gasLimit,
    })
  ).address;
  console.log(`FixReverseAuctionProposal deployed at: ${fixReverseAuctionProposal}`);

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_FixReverseAuctionProposal"; // id required to prevent re-execution
deployFunc.tags = ["FixReverseAuctionProposal"];
deployFunc.dependencies = [];
