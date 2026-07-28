import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat Ignition module for RifPRoMigrationChanger deployment
 *
 * Usage:
 *   npx hardhat ignition deploy \
 *     ./ignition/modules/changers/rifProMigrationChanger/RifProMigrationChanger.ts \
 *     --network rskMainnet \
 *     --parameters ./ignition/modules/changers/rifProMigrationChanger/parameters/rskMainnet.json
 */
const RifProMigrationChangerModule = buildModule("RifProMigrationChanger", m => {
  const rifBucketProxy = m.getParameter<string>("rifBucketProxy");
  const legacyRifProToken = m.getParameter<string>("legacyRifProToken");
  const newRifProTokenName = m.getParameter<string>("newRifProTokenName", "RIFPro Token");
  const newRifProTokenSymbol = m.getParameter<string>("newRifProTokenSymbol", "RIFP");

  const rifBucket = m.contractAt("MocRif", rifBucketProxy, {
    id: "RifBucketProxy",
  });
  const rifGovernor = m.staticCall(rifBucket, "governor", [], 0, {
    id: "RifGovernor",
  });
  const rifBucketImplementation = m.contract("MocRif", [], {
    id: "RifBucketImplementation",
  });
  const newRifProTokenImplementation = m.contract("moc-main-latest/contracts/tokens/MocRC20.sol:MocRC20", [], {
    id: "NewRifProTokenImplementation",
  });
  const initializeNewRifProToken = m.encodeFunctionCall(
    newRifProTokenImplementation,
    "initialize",
    [newRifProTokenName, newRifProTokenSymbol, rifBucket, rifGovernor],
    {
      id: "InitializeNewRifProToken",
    },
  );
  const newRifProTokenProxy = m.contract("ERC1967Proxy", [newRifProTokenImplementation, initializeNewRifProToken], {
    id: "NewRifProTokenProxy",
  });
  const newRifProToken = m.contractAt("moc-main-latest/contracts/tokens/MocRC20.sol:MocRC20", newRifProTokenProxy, {
    id: "NewRifProToken",
  });

  const rifProMigrationChanger = m.contract(
    "RifPRoMigrationChanger",
    [rifBucket, rifBucketImplementation, legacyRifProToken, newRifProToken],
    {
      id: "RifPRoMigrationChanger",
    },
  );

  return {
    rifBucketImplementation,
    newRifProTokenImplementation,
    newRifProToken,
    rifProMigrationChanger,
  };
});

export default RifProMigrationChangerModule;
