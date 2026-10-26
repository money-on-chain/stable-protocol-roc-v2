import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { batchModule } from "ignition-utils";
const PauserSplitRifProMigrationChangerModule = buildModule("PauserSplitRifProMigrationChanger", m => {
    const mocMultiCollateralGuard = m.getParameter("mocMultiCollateralGuard");
    const newPauser = m.getParameter("newPauser");
    const rifBucketProxy = m.getParameter("rifBucketProxy");
    const legacyRifProToken = m.getParameter("legacyRifProToken");
    const newRifProTokenName = m.getParameter("newRifProTokenName", "RIFPro Token");
    const newRifProTokenSymbol = m.getParameter("newRifProTokenSymbol", "RIFP");
    const rifBucket = m.contractAt("MocRif", rifBucketProxy, { id: "RifBucketProxy" });
    const rifGovernor = m.staticCall(rifBucket, "governor", [], 0, { id: "RifGovernor" });
    const rifBucketImplementation = m.contract("MocRif", [], { id: "RifBucketImplementation" });
    const newRifProTokenImplementation = m.contract("moc-main-latest/contracts/tokens/MocRC20.sol:MocRC20", [], {
        id: "NewRifProTokenImplementation",
    });
    const initializeNewRifProToken = m.encodeFunctionCall(newRifProTokenImplementation, "initialize", [newRifProTokenName, newRifProTokenSymbol, rifBucket, rifGovernor], { id: "InitializeNewRifProToken" });
    const newRifProTokenProxy = m.contract("ERC1967Proxy", [newRifProTokenImplementation, initializeNewRifProToken], {
        id: "NewRifProTokenProxy",
    });
    const newRifProToken = m.contractAt("moc-main-latest/contracts/tokens/MocRC20.sol:MocRC20", newRifProTokenProxy, {
        id: "NewRifProToken",
    });
    const changer = m.contract("PauserSplitRifProMigrationChanger", [mocMultiCollateralGuard, newPauser, rifBucket, rifBucketImplementation, legacyRifProToken, newRifProToken], { id: "PauserSplitRifProMigrationChanger" });
    return { rifBucketImplementation, newRifProTokenImplementation, newRifProToken, changer };
});
export default batchModule(PauserSplitRifProMigrationChangerModule);
//# sourceMappingURL=PauserSplitRifProMigrationChanger.js.map