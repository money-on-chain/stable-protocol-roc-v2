import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
/**
 * Hardhat Ignition module for FixInfinityAndDOCRNameChanger deployment
 *
 * Usage:
 *   npx hardhat ignition deploy \
 *     ./ignition/modules/changers/fixInfinityAndDOCRName/FixInfinityAndDOCRName.ts \
 *     --network rskMainnet \
 *     --parameters ./ignition/modules/changers/fixInfinityAndDOCRName/parameters/rskMainnet.json
 */
const FixInfinityAndDOCRNameModule = buildModule("FixInfinityAndDOCRName", m => {
    const docBucket = m.getParameter("docBucket");
    const fixInfinityAndDOCRNameChanger = m.contract("FixInfinityAndDOCRNameChanger", [docBucket], {
        id: "FixInfinityAndDOCRNameChanger",
    });
    return {
        fixInfinityAndDOCRNameChanger,
    };
});
export default FixInfinityAndDOCRNameModule;
//# sourceMappingURL=FixInfinityAndDOCRName.js.map