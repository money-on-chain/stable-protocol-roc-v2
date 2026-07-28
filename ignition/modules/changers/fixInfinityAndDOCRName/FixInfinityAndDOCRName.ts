import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import type { IgnitionModule } from "@nomicfoundation/ignition-core";

/**
 * Hardhat Ignition module for FixInfinityAndDOCRNameChanger deployment
 *
 * Usage:
 *   npx hardhat ignition deploy \
 *     ./ignition/modules/changers/fixInfinityAndDOCRName/FixInfinityAndDOCRName.ts \
 *     --network rskMainnet \
 *     --parameters ./ignition/modules/changers/fixInfinityAndDOCRName/parameters/rskMainnet.json
 */
const FixInfinityAndDOCRNameModule: IgnitionModule = buildModule("FixInfinityAndDOCRName", m => {
  const docBucket = m.getParameter<string>("docBucket");

  const fixInfinityAndDOCRNameChanger = m.contract("FixInfinityAndDOCRNameChanger", [docBucket], {
    id: "FixInfinityAndDOCRNameChanger",
  });

  return {
    fixInfinityAndDOCRNameChanger,
  };
});

export default FixInfinityAndDOCRNameModule;
