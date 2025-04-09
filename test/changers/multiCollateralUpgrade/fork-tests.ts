import { ethers } from "hardhat";
import { ContractRunner } from "ethers";
import { Address } from "hardhat-deploy/types";
import { expect } from "chai";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";
import { pEth, OperType, mintTP, mintTCandTP, getStatus, redeemTC } from "../../helpers/utils";
import {
  MocMultiCollateralGuard,
  MocRC20,
  MultiCollateralUpgradeChanger,
  IGovernor__factory,
} from "../../../typechain";
import { MocCARC20 } from "../../../typechain/moc-main/contracts/collateral/rc20/MocCARC20";
import { MocCARC20__factory } from "../../../typechain/factories/moc-main-v1.0.6/contracts/collateral/rc20/MocCARC20__factory";
import { MocQueue } from "../../../typechain/moc-main/contracts/queue/MocQueue";
import { MocQueue as MocQueue_v1_0_6 } from "../../../typechain/moc-main-v1.0.6/contracts/queue/MocQueue";
import { MocQueue__factory } from "../../../typechain/factories/moc-main-v1.0.6/contracts/queue/MocQueue__factory";
import { fixtureDeployed } from "./fixture";

describe("Feature: MoC multicollateral upgrade - fork", () => {
  let bucketRif: MocCARC20;
  let changer: MultiCollateralUpgradeChanger;
  let rifToken: MocRC20;
  let rifProToken: MocRC20;
  let usdRifToken: MocRC20;
  let rifQueue: MocQueue;
  let rifQueueSingleCollateral: MocQueue_v1_0_6;
  let mocMultiCollateralGuard: MocMultiCollateralGuard;
  let opStatusResultsSingleCollateral: any;
  let nextEmaCalculation: bigint;
  let nextTCInterestPayment: bigint;
  let nextSettlementBlockNumber: bigint;
  let emaCalculationBlockSpan: bigint;
  let tcInterestPaymentBlockSpan: bigint;
  let bes: bigint;
  let decayBlockSpan: bigint;
  let executeTimeStamp: bigint;
  let executeBlockNumber: bigint;
  let blockSpan = 24n;
  let governorOwnerSigner: ContractRunner;
  let signer: any;
  const BASEFEE = 1n;
  const governorOwnerAddress = "0x65a5681bE95d212F0c90eAd40170D8277de81169";
  const holderAddress = "0xe4822F07C1d988A8f2F53D1817f7e8848897b67A";
  const vendorAddress = "0xd249E2275A6ed216432f167c3393f6F72e09eF49";
  let mintTPSingleCollateral: (qTP: number, from: Address, vendor: Address) => Promise<{}>;
  let mintTPMultiCollateral: (qTP: number, from: Address, vendor: Address) => Promise<{}>;
  let redeemTCSingleCollateral: (qTC: number, from: Address, vendor: Address) => Promise<{}>;
  let redeemTCMultiCollateral: (qTC: number, from: Address, vendor: Address) => Promise<{}>;
  let mintTCandTPSingleCollateral: (qTC: number, from: Address, vendor: Address) => Promise<{}>;
  let mintTCandTPMultiCollateral: (qTC: number, from: Address, vendor: Address) => Promise<{}>;

  describe("GIVEN the MocRif protocol deployed", () => {
    before(async () => {
      ({ bucketRif, changer, rifToken, rifProToken, usdRifToken, rifQueue, mocMultiCollateralGuard } =
        await fixtureDeployed());
      [signer] = await ethers.getSigners();

      await helpers.impersonateAccount(governorOwnerAddress);
      governorOwnerSigner = await ethers.getSigner(governorOwnerAddress);
      await helpers.setBalance(governorOwnerAddress, pEth(10000000));

      rifQueueSingleCollateral = MocQueue__factory.connect(await bucketRif.mocQueue(), signer);

      const bucketRifSingleCollateral = MocCARC20__factory.connect(bucketRif.target.toString(), signer);

      nextEmaCalculation = await bucketRifSingleCollateral.nextEmaCalculation();
      nextTCInterestPayment = await bucketRifSingleCollateral.nextTCInterestPayment();
      nextSettlementBlockNumber = await bucketRifSingleCollateral.bns();
      emaCalculationBlockSpan = await bucketRifSingleCollateral.emaCalculationBlockSpan();
      tcInterestPaymentBlockSpan = await bucketRifSingleCollateral.tcInterestPaymentBlockSpan();
      bes = await bucketRifSingleCollateral.bes();
      decayBlockSpan = await bucketRifSingleCollateral.decayBlockSpan();

      const contractsSingleCollateral = {
        bucket: bucketRif,
        acToken: rifToken,
        tpToken: usdRifToken,
        tcToken: rifProToken,
        mocQueue: rifQueueSingleCollateral,
        executor: rifQueueSingleCollateral,
      };

      const contractsMultiCollateral = {
        bucket: bucketRif,
        acToken: rifToken,
        tcToken: rifProToken,
        tpToken: usdRifToken,
        mocQueue: rifQueue,
        executor: mocMultiCollateralGuard,
      };

      mintTPSingleCollateral = mintTP(
        contractsSingleCollateral,
        await rifQueueSingleCollateral.execFee(OperType.mintTP),
      );
      mintTPMultiCollateral = mintTP(contractsMultiCollateral, await rifQueue.execCost(OperType.mintTP));
      redeemTCSingleCollateral = redeemTC(
        contractsSingleCollateral,
        await rifQueueSingleCollateral.execFee(OperType.redeemTC),
      );
      redeemTCMultiCollateral = redeemTC(contractsMultiCollateral, await rifQueue.execCost(OperType.redeemTC));
      mintTCandTPSingleCollateral = mintTCandTP(
        contractsSingleCollateral,
        await rifQueueSingleCollateral.execFee(OperType.mintTCandTP),
      );
      mintTCandTPMultiCollateral = mintTCandTP(contractsMultiCollateral, await rifQueue.execCost(OperType.mintTCandTP));

      // TODO: we are emptying the queue manually, we need to handle this in a different way before the queue migration
      await helpers.mine(await rifQueue.minOperWaitingBlk());
      await rifQueueSingleCollateral.execute(holderAddress);

      // take a snapshot of the current state of the blockchain
      const snapshot = await helpers.takeSnapshot();
      // store the operations results to compare them after the upgrade
      opStatusResultsSingleCollateral = {};
      opStatusResultsSingleCollateral.mintTP = await mintTPSingleCollateral(0.1, holderAddress, vendorAddress);
      opStatusResultsSingleCollateral.redeemTC = await redeemTCSingleCollateral(0.1, holderAddress, vendorAddress);
      opStatusResultsSingleCollateral.mintTCandTP = await mintTCandTPSingleCollateral(
        0.1,
        holderAddress,
        vendorAddress,
      );
      // restore to the state of the snapshot
      await snapshot.restore();
    });

    describe("WHEN the changer is executed", () => {
      let statusBefore: any;
      before(async () => {
        statusBefore = await getStatus(bucketRif);
        statusBefore.operIdCount = await rifQueueSingleCollateral.operIdCount();
        const governor = IGovernor__factory.connect(await bucketRif.governor(), signer);
        await governor.connect(governorOwnerSigner).executeChange(changer.target);
        executeTimeStamp = BigInt(await helpers.time.latest());
        executeBlockNumber = BigInt(await helpers.time.latestBlock());
      });
      it("THEN new MocQueue is set on MocCore", async () => {
        expect(await bucketRif.mocQueue()).to.be.equal(rifQueue.target);
      });
      it("THEN MocCore is registered on MocQueue", async () => {
        expect(await rifQueue.mocOperations()).to.be.equal(bucketRif.target);
      });
      it("THEN MocCore is registered on MocMultiCollateralGuard", async () => {
        expect(await mocMultiCollateralGuard.buckets(0)).to.be.equal(bucketRif.target);
      });
      it("THEN MocCore global coverage did not change", async () => {
        expect(await bucketRif.getCglb()).to.be.equal(statusBefore.coverage);
      });
      it("THEN MocCore TC available to redeem did not change", async () => {
        expect(await bucketRif.getTCAvailableToRedeem()).to.be.equal(statusBefore.tcAvailable);
      });
      it("THEN MocCore TP available to mint did not change", async () => {
        expect(await bucketRif.getTPAvailableToMint(usdRifToken.target)).to.be.equal(statusBefore.tpAvailable);
      });
      it("THEN new Rif MocQueue OperIdCount is maintained", async () => {
        expect(await rifQueue.operIdCount()).to.be.equal(statusBefore.operIdCount);
        expect(await rifQueue.firstOperId()).to.be.equal(statusBefore.operIdCount);
      });
      it("THEN nextEmaCalculation is migrated to timestamp", async () => {
        const remainingBlocks = nextEmaCalculation - executeBlockNumber;
        expect(executeTimeStamp + remainingBlocks * blockSpan).to.be.equal(await bucketRif.nextEmaCalculation());
        expect(emaCalculationBlockSpan * blockSpan).to.be.equal(await bucketRif.emaCalculationTimeSpan());
      });
      it("THEN nextTCInterestPayment is migrated to timestamp", async () => {
        const remainingBlocks = nextTCInterestPayment - executeBlockNumber;
        expect(executeTimeStamp + remainingBlocks * blockSpan).to.be.equal(await bucketRif.nextTCInterestPayment());
        expect(tcInterestPaymentBlockSpan * blockSpan).to.be.equal(await bucketRif.tcInterestPaymentTimeSpan());
      });
      it("THEN nextSettlementTime is migrated to timestamp", async () => {
        const remainingBlocks = nextSettlementBlockNumber - executeBlockNumber;
        expect(executeTimeStamp + remainingBlocks * blockSpan).to.be.equal(await bucketRif.nextSettlementTime());
        expect(bes * blockSpan).to.be.equal(await bucketRif.settlementTimeSpan());
      });
      it("THEN lastOperationTimeStamp is migrated to timestamp", async () => {
        expect(executeTimeStamp).to.be.equal(await bucketRif.lastOperationTimeStamp());
        expect(decayBlockSpan * blockSpan).to.be.equal(await bucketRif.decayTimeSpan());
      });
      describe("AND a mintTP operation is executed", () => {
        let opStatusResultsMultiCollateral: any;
        let initialRifBalance: any;
        before(async () => {
          initialRifBalance = await rifToken.balanceOf(holderAddress);
          await helpers.setNextBlockBaseFeePerGas(BASEFEE);
          opStatusResultsMultiCollateral = await mintTPMultiCollateral(0.1, holderAddress, vendorAddress);
          await helpers.setNextBlockBaseFeePerGas(0);
        });
        it("THEN operation gets executed successfully", async () => {
          expect(await rifToken.balanceOf(holderAddress)).to.be.lessThan(initialRifBalance);
          expect(opStatusResultsMultiCollateral.events[0].name).to.equal("TPMinted");
        });
        it("THEN operation results are the same than before the upgrade", async () => {
          expect(opStatusResultsSingleCollateral.mintTP).to.be.deep.equal(opStatusResultsMultiCollateral);
        });
        it("THEN lastOperationTimeStamp is successfully updated", async () => {
          expect(await bucketRif.lastOperationTimeStamp()).to.be.equal(await helpers.time.latest());
        });
      });
      describe("AND a redeemTC operation is executed", () => {
        let opStatusResultsMultiCollateral: any;
        let initialRifBalance: any;
        before(async () => {
          initialRifBalance = await rifToken.balanceOf(holderAddress);
          await helpers.setNextBlockBaseFeePerGas(BASEFEE);
          opStatusResultsMultiCollateral = await redeemTCMultiCollateral(0.1, holderAddress, vendorAddress);
          await helpers.setNextBlockBaseFeePerGas(0);
        });
        it("THEN operation gets executed successfully", async () => {
          expect(await rifToken.balanceOf(holderAddress)).to.be.greaterThan(initialRifBalance);
          expect(opStatusResultsMultiCollateral.events[0].name).to.equal("TCRedeemed");
        });
        it("THEN operation results are the same than before the upgrade", async () => {
          expect(opStatusResultsSingleCollateral.redeemTC).to.be.deep.equal(opStatusResultsMultiCollateral);
        });
      });
      describe("AND a mintTCandTP operation is executed", () => {
        let opStatusResultsMultiCollateral: any;
        let initialRifBalance: any;
        before(async () => {
          initialRifBalance = await rifToken.balanceOf(holderAddress);
          await helpers.setNextBlockBaseFeePerGas(BASEFEE);
          opStatusResultsMultiCollateral = await mintTCandTPMultiCollateral(0.1, holderAddress, vendorAddress);
          await helpers.setNextBlockBaseFeePerGas(0);
        });
        it("THEN operation gets executed successfully", async () => {
          expect(await rifToken.balanceOf(holderAddress)).to.be.lessThan(initialRifBalance);
          expect(opStatusResultsMultiCollateral.events[0].name).to.equal("TCandTPMinted");
        });
        it("THEN operation results are the same than before the upgrade", async () => {
          expect(opStatusResultsSingleCollateral.mintTCandTP).to.be.deep.equal(opStatusResultsMultiCollateral);
        });
      });
      describe("AND time has elapsed to execute all time-based tasks", () => {
        before(async () => {
          const nextTime = Math.max(
            ...[
              Number(await bucketRif.nextTCInterestPayment()),
              Number(await bucketRif.nextEmaCalculation()),
              Number(await bucketRif.nextSettlementTime()),
            ],
          );
          await helpers.time.increaseTo(nextTime);
        });
        describe("WHEN TC interest payment is executed", () => {
          before(async () => {
            await bucketRif.tcHoldersInterestPayment();
          });
          it("THEN nextTCInterestPayment is successfully updated", async () => {
            expect(await bucketRif.nextTCInterestPayment()).to.be.equal(
              BigInt(await helpers.time.latest()) + (await bucketRif.tcInterestPaymentTimeSpan()),
            );
          });
        });
        describe("WHEN EMA update is executed", () => {
          before(async () => {
            await bucketRif.updateEmas();
          });
          it("THEN nextEmaCalculation is successfully updated", async () => {
            expect(await bucketRif.nextEmaCalculation()).to.be.equal(
              BigInt(await helpers.time.latest()) + (await bucketRif.emaCalculationTimeSpan()),
            );
          });
        });
        describe("WHEN settlement is executed", () => {
          before(async () => {
            await bucketRif.execSettlement();
          });
          it("THEN nextSettlementTime is successfully updated", async () => {
            expect(await bucketRif.nextSettlementTime()).to.be.equal(
              BigInt(await helpers.time.latest()) + (await bucketRif.settlementTimeSpan()),
            );
          });
        });
      });
    });
  });
});
