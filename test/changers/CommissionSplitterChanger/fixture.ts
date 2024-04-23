import hre, { deployments } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/commissionSplitter-params";
import {
  MocCARC20,
  MocCARC20__factory,
  CommissionSplitterChanger,
  CommissionSplitterChanger__factory,
} from "../../../typechain";

export type Contracts = {
  mocCore: MocCARC20;
  changer: CommissionSplitterChanger;
};

export const fixtureDeployed = (): (() => Promise<Contracts>) => {
  return deployments.createFixture(async ({ ethers }) => {
    await deployments.fixture(["CommissionSplitterChanger"]);
    const changerParams = getNetworkChangerParams(hre);
    const {
      addresses: { mocCoreProxyAddress },
    } = changerParams;
    const signer = ethers.provider.getSigner();

    const mocCore = MocCARC20__factory.connect(mocCoreProxyAddress, signer);

    const changerDeployed = await deployments.getOrNull("CommissionSplitterChanger");
    if (!changerDeployed) throw new Error("No CommissionSplitterChanger deployed.");
    const changer = CommissionSplitterChanger__factory.connect(changerDeployed.address, signer);

    return {
      mocCore,
      changer,
    };
  });
};
