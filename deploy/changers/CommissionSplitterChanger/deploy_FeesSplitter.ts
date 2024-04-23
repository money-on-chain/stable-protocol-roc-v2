import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployUUPSArtifact } from "moc-main/export/scripts/utils";
import { fetchNetworkDeployParams } from "./utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { governorAddress, acTokenAddress, feeTokenAddress, feesSplitterParams } = await fetchNetworkDeployParams(hre);

  await deployUUPSArtifact({
    hre,
    artifactBaseName: "FeesSplitter",
    contract: "CommissionSplitter",
    initializeArgs: [
      governorAddress,
      acTokenAddress,
      feeTokenAddress,
      feesSplitterParams.acTokenAddressRecipient1,
      feesSplitterParams.acTokenAddressRecipient2,
      0, // not relevant, it will be overwritten on the changer
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
