import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { CONSTANTS } from "moc-main/export/scripts/utils";
import { Balance, pEth } from "../../helpers/utils";
import {
  MocCARC20,
  FlowChangeProposal,
  IGovernor__factory,
  MocRC20__factory,
  MocRC20,
  CommissionSplitter,
  MocQueue,
  MocQueue__factory,
} from "../../../typechain";
import { assertPrec } from "../../helpers/assertHelper";
import { fetchNetworkDeployParams } from "../../../deploy/changers/FlowChangeProposal/utils";
import { fixtureDeployed } from "./fixture";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Feature: MoC multicollateral upgrade - fork", () => {
  let mocCore: MocCARC20;
  let feesSplitter: CommissionSplitter;
  let tcInterestsSplitter: CommissionSplitter;
  let changer: FlowChangeProposal;
  let rifToken: MocRC20;
  let rifProToken: MocRC20;
  let mocQueue: MocQueue;
  const governorOwnerAddress = "0x7D124cC0f59aDA5793AD8edA9eD1836cB7e797a3";
  const holderAddress = "0xD97C1ebC374715bc32E1901e5deDB516955156c5";
  let tcInterestsSplitterParams: any;

  describe("GIVEN the MocRif protocol deployed", () => {
    before(async () => {
      ({ mocCore, changer, feesSplitter, tcInterestsSplitter } = await fixtureDeployed()());
      const signer = ethers.provider.getSigner();
      rifToken = MocRC20__factory.connect(await mocCore.acToken(), signer);
      rifProToken = MocRC20__factory.connect(await mocCore.tcToken(), signer);
      mocQueue = MocQueue__factory.connect(await mocCore.mocQueue(), signer);


      await helpers.impersonateAccount(governorOwnerAddress);
      await helpers.impersonateAccount(holderAddress);
      await helpers.setBalance(governorOwnerAddress, pEth(10000000));


    });
    describe("WHEN the changer is executed", async () => {

      before(async () => {
        const governor = IGovernor__factory.connect(await mocCore.governor(), ethers.provider.getSigner());
        await governor.connect(await ethers.getSigner(governorOwnerAddress)).executeChange(changer.address);

        commissionSplitterV3RifBalance = await rifToken.balanceOf(await mocCore.tcInterestCollectorAddress());
        recipient1RifBalance = await rifToken.balanceOf(tcInterestsSplitterParams.acTokenAddressRecipient1);
        recipient2RifBalance = await rifToken.balanceOf(tcInterestsSplitterParams.acTokenAddressRecipient2);
        await governor.connect(await ethers.getSigner(governorOwnerAddress)).executeChange(changer.address);
      });
      describe("WHEN Rif tokens are sent to mocCore", async () => {
        before(async () => {
          // send RIF tokens to mocCore to the nACcb not accounted on TC interest payments issue
          const nACcbDifference = (await mocCore.nACcb()).sub(await rifToken.balanceOf(mocCore.address));
          await rifToken.connect(await ethers.getSigner(holderAddress)).transfer(mocCore.address, nACcbDifference);
        });
        it("THEN refreshACBalance does not reverts", async () => {
          await mocCore.refreshACBalance();
        });
      });
    });
    it("THEN refreshACBalance does not reverts", async () => {
      //await mocCore.refreshACBalance();
    });
    describe("WHEN Rif tokens are sent to mocCore", async () => {

    });

  });
});
