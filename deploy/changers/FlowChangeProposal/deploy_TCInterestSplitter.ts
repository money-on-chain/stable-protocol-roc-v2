import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployUUPSArtifact } from "moc-main/export/scripts/utils";
import { getNetworkChangerParams } from "../../../config/changers/flowChangeProposal-params";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");
  const {
    tcInterestSplitterParams,
  } = changerParams;

  await deployUUPSArtifact({
    hre,
    artifactBaseName: "TCInterestSplitter",
    contract: "CommissionSplitter",
    initializeArgs: [
      tcInterestSplitterParams.governorAddress,
      tcInterestSplitterParams.acTokenAddress,
      tcInterestSplitterParams.feeTokenAddress,
      tcInterestSplitterParams.acTokenAddressRecipient1,
      tcInterestSplitterParams.acTokenAddressRecipient2,
      tcInterestSplitterParams.acTokenPctToRecipient1,
      tcInterestSplitterParams.feeTokenAddressRecipient1,
      tcInterestSplitterParams.feeTokenAddressRecipient2,
      tcInterestSplitterParams.feeTokenPctToRecipient1,
    ],
  });

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_TCInterestSplitter"; // id required to prevent re-execution
deployFunc.tags = ["TCInterestSplitter"];
