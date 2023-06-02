import { DeployFunction } from "hardhat-deploy/types";
import { deployVendors } from "moc-main/export/scripts/utils";

const deployFunc: DeployFunction = deployVendors("MocVendorsRif");
export default deployFunc;

deployFunc.id = "deployed_MocVendorsRif"; // id required to prevent re-execution
deployFunc.tags = ["MocVendorsRif"];
