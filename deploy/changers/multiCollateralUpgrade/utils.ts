import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/multiCollateralUpgrade_params";
import { MocCARC20__factory } from "../../../typechain";
import { IPriceProvider__factory } from "../../../typechain/factories/moc-main/contracts/interfaces";

export const fetchNetworkDeployParams = async (hre: HardhatRuntimeEnvironment) => {
  if (hre.network.tags.local) {
    const helpers = require("@nomicfoundation/hardhat-network-helpers");
    await helpers.reset("https://public-node.rsk.co", 7240000);
  }
  const { mocCoreAddress } = getNetworkChangerParams(hre);

  console.log(`###### fetching parameters from Roc: ${mocCoreAddress} ######`);

  const [signer] = await ethers.getSigners();

  const mocProxy = MocCARC20__factory.connect(mocCoreAddress, signer);
  const [, rifPriceProviderAddress] = await mocProxy.pegContainer(0);

  const rifPriceProvider = IPriceProvider__factory.connect(rifPriceProviderAddress, signer);
  return {
    governorAddress: await mocProxy.governor(),
    pauserAddress: await mocProxy.pauser(),
    rifPrice: BigInt((await rifPriceProvider.peek())[0]),
  };
};

export const deployUUPSArtifact = async ({
  hre,
  artifactBaseName,
  contract,
  initializeArgs,
}: {
  hre: HardhatRuntimeEnvironment;
  artifactBaseName?: string;
  contract: string;
  initializeArgs?: any[];
}) => {
  const {
    deployments: { deploy },
    getNamedAccounts,
  } = hre;
  const { deployer } = await getNamedAccounts();
  const gasLimit = getNetworkChangerParams(hre).gasLimit;
  artifactBaseName = artifactBaseName || contract;
  let execute;
  if (initializeArgs) {
    execute = {
      init: {
        methodName: "initialize",
        args: initializeArgs,
      },
    };
  }

  const deployResult = await deploy(`${artifactBaseName}Proxy`, {
    contract,
    from: deployer,
    proxy: {
      proxyContract: "ERC1967Proxy",
      proxyArgs: ["{implementation}", "{data}"],
      execute,
    },
    gasLimit,
  });
  console.log(`${contract}, as ${artifactBaseName} implementation deployed at ${deployResult.implementation}`);
  console.log(`${artifactBaseName}Proxy ERC1967Proxy deployed at ${deployResult.address}`);
  return deployResult;
};
