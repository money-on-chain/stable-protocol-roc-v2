import { ethers } from "hardhat";
import { BigNumber, ContractTransaction } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { CONSTANTS } from "moc-main/export/scripts/utils";
import { Balance, pEth, OperType } from "../../helpers/utils";
import {
  MocCARC20,
  FlowChangeProposal,
  IGovernor__factory,
  MocRC20__factory,
  MocRC20,
  CommissionSplitter,
  MocQueue,
  MocQueue__factory,
  IPriceProvider__factory,
  IGovernor,
} from "../../../typechain";
import { assertPrec } from "../../helpers/assertHelper";
import { fixtureDeployed } from "./fixture";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Feature: Flow Change Proposal - mainnet fork", () => {
  let mocCore: MocCARC20;
  let feesSplitter: CommissionSplitter;
  let tcInterestsSplitter: CommissionSplitter;
  let changer: FlowChangeProposal;
  let rifToken: MocRC20;
  let usdRifToken: MocRC20;
  let feeToken: MocRC20;
  let rifProToken: MocRC20;
  let mocQueue: MocQueue;
  let governor: IGovernor;
  let holderSigner: SignerWithAddress;
  const governorOwnerAddress = "0x65a5681bE95d212F0c90eAd40170D8277de81169";
  const holderAddress = "0xD07d569322a93a47B62D71203e21f0AFf8246099";
  const feeTokenHolderAddress = "0xB1fc9817C4ad3C40562DfF1159732d657831558A";

  describe("GIVEN the MocRif protocol deployed", () => {
    before(async () => {
      ({ mocCore, changer, feesSplitter, tcInterestsSplitter } = await fixtureDeployed()());
      const signer = ethers.provider.getSigner();
      rifToken = MocRC20__factory.connect(await mocCore.acToken(), signer);
      rifProToken = MocRC20__factory.connect(await mocCore.tcToken(), signer);
      usdRifToken = MocRC20__factory.connect(await mocCore.tpTokens(0), signer);
      feeToken = MocRC20__factory.connect(await mocCore.feeToken(), signer);
      mocQueue = MocQueue__factory.connect(await mocCore.mocQueue(), signer);
      governor = IGovernor__factory.connect(await mocCore.governor(), ethers.provider.getSigner());
      holderSigner = await ethers.getSigner(holderAddress);
      await helpers.impersonateAccount(governorOwnerAddress);
      await helpers.impersonateAccount(holderAddress);
      await helpers.impersonateAccount(feeTokenHolderAddress);
      await helpers.setBalance(governorOwnerAddress, pEth(10000000));
      await helpers.setBalance(holderAddress, pEth(10000000));
      await helpers.setBalance(feeTokenHolderAddress, pEth(10000000));
    });
    describe("WHEN the changer is executed", () => {
      let changerTx: ContractTransaction;
      before(async () => {
        changerTx = await governor.connect(await ethers.getSigner(governorOwnerAddress)).executeChange(changer.address);
      });

      it("THEN Upgrade event is emitted with the new MocQueue implementation address", async () => {
        await expect(changerTx)
          .to.emit(mocQueue, "Upgraded")
          .withArgs(await changer.newMocQueueImpl());
      });
      it("TC Interest Payment BlockSpan is changed", async () => {
        assertPrec(await changer.tcInterestPaymentBlockSpan(), await mocCore.tcInterestPaymentBlockSpan());
      });
      it("Settlement Block Span is changed", async () => {
        assertPrec(await changer.settlementBlockSpan(), await mocCore.bes());
      });
      it("Flux Capacitor decay Block Span is changed", async () => {
        assertPrec(await changer.decayBlockSpan(), await mocCore.decayBlockSpan());
      });
      it("EMA Calculation Block Span is changed", async () => {
        assertPrec(await changer.emaCalculationBlockSpan(), await mocCore.emaCalculationBlockSpan());
      });
      it("FeeToken Price provider is changed", async () => {
        expect(await changer.feeTokenPriceProvider()).to.equal(await mocCore.feeTokenPriceProvider());
      });
      it("TC Interest Collector Address is changed", async () => {
        expect(await changer.tcInterestsSplitterProxy()).to.equal(await mocCore.tcInterestCollectorAddress());
        expect(tcInterestsSplitter.address).to.equal(await mocCore.tcInterestCollectorAddress());
      });
      it("MOC Fee Flow Address is changed", async () => {
        expect(await changer.feesSplitterProxy()).to.equal(await mocCore.mocFeeFlowAddress());
        expect(feesSplitter.address).to.equal(await mocCore.mocFeeFlowAddress());
      });
      describe("WHEN holder tries to mintTP over the flux capacitor limit", function () {
        let operId: BigNumber;
        let execTx: ContractTransaction;
        before(async () => {
          operId = await mocQueue.operIdCount();
          const maxQACToMintTP = await mocCore.maxQACToMintTP();
          await rifToken.connect(holderSigner).approve(mocCore.address, maxQACToMintTP.mul(10));
          await mocCore
            .connect(holderSigner)
            .mintTP(
              usdRifToken.address,
              maxQACToMintTP,
              maxQACToMintTP.mul(10),
              holderAddress,
              CONSTANTS.ZERO_ADDRESS,
              {
                value: await mocQueue.execFee(OperType.mintTP),
              },
            );
          await helpers.mine(await mocQueue.minOperWaitingBlk());
          execTx = await mocQueue.execute(holderAddress);
        });
        it("THEN the operation failed with INVALID_FLUX_CAPACITOR_OPERATION custom error", async () => {
          // INVALID_FLUX_CAPACITOR_OPERATION.selector = 0x1f69fa6a
          await expect(execTx).to.emit(mocQueue, "UnhandledError").withArgs(operId, "0x1f69fa6a");
        });
      });
      describe("WHEN holder register 4 valid operations", function () {
        let operId: BigNumber;
        let execTx: ContractTransaction;
        before(async function () {
          operId = await mocQueue.operIdCount();
          const maxQACToMintTP = await mocCore.maxQACToMintTP();
          await rifToken.connect(holderSigner).approve(mocCore.address, await rifToken.balanceOf(holderAddress));
          await Promise.all([
            await mocCore
              .connect(holderSigner)
              .mintTP(
                usdRifToken.address,
                maxQACToMintTP.div(10),
                maxQACToMintTP.mul(10),
                holderAddress,
                CONSTANTS.ZERO_ADDRESS,
                {
                  value: await mocQueue.execFee(OperType.mintTP),
                },
              ),
            await mocCore.connect(holderSigner).mintTC(pEth(10), pEth(100), holderAddress, CONSTANTS.ZERO_ADDRESS, {
              value: await mocQueue.execFee(OperType.mintTC),
            }),
            await mocCore
              .connect(holderSigner)
              .mintTP(
                usdRifToken.address,
                maxQACToMintTP.div(10),
                maxQACToMintTP.mul(10),
                holderAddress,
                CONSTANTS.ZERO_ADDRESS,
                {
                  value: await mocQueue.execFee(OperType.mintTP),
                },
              ),
            await mocCore.connect(holderSigner).mintTC(pEth(10), pEth(100), holderAddress, CONSTANTS.ZERO_ADDRESS, {
              value: await mocQueue.execFee(OperType.mintTC),
            }),
          ]);
        });
        describe("AND queue is executed", function () {
          before(async function () {
            await helpers.mine(await mocQueue.minOperWaitingBlk());
            execTx = await mocQueue.connect(holderSigner).execute(holderAddress);
          });
          it("THEN all the operations are executed, even if one exceeds the flux capacitor limit", async function () {
            await expect(execTx).to.emit(mocQueue, "OperationExecuted").withArgs(holderAddress, operId);
            await expect(execTx).to.emit(mocQueue, "OperationExecuted").withArgs(holderAddress, operId.add(1));
            await expect(execTx).to.emit(mocQueue, "OperationExecuted").withArgs(holderAddress, operId.add(2));
            await expect(execTx).to.emit(mocQueue, "OperationExecuted").withArgs(holderAddress, operId.add(3));
            //  MAX_FLUX_CAPACITOR_REACHED.selector = 0x0db483ca
            await expect(execTx)
              .to.emit(mocQueue, "OperationError")
              .withArgs(operId.add(2), "0x0db483ca", "Max flux capacitor operation reached");
          });
          it("THEN there are no pending operations in the queue", async function () {
            expect(await mocQueue.isEmpty()).to.be.true;
          });
        });
      });
      describe("WHEN holder mints 1 TC paying fees with Fee token", () => {
        let feeSplitterFeeTokenBalanceBefore: Balance;
        let pTCacBefore: BigNumber;
        let holderRifBalanceBefore: Balance;
        let holderRifProTokenBalanceBefore: Balance;
        let holderFeeTokenBalanceBefore: Balance;
        before(async () => {
          // set a mocked feeTokenPriceProvider that always returns the current price without expiration
          const [feeTokenPrice] = await IPriceProvider__factory.connect(
            await mocCore.feeTokenPriceProvider(),
            holderSigner,
          ).peek();
          const feeTokenPriceProvider = await (
            await ethers.getContractFactory("PriceProviderMock")
          ).deploy(feeTokenPrice);
          const FeeTokenPriceProviderChanger = await (
            await ethers.getContractFactory("FeeTokenPriceProviderChanger")
          ).deploy(mocCore.address, feeTokenPriceProvider.address);
          await governor
            .connect(await ethers.getSigner(governorOwnerAddress))
            .executeChange(FeeTokenPriceProviderChanger.address);

          // transfer feeTokens to holder
          await feeToken.connect(await ethers.getSigner(feeTokenHolderAddress)).transfer(holderAddress, pEth(100000));
          pTCacBefore = await mocCore.getPTCac();
          holderRifBalanceBefore = await rifToken.balanceOf(holderAddress);
          holderRifProTokenBalanceBefore = await rifProToken.balanceOf(holderAddress);
          holderFeeTokenBalanceBefore = await feeToken.balanceOf(holderAddress);
          feeSplitterFeeTokenBalanceBefore = await feeToken.balanceOf(feesSplitter.address);

          await feeToken.connect(holderSigner).approve(mocCore.address, pEth(100000));
          await mocCore.connect(holderSigner).mintTC(pEth(1), pEth(100), holderAddress, CONSTANTS.ZERO_ADDRESS, {
            value: await mocQueue.execFee(OperType.mintTC),
          });
          await helpers.mine(await mocQueue.minOperWaitingBlk());
          await mocQueue.execute(holderAddress);
          await feeToken.connect(holderSigner).approve(mocCore.address, 0);
        });
        it("THEN Fee token price is 0.88 Rif", async () => {
          const [feeTokenPrice] = await IPriceProvider__factory.connect(
            await mocCore.feeTokenPriceProvider(),
            holderSigner,
          ).peek();
          assertPrec(BigNumber.from(feeTokenPrice), "0.886697894914882155");
        });
        it("THEN pTCac before execution is 0.743977532330588013", async () => {
          assertPrec(pTCacBefore, "0.743977532330588013");
        });
        it("THEN pTCac does not increase because there are not fee retained when are paid in Fee token", async () => {
          assertPrec((await mocCore.getPTCac()).sub(pTCacBefore), 0);
        });
        it("THEN holder rifProToken increases by 1", async () => {
          assertPrec((await rifProToken.balanceOf(holderAddress)).sub(holderRifProTokenBalanceBefore), 1);
        });
        it("THEN holder rifToken decrease by 0.743 (0.743 pTCac)", async () => {
          assertPrec(holderRifBalanceBefore.sub(await rifToken.balanceOf(holderAddress)), "0.743977532330588013");
        });
        it("THEN holder Fee token decrease by 0.0012 (0.2% * 75% of 0.743 pTCac)", async () => {
          // 0.743 * 0.002 * 0.75 = 0.0011159662984958820195 rif
          // 0.0011159662984958820195 rif / 0.886697894914882155 feeToken/rif = 0.001258564280907657 feeToken
          assertPrec(holderFeeTokenBalanceBefore.sub(await feeToken.balanceOf(holderAddress)), "0.001258564280907657");
        });
        it("THEN feesSplitter Fee token increase by 0.0012 (0.2% * 75% of 0.742 pTCac)", async () => {
          // 0.743 * 0.002 * 0.75 = 0.0011159662984958820195 rif
          // 0.0011159662984958820195 rif / 0.886697894914882155 feeToken/rif = 0.001258564280907657 feeToken
          assertPrec(
            (await feeToken.balanceOf(feesSplitter.address)).sub(feeSplitterFeeTokenBalanceBefore),
            "0.001258564280907657",
          );
        });
        describe("AND feesSplitter split is executed", () => {
          before(async () => {
            await feesSplitter.split();
          });
          it("THEN feesSplitter balance is 0", async () => {
            assertPrec(await feeToken.balanceOf(feesSplitter.address), 0);
          });
        });
      });
    });
  });
});
