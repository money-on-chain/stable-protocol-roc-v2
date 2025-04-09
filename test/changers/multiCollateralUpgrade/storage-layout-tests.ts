import { artifacts, ethers, upgrades } from "hardhat";

describe("Feature: Check MocRif storage layout compatibility using openzeppelin hardhat upgrade ", () => {
  describe("WHEN check storage layout compatibility between v1.0.6 and v1.1.0", () => {
    it("THEN it succeeds as there is not storage collision", async () => {
      const [signer] = await ethers.getSigners();
      const mocRifv106Artifact = await artifacts.readArtifact(
        "moc-main-v1.0.6/contracts/collateral/rc20/MocCARC20.sol:MocCARC20",
      );
      const mocRifv106Factory = new ethers.ContractFactory(mocRifv106Artifact.abi, mocRifv106Artifact.bytecode, signer);

      const mocRifv110Artifact = await artifacts.readArtifact("MocRif");
      const mocRifv110Factory = new ethers.ContractFactory(mocRifv110Artifact.abi, mocRifv110Artifact.bytecode, signer);

      await upgrades.validateImplementation(mocRifv110Factory, { unsafeAllow: ["missing-initializer"] });
      // forces the import of an existing proxy to be used with this plugin
      await upgrades.validateUpgrade(mocRifv106Factory, mocRifv110Factory, {
        // we allow delegatecall to use MocCoreExpansion
        unsafeAllow: ["delegatecall", "missing-initializer"],
        unsafeAllowRenames: true, // some vareiables were renamed
      });
    });
  });
});

describe("Feature: Check USDRIF storage layout compatibility using openzeppelin hardhat upgrade ", () => {
  describe("WHEN check storage layout compatibility between v1.0.6 and v1.1.0", () => {
    it("THEN it succeeds as there is not storage collision", async () => {
      const [signer] = await ethers.getSigners();
      const usdRifv106Artifact = await artifacts.readArtifact("StableTokenV2_Legacy");
      const usdRifv106Factory = new ethers.ContractFactory(usdRifv106Artifact.abi, usdRifv106Artifact.bytecode, signer);

      const usdRifv110Artifact = await artifacts.readArtifact("StableTokenV2");
      const usdRifv110Factory = new ethers.ContractFactory(usdRifv110Artifact.abi, usdRifv110Artifact.bytecode, signer);

      await upgrades.validateImplementation(usdRifv110Factory, { unsafeAllow: ["missing-initializer"] });
      await upgrades.validateUpgrade(usdRifv106Factory, usdRifv110Factory, { unsafeAllow: ["missing-initializer"] });
    });
  });
});
