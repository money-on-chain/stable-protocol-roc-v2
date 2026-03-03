import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { rskMainnetChangerParams } from "../../../config/changers/mocVendorsUpgrade/mocVendorsUpgradeParams";
import mocVendorsUpgradeChangerDeployment from "../../../deployments/rskMainnet/MocVendorsUpgradeChanger.json";
import mocVendorsImplementationDeployment from "../../../deployments/rskMainnet/Rif_MocVendors_Implementation.json";
import type { IGovernor, MocVendors } from "../../../typechain";
import { IGovernor__factory, MocVendors__factory, Ownable__factory } from "../../../typechain";

const RSK_MAINNET_FORK_URL = "https://public-node.rsk.co";
const RSK_MAINNET_FORK_BLOCK = Math.max(
  Number(mocVendorsUpgradeChangerDeployment.receipt.blockNumber),
  Number(mocVendorsImplementationDeployment.receipt.blockNumber),
);
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

export const readProxyImplementation = async (proxyAddress: string): Promise<string> => {
  const rawStorage = await ethers.provider.getStorageAt(proxyAddress, IMPLEMENTATION_SLOT);
  return ethers.utils.getAddress(`0x${rawStorage.slice(-40)}`);
};

export type MocVendorsUpgradeForkFixture = {
  changerAddress: string;
  governor: IGovernor;
  governorOwner: string;
  implementationAddress: string;
  implementationBefore: string;
  maxVendorMarkup: string;
  mocVendors: MocVendors;
  mocVendorsAddress: string;
  vendors: string[];
};

export const mocVendorsUpgradeForkFixture = async (): Promise<MocVendorsUpgradeForkFixture> => {
  await reset(RSK_MAINNET_FORK_URL, RSK_MAINNET_FORK_BLOCK);

  const mocVendorsAddress = rskMainnetChangerParams.mocVendorsAddress;
  const changerAddress = mocVendorsUpgradeChangerDeployment.address;
  const implementationAddress = mocVendorsImplementationDeployment.address;
  const [, , maxVendorMarkup, vendors] = mocVendorsUpgradeChangerDeployment.args as [string, string, string, string[]];

  const signer = ethers.provider.getSigner();
  const mocVendors: MocVendors = MocVendors__factory.connect(mocVendorsAddress, signer);
  const governorAddress = await mocVendors.governor();
  const governor: IGovernor = IGovernor__factory.connect(governorAddress, signer);
  const governorOwner = await Ownable__factory.connect(governorAddress, signer).owner();

  const implementationBefore = await readProxyImplementation(mocVendorsAddress);

  return {
    changerAddress,
    governor,
    governorOwner,
    implementationAddress,
    implementationBefore,
    maxVendorMarkup,
    mocVendors,
    mocVendorsAddress,
    vendors,
  };
};
