import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployUUPSArtifact } from "moc-main/export/scripts/utils";
import { fetchNetworkDeployParams } from "./utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { governorAddress, acTokenAddress, feeTokenAddress, tcInterestsSplitterParams, feesSplitterParams } =
    await fetchNetworkDeployParams(hre);

  await deployUUPSArtifact({
    hre,
    artifactBaseName: "TCInterestsSplitter",
    contract: "CommissionSplitter",
    initializeArgs: [
      governorAddress,
      acTokenAddress,
      feeTokenAddress,
      tcInterestsSplitterParams.acTokenAddressRecipient1,
      tcInterestsSplitterParams.acTokenAddressRecipient2,
      tcInterestsSplitterParams.acTokenPctToRecipient1,
      feesSplitterParams.feeTokenAddressRecipient1, // use feesSplitter params, this features is not used in splitter
      feesSplitterParams.feeTokenAddressRecipient2, // use feesSplitter params, this features is not used in splitter
      feesSplitterParams.feeTokenPctToRecipient1, // use feesSplitter params, this features is not used in splitter
    ],
  });

  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "deployed_TCInterestsSplitter"; // id required to prevent re-execution
deployFunc.tags = ["TCInterestsSplitter"];
