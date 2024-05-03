import hre, { deployments } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/commissionSplitter-params";
import {
  MocCARC20,
  MocCARC20__factory,
  CommissionSplitterChanger,
  CommissionSplitterChanger__factory,
  CommissionSplitter__factory,
  CommissionSplitter,
} from "../../../typechain";

export type Contracts = {
  mocCore: MocCARC20;
  changer: CommissionSplitterChanger;
  feesSplitter: CommissionSplitter;
  tcInterestsSplitter: CommissionSplitter;
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

    const feesSplitterDeployed = await deployments.getOrNull("FeesSplitterProxy");
    if (!feesSplitterDeployed) throw new Error("No FeesSplitter deployed.");
    const feesSplitter = CommissionSplitter__factory.connect(feesSplitterDeployed.address, signer);

    const tcInterestsSplitterDeployed = await deployments.getOrNull("TCInterestsSplitterProxy");
    if (!tcInterestsSplitterDeployed) throw new Error("No TCInterestsSplitter deployed.");
    const tcInterestsSplitter = CommissionSplitter__factory.connect(tcInterestsSplitterDeployed.address, signer);

    return {
      mocCore,
      changer,
      feesSplitter,
      tcInterestsSplitter,
    };
  });
};
