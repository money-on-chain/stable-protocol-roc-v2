import hre, { deployments } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/flowChangeProposal-params";
import {
  MocCARC20,
  MocCARC20__factory,
  FlowChangeProposal,
  FlowChangeProposal__factory,
  CommissionSplitter__factory,
  CommissionSplitter,
} from "../../../typechain";

import feesSplitterProxy from "../../../deployments/rskMainnet/FeesSplitterProxy.json";
import tcInterestSplitterProxy from "../../../deployments/rskMainnet/TCInterestSplitterProxy.json";
import flowChangeProposal from "../../../deployments/rskMainnet/FlowChangeProposal.json";

export type Contracts = {
  mocCore: MocCARC20;
  changer: FlowChangeProposal;
  feesSplitter: CommissionSplitter;
  tcInterestsSplitter: CommissionSplitter;
};

export const fixtureDeployed = (): (() => Promise<Contracts>) => {
  return deployments.createFixture(async ({ ethers }) => {
    const changerParams = getNetworkChangerParams(hre);
    if (!changerParams) throw new Error("No deploy params config found.");

    const signer = ethers.provider.getSigner();

    const mocCore = MocCARC20__factory.connect(changerParams.changer.mocCoreProxyAddress, signer);
    const feesSplitter = CommissionSplitter__factory.connect(feesSplitterProxy.address, signer);
    const tcInterestsSplitter = CommissionSplitter__factory.connect(tcInterestSplitterProxy.address, signer);
    const changer = FlowChangeProposal__factory.connect(flowChangeProposal.address, signer);

    return {
      mocCore,
      changer,
      feesSplitter,
      tcInterestsSplitter,
    };
  });
};
