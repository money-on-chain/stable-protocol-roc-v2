import { ethers } from "hardhat";
import { MocCARC20, CommissionSplitterChanger, IGovernor__factory } from "../../../typechain";
import { pEth } from "../../helpers/utils";
import { fixtureDeployed } from "./fixture";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Feature: MoC multicollateral upgrade - fork", () => {
  let mocCore: MocCARC20;
  let changer: CommissionSplitterChanger;
  const governorOwnerAddress = "0x7D124cC0f59aDA5793AD8edA9eD1836cB7e797a3";

  describe("GIVEN the MocRif protocol deployed", () => {
    before(async () => {
      ({ mocCore, changer } = await fixtureDeployed()());
    });
    describe("WHEN the changer is executed", () => {
      before(async () => {
        await helpers.impersonateAccount(governorOwnerAddress);
        await helpers.setBalance(governorOwnerAddress, pEth(10000000));
        const governor = IGovernor__factory.connect(await mocCore.governor(), ethers.provider.getSigner());
        console.log(await mocCore.mocFeeFlowAddress());
        await governor.connect(await ethers.getSigner(governorOwnerAddress)).executeChange(changer.address);
      });
      it("THEN", async () => {
        console.log("OK");
      });
    });
  });
});
