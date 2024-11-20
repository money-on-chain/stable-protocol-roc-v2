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
  CommissionSplitter__factory,
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
  let feeToken: MocRC20;
  let rifProToken: MocRC20;
  let mocQueue: MocQueue;
  const governorOwnerAddress = "0x7D124cC0f59aDA5793AD8edA9eD1836cB7e797a3";
  const holderAddress = "0xD97C1ebC374715bc32E1901e5deDB516955156c5";

  describe("GIVEN the MocRif protocol deployed", () => {
    before(async () => {
      ({ mocCore, changer, feesSplitter, tcInterestsSplitter } = await fixtureDeployed()());
      const signer = ethers.provider.getSigner();
      rifToken = MocRC20__factory.connect(await mocCore.acToken(), signer);
      rifProToken = MocRC20__factory.connect(await mocCore.tcToken(), signer);
      feeToken = MocRC20__factory.connect(await mocCore.feeToken(), signer);
      mocQueue = MocQueue__factory.connect(await mocCore.mocQueue(), signer);
      await helpers.impersonateAccount(governorOwnerAddress);
      await helpers.impersonateAccount(holderAddress);
      await helpers.setBalance(governorOwnerAddress, pEth(10000000));
    });
    describe("WHEN the changer is executed", () => {
      let commissionSplitterRIFBalance: Balance;
      let commissionSplitterMOCBalance: Balance;
      let recipient1RifBalance: Balance;
      let recipient2RifBalance: Balance;
      let recipient1MOCBalance: Balance;
      let recipient2MOCBalance: Balance;
      before(async () => {
        const governor = IGovernor__factory.connect(await mocCore.governor(), ethers.provider.getSigner());

        commissionSplitterRIFBalance = await rifToken.balanceOf(await mocCore.tcInterestCollectorAddress());
        commissionSplitterMOCBalance = await feeToken.balanceOf(await mocCore.tcInterestCollectorAddress());

        const acTokenAddressRecipient1 = await tcInterestsSplitter.acTokenAddressRecipient1();
        const acTokenAddressRecipient2 = await tcInterestsSplitter.acTokenAddressRecipient2();
        const feeTokenAddressRecipient1 = await tcInterestsSplitter.feeTokenAddressRecipient1();
        const feeTokenAddressRecipient2 = await tcInterestsSplitter.feeTokenAddressRecipient2();

        recipient1RifBalance = await rifToken.balanceOf(acTokenAddressRecipient1);
        recipient2RifBalance = await rifToken.balanceOf(acTokenAddressRecipient2);
        recipient1MOCBalance = await feeToken.balanceOf(feeTokenAddressRecipient1);
        recipient2MOCBalance = await feeToken.balanceOf(feeTokenAddressRecipient2);

        await governor.connect(await ethers.getSigner(governorOwnerAddress)).executeChange(changer.address);
      });
      /*it("MoCQueue implementation is changed", async () => {
        expect(await mocQueue.implementation()).to.equal(await changer.newMocQueueImpl());
      });*/
      it("tcInterestCollectorAddress & mocFeeFlowAddress both pointing to the same Commission Splitter", async () => {
        expect(await mocCore.tcInterestCollectorAddress()).to.equal(await mocCore.mocFeeFlowAddress());
      });
      it("TC Interest Payment BlockSpan is changed", async () => {
        assertPrec(
          await changer.tCInterestPaymentBlockSpan(),
          await mocCore.tcInterestPaymentBlockSpan()
        );
      });
      it("Settlement Block Span is changed", async () => {
        assertPrec(
          await changer.settlementBlockSpan(),
          await mocCore.bes()
        );
      });
      it("Flux Capacitor decay Block Span is changed", async () => {
        assertPrec(
          await changer.decayBlockSpan(),
          await mocCore.decayBlockSpan()
        );
      });
      it("EMA Calculation Block Span is changed", async () => {
        assertPrec(
          await changer.emaCalculationBlockSpan(),
          await mocCore.emaCalculationBlockSpan()
        );
      });
      it("FeeToken Price provider is changed", async () => {
        expect(await changer.feeTokenPriceProvider()).to.equal(await mocCore.feeTokenPriceProvider());
      });
      it("TC Interest Collector Address is changed", async () => {
        expect(await changer.feesSplitterProxy()).to.equal(await mocCore.tcInterestCollectorAddress());
      });
      it("MOC Fee Flow Address is changed", async () => {
        expect(await changer.feesSplitterProxy()).to.equal(await mocCore.mocFeeFlowAddress());
      });
      it("MOC Fee Flow Address is changed", async () => {
        expect(await changer.feesSplitterProxy()).to.equal(await mocCore.mocFeeFlowAddress());
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
      it("THEN recipient1 Rif balance increase 50% of interests on CommissionSplitterV3", async () => {

        const acTokenAddressRecipient1 = await tcInterestsSplitter.acTokenAddressRecipient1();
        const diff = (await rifToken.balanceOf(acTokenAddressRecipient1)).sub(
          recipient1RifBalance,
        );
        const commissionSplitterV3Amount = commissionSplitterRIFBalance.mul(50).div(100);

        assertPrec(diff, commissionSplitterV3Amount);
      });
      it("THEN recipient2 Rif balance increase 50% of interests on CommissionSplitterV3", async () => {
        const acTokenAddressRecipient2 = await tcInterestsSplitter.acTokenAddressRecipient2();
        const diff = (await rifToken.balanceOf(acTokenAddressRecipient2)).sub(
          recipient2RifBalance,
        );
        const commissionSplitterV3Amount = commissionSplitterRIFBalance.mul(50).div(100);
        assertPrec(diff, commissionSplitterV3Amount, undefined, 10);
      });
      describe("WHEN holder mints 1 TC to himself", () => {
        let holderRifProTokenBalanceBefore: Balance;
        before(async () => {
          holderRifProTokenBalanceBefore = await rifProToken.balanceOf(holderAddress);
          await rifToken.connect(await ethers.getSigner(holderAddress)).approve(mocCore.address, pEth(10));
          await mocCore
            .connect(await ethers.getSigner(holderAddress))
            .mintTC(pEth(1), pEth(10), holderAddress, CONSTANTS.ZERO_ADDRESS, {
              value: await mocQueue.execFee(1),
            });
          await helpers.mine(await mocQueue.minOperWaitingBlk());
          await mocQueue.execute(holderAddress);
        });
        it("THEN holder riskProToken increases by 1", async () => {
          assertPrec((await rifProToken.balanceOf(holderAddress)).sub(holderRifProTokenBalanceBefore), 1);
        });
        it("THEN feesSplitter ReserveToken increases by 0.00148 (0.2% of pTCac - 25% for feeRetainer)", async () => {
          // await mocCore.getPTCac() = 0.991049334166140596
          assertPrec(await rifToken.balanceOf(feesSplitter.address), "0.001486079588929608");
        });
        describe("AND feesSplitter split is executed", () => {
          before(async () => {
            await feesSplitter.split();
          });
          it("THEN feesSplitter balance is 0", async () => {
            assertPrec(await rifToken.balanceOf(feesSplitter.address), 0);
          });
        });
      });
      describe("WHEN holder mints 1 TC to another recipient", () => {
        it("THEN reverts because a different recipient is not allowed", async () => {
          await rifToken.connect(await ethers.getSigner(holderAddress)).approve(mocCore.address, pEth(10));
          const tx = mocCore
            .connect(await ethers.getSigner(holderAddress))
            .mintTC(pEth(1), pEth(10), governorOwnerAddress, CONSTANTS.ZERO_ADDRESS, {
              value: await mocQueue.execFee(1),
            });
          await expect(tx).to.be.revertedWithCustomError(mocCore, "RecipientMustBeSender");
        });
      });
      describe("WHEN TC holders interest payment is executed", function () {
        let balanceBefore: Balance;
        before(async function () {
          balanceBefore = await rifToken.balanceOf(tcInterestsSplitter.address);
          await helpers.mine(await mocCore.nextTCInterestPayment());
          await mocCore.tcHoldersInterestPayment();
        });
        it("THEN TC interest collector balance increase 0.01962% of 4939380 AC", async function () {
          // rif balance = 4939380.124996124353316586
          const tcInterestCollectorActualACBalance = await rifToken.balanceOf(tcInterestsSplitter.address);
          const diff = tcInterestCollectorActualACBalance.sub(balanceBefore);
          assertPrec(diff, "968.807487409565438679");
        });
        it("THEN nACcb matches with AC balance", async function () {
          assertPrec(await mocCore.nACcb(), await rifToken.balanceOf(mocCore.address));
        });
        describe("AND tcInterestsSplitter split is executed", () => {
          before(async () => {
            await tcInterestsSplitter.split();
          });
          it("THEN tcInterestsSplitter balance is 0", async () => {
            assertPrec(await rifToken.balanceOf(tcInterestsSplitter.address), 0);
          });
        });
      });
    });
  });
});
