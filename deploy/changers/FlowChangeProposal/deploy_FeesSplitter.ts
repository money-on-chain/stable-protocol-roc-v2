import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployUUPSArtifact } from "moc-main/export/scripts/utils";
import { getNetworkChangerParams } from "../../../config/changers/flowChangeProposal-params";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {

  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");
  const {
    feesSplitterParams,
  } = changerParams;

  await deployUUPSArtifact({
    hre,
    artifactBaseName: "FeesSplitter",
    contract: "CommissionSplitter",
    initializeArgs: [
      feesSplitterParams.governorAddress,
      feesSplitterParams.acTokenAddress,
      feesSplitterParams.feeTokenAddress,
      feesSplitterParams.acTokenAddressRecipient1,
      feesSplitterParams.acTokenAddressRecipient2,
      feesSplitterParams.acTokenPctToRecipient1,
      feesSplitterParams.feeTokenAddressRecipient1,
      feesSplitterParams.feeTokenAddressRecipient2,
      feesSplitterParams.feeTokenPctToRecipient1,
    ],
  });

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_FeesSplitter"; // id required to prevent re-execution
deployFunc.tags = ["FeesSplitter"];
