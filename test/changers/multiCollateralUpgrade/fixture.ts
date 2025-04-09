import hre, { ethers, deployments } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/multiCollateralUpgrade_params";
import {
  MocRC20,
  MocRC20__factory,
  MocMultiCollateralGuard,
  MocMultiCollateralGuard__factory,
  MultiCollateralUpgradeChanger,
  MultiCollateralUpgradeChanger__factory,
} from "../../../typechain";
import { MocCARC20 } from "../../../typechain/moc-main/contracts/collateral/rc20/MocCARC20";
import { MocCARC20__factory } from "../../../typechain/factories/moc-main/contracts/collateral/rc20/MocCARC20__factory";
import { MocQueue } from "../../../typechain/moc-main/contracts/queue/MocQueue";
import { MocQueue__factory } from "../../../typechain/factories/moc-main/contracts/queue/MocQueue__factory";

export type Contracts = {
  bucketRif: MocCARC20;
  rifToken: MocRC20;
  rifProToken: MocRC20;
  usdRifToken: MocRC20;
  rifQueue: MocQueue;
  mocMultiCollateralGuard: MocMultiCollateralGuard;
  changer: MultiCollateralUpgradeChanger;
  mocToken: MocRC20;
};

export const fixtureDeployed = async (): Promise<{
  bucketRif: MocCARC20;
  rifToken: MocRC20;
  rifProToken: MocRC20;
  usdRifToken: MocRC20;
  rifQueue: MocQueue;
  mocMultiCollateralGuard: MocMultiCollateralGuard;
  changer: MultiCollateralUpgradeChanger;
  mocToken: MocRC20;
}> => {
  await deployments.fixture(["MultiCollateralUpgradeChanger"]);
  const { mocCoreAddress } = getNetworkChangerParams(hre);
  const [signer] = await ethers.getSigners();

  const bucketRif = MocCARC20__factory.connect(mocCoreAddress, signer);
  const rifToken = MocRC20__factory.connect(await bucketRif.acToken(), signer);
  const rifProToken = MocRC20__factory.connect(await bucketRif.tcToken(), signer);
  const usdRifToken = MocRC20__factory.connect(await bucketRif.tpTokens(0), signer);

  const changerDeployed = await deployments.getOrNull("MultiCollateralUpgradeChanger");
  if (!changerDeployed) throw new Error("No MultiCollateralUpgradeChanger deployed.");
  const changer = MultiCollateralUpgradeChanger__factory.connect(changerDeployed.address, signer);

  const mocQueueDeployed = await deployments.getOrNull("Rif_MocQueueProxy");
  if (!mocQueueDeployed) throw new Error("No Rif_MocQueueProxy deployed.");
  const rifQueue = MocQueue__factory.connect(mocQueueDeployed.address, signer);

  const mocMultiCollateralGuardDeployed = await deployments.getOrNull("Rif_MocMultiCollateralGuardProxy");
  if (!mocMultiCollateralGuardDeployed) throw new Error("No Rif_MocMultiCollateralGuardProxy deployed.");
  const mocMultiCollateralGuard = MocMultiCollateralGuard__factory.connect(
    mocMultiCollateralGuardDeployed.address,
    signer,
  );

  const mocToken = MocRC20__factory.connect(await bucketRif.feeToken(), signer);
  return {
    bucketRif,
    rifToken,
    rifProToken,
    usdRifToken,
    rifQueue,
    mocMultiCollateralGuard,
    changer,
    mocToken,
  };
};
