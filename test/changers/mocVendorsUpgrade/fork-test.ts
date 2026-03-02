import {
  impersonateAccount,
  loadFixture,
  mine,
  setBalance,
  stopImpersonatingAccount,
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import mocRifProxyDeployment from "../../../deployments/rskMainnetMigration/MocRifProxy.json";
import { MocRif__factory } from "../../../typechain";
import { MocVendorsUpgradeForkFixture, mocVendorsUpgradeForkFixture, readProxyImplementation } from "./fixture";

const MOC_VENDORS_OLD_ABI = ["function setVendorMarkup(address vendor, uint256 markup) external"];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const MOC_QUEUE_ABI = [
  "function execFee(uint8) view returns (uint256)",
  "function minOperWaitingBlk() view returns (uint128)",
  "function firstOperId() view returns (uint256)",
  "function execute(address) external",
  "event TPMinted(address indexed tp_,address indexed sender_,address indexed recipient_,uint256 qTP_,uint256 qAC_,uint256 qACfee_,uint256 qFeeToken_,uint256 qACVendorMarkup_,uint256 qFeeTokenVendorMarkup_,address vendor_,uint256 operId_)",
];

const AC_HOLDER_FOR_MINT = "0x6ED982FF0Eb40326927CE87ce46dcf241c0fA2a8";

describe("MocVendorsUpgradeChanger fork test", function () {
  let fixture: MocVendorsUpgradeForkFixture;
  let implementationAfter: string;
  let newVendor: string;
  let governorBefore: string;
  let vendorsGuardianBefore: string;
  let preservedVendorOverMax: string;
  let overMaxMarkupBeforeUpgrade: string;

  before(async function () {
    fixture = await loadFixture(mocVendorsUpgradeForkFixture);
    ({ alice: newVendor } = await getNamedAccounts());
    preservedVendorOverMax = fixture.vendors[0];
    overMaxMarkupBeforeUpgrade = ethers.BigNumber.from(fixture.maxVendorMarkup).add(1).toString();

    governorBefore = await fixture.mocVendors.governor();
    vendorsGuardianBefore = await fixture.mocVendors.vendorsGuardianAddress();

    await impersonateAccount(vendorsGuardianBefore);
    await setBalance(vendorsGuardianBefore, "0x56BC75E2D63100000");
    const vendorsGuardianSigner = await ethers.getSigner(vendorsGuardianBefore);

    // we need here the old ABI because the interface use uint256 instead of uint64
    const mocVendorsWithOldAbi = new ethers.Contract(
      fixture.mocVendorsAddress,
      MOC_VENDORS_OLD_ABI,
      vendorsGuardianSigner,
    );
    // set a markup above the new max for the preserved vendor, it should be capped to the new max after the changer execution
    await mocVendorsWithOldAbi.setVendorMarkup(preservedVendorOverMax, overMaxMarkupBeforeUpgrade);
    expect(await fixture.mocVendors.vendorMarkup(preservedVendorOverMax)).to.equal(overMaxMarkupBeforeUpgrade);
    await mocVendorsWithOldAbi.setVendorMarkup(newVendor, fixture.maxVendorMarkup);
    // set a new vendor before the changer execution, it should be reset to 0 after the changer since it's not in the list of vendors with preserved markups
    expect(await fixture.mocVendors.vendorMarkup(newVendor)).to.equal(fixture.maxVendorMarkup);
    await stopImpersonatingAccount(vendorsGuardianBefore);

    await impersonateAccount(fixture.governorOwner);
    await setBalance(fixture.governorOwner, "0x56BC75E2D63100000");
    const governorOwnerSigner = await ethers.getSigner(fixture.governorOwner);
    await fixture.governor.connect(governorOwnerSigner).executeChange(fixture.changerAddress);
    await stopImpersonatingAccount(fixture.governorOwner);

    implementationAfter = await readProxyImplementation(fixture.mocVendorsAddress);
  });

  it("THEN the proxy implementation is updated and max markup is set correctly", async function () {
    expect(implementationAfter).to.equal(fixture.implementationAddress);
    expect(implementationAfter).to.not.equal(fixture.implementationBefore);
  });

  it("THEN max markups is set correctly", async function () {
    expect(await fixture.mocVendors.maxMarkup()).to.equal(fixture.maxVendorMarkup);
  });

  it("THEN existing vendors markups remain unchanged", async function () {
    const vendor1Markup = await fixture.mocVendors.vendorMarkup(fixture.vendors[0]);
    expect(vendor1Markup).to.equal(fixture.maxVendorMarkup); // was above the new max before upgrade, should be capped

    const vendor2Markup = await fixture.mocVendors.vendorMarkup(fixture.vendors[1]);
    expect(vendor2Markup).to.equal("1000000000000000"); // 0.01% in 18 decimals
  });

  it("THEN vendor markups above new maxVendorMarkup are capped during migration", async function () {
    expect(await fixture.mocVendors.vendorMarkup(preservedVendorOverMax)).to.equal(fixture.maxVendorMarkup);
  });

  it("THEN storage invariants remain unchanged after upgrade", async function () {
    expect(await fixture.mocVendors.governor()).to.equal(governorBefore);
    expect(await fixture.mocVendors.vendorsGuardianAddress()).to.equal(vendorsGuardianBefore);
  });

  it("THEN a non-listed vendor markup is reset to 0 after the changer", async function () {
    await time.increase(await fixture.mocVendors.COOLDOWN());
    expect(await fixture.mocVendors.vendorMarkup(newVendor)).to.equal(0);
  });

  it("THEN a new vendor can be added with a markup up to the new maxVendorMarkup", async function () {
    const newVendorSigner = ethers.provider.getSigner(newVendor);
    await fixture.mocVendors.connect(newVendorSigner).setMarkup(fixture.maxVendorMarkup);
    // The new vendor should have 0 markup until the cooldown passes, then it should have the maxVendorMarkup
    expect(await fixture.mocVendors.vendorMarkup(newVendor)).to.equal(0);
    await time.increase(await fixture.mocVendors.COOLDOWN());
    expect(await fixture.mocVendors.vendorMarkup(newVendor)).to.equal(fixture.maxVendorMarkup);
  });

  it("THEN a new vendor cannot be added with a markup above the new maxVendorMarkup", async function () {
    const newVendorSigner = ethers.provider.getSigner(newVendor);
    const aboveMaxMarkup = ethers.BigNumber.from(fixture.maxVendorMarkup).add(1).toString();
    await expect(fixture.mocVendors.connect(newVendorSigner).setMarkup(aboveMaxMarkup)).to.be.revertedWithCustomError(
      fixture.mocVendors,
      "MarkupTooHigh",
    );
  });

  it("THEN privileged setters keep access restrictions after upgrade", async function () {
    const [unauthorizedSigner] = await ethers.getSigners();
    const unauthorizedAddress = await unauthorizedSigner.getAddress();

    await expect(fixture.mocVendors.connect(unauthorizedSigner).setVendorMarkup(unauthorizedAddress, 1)).to.be.reverted;
  });

  it("THEN mintTP in MocRif still works after the changer execution", async function () {
    const mocRif = MocRif__factory.connect(mocRifProxyDeployment.address, ethers.provider);
    await impersonateAccount(AC_HOLDER_FOR_MINT);
    await setBalance(AC_HOLDER_FOR_MINT, "0x56BC75E2D63100000");
    const minterSigner = ethers.provider.getSigner(AC_HOLDER_FOR_MINT);

    const tpTokenAddress = await mocRif.tpTokens(0);
    const acTokenAddress = await mocRif.acToken();
    const acToken = new ethers.Contract(acTokenAddress, ERC20_ABI, minterSigner);

    const qACmax = ethers.utils.parseUnits("10000", 18);
    const qTP = ethers.utils.parseUnits("10", 18);
    await acToken.approve(mocRif.address, ethers.constants.MaxUint256);

    const newVendorSigner = ethers.provider.getSigner(newVendor);
    await fixture.mocVendors.connect(newVendorSigner).setMarkup(fixture.maxVendorMarkup);
    await time.increase(await fixture.mocVendors.COOLDOWN());

    const mocQueueAddress = await mocRif.mocQueue();
    const mocQueue = new ethers.Contract(mocQueueAddress, MOC_QUEUE_ABI, minterSigner);
    const mintTpExecFee = await mocQueue.execFee(3);
    const minOperWaitingBlk = await mocQueue.minOperWaitingBlk();

    const tpToken = new ethers.Contract(tpTokenAddress, ERC20_ABI, ethers.provider);
    const tpBalanceBefore = await tpToken.balanceOf(AC_HOLDER_FOR_MINT);
    const precision = ethers.utils.parseUnits("1", 18);
    const mintFeePct = await mocRif.tpMintFees(tpTokenAddress);

    const executeMintAndValidate = async (vendor: string) => {
      const vendorMarkup =
        vendor === ethers.constants.AddressZero ? ethers.constants.Zero : await fixture.mocVendors.vendorMarkup(vendor);
      const minterAcBefore = await acToken.balanceOf(AC_HOLDER_FOR_MINT);
      const vendorAcBefore =
        vendor === ethers.constants.AddressZero ? ethers.constants.Zero : await acToken.balanceOf(vendor);

      await mocRif.connect(minterSigner).mintTP(tpTokenAddress, qTP, qACmax, AC_HOLDER_FOR_MINT, vendor, {
        value: mintTpExecFee,
      });

      await mine(minOperWaitingBlk.toNumber() + 1);
      await mocQueue.execute(AC_HOLDER_FOR_MINT);

      const minterAcAfter = await acToken.balanceOf(AC_HOLDER_FOR_MINT);
      const qACtotalSpent = minterAcBefore.sub(minterAcAfter);
      const surchargePct = mintFeePct.add(vendorMarkup);
      const qACspentOnMint = qACtotalSpent.mul(precision).div(precision.add(surchargePct));
      const qACVendorMarkup = qACspentOnMint.mul(vendorMarkup).div(precision);

      if (vendor === ethers.constants.AddressZero) {
        expect(qACVendorMarkup).to.equal(0);
      } else {
        const vendorAcAfter = await acToken.balanceOf(vendor);
        expect(vendorAcAfter.sub(vendorAcBefore)).to.equal(qACVendorMarkup);
      }
    };

    // use vendor 0
    await executeMintAndValidate(fixture.vendors[0]);
    // use vendor 1
    await executeMintAndValidate(fixture.vendors[1]);
    // // use new vendor
    await executeMintAndValidate(newVendor);
    // // use no vendor
    await executeMintAndValidate(ethers.constants.AddressZero);

    const tpBalanceAfter = await tpToken.balanceOf(AC_HOLDER_FOR_MINT);
    expect(tpBalanceAfter.sub(tpBalanceBefore)).to.be.equal(qTP.mul(4)); // should receive 4*10 TP

    await stopImpersonatingAccount(AC_HOLDER_FOR_MINT);
  });
});
