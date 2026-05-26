import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PauserSplitChangerModule = buildModule("PauserSplitChanger", m => {
  const mocMultiCollateralGuard = m.getParameter<string>("mocMultiCollateralGuard");
  const newPauser = m.getParameter<string>("newPauser");

  const pauserSplitChanger = m.contract("PauserSplitChanger", [mocMultiCollateralGuard, newPauser]);

  return {
    pauserSplitChanger,
  };
});

export default PauserSplitChangerModule;
