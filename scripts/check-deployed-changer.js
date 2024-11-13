//import hre, { ethers } from "hardhat";

// scripts/index.js
async function main () {
  // Our code will go here
  // Retrieve accounts from the local node
  console.log("Running script");

  const { deployments, getNamedAccounts } = hre;

  const mocQueueImp = await deployments.getOrNull("MocQueue");
  if (!mocQueueImp) throw new Error("No mocQueueImp deployed.");

  const feesSplitterProxy = await deployments.getOrNull("FeesSplitterProxy");
  if (!feesSplitterProxy) throw new Error("No FeesSplitter deployed.");

  const flowChangeProposal = await deployments.getOrNull("FlowChangeProposal");
  if (!flowChangeProposal) throw new Error("No Changer deployed.");


  const accounts = (await ethers.getSigners()).map(signer => signer.address);
  console.log(accounts);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
