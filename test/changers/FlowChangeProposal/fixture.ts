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

export type Contracts = {
  mocCore: MocCARC20;
  changer: FlowChangeProposal;
  feesSplitter: CommissionSplitter;
  tcInterestsSplitter: CommissionSplitter;
};

export const fixtureDeployed = (): (() => Promise<Contracts>) => {
  return deployments.createFixture(async ({ ethers }) => {
    await deployments.fixture(["FlowChangeProposal"]);

    const changerParams = getNetworkChangerParams(hre);
    if (!changerParams) throw new Error("No deploy params config found.");

    const signer = ethers.provider.getSigner();

    const mocCore = MocCARC20__factory.connect(changerParams.changer.mocCoreProxyAddress, signer);

    const feesSplitterDeployed = await deployments.getOrNull("FeesSplitterProxy");
    if (!feesSplitterDeployed) throw new Error("No FeesSplitter deployed.");
    const feesSplitter = CommissionSplitter__factory.connect(feesSplitterDeployed.address, signer);
    const tcInterestsSplitter = feesSplitter;

    const changerDeployed = await deployments.getOrNull("FlowChangeProposal");
    if (!changerDeployed) throw new Error("No FlowChangeProposal deployed.");
    const changer = FlowChangeProposal__factory.connect(changerDeployed.address, signer);

    return {
      mocCore,
      changer,
      feesSplitter,
      tcInterestsSplitter,
    };
  });
};
