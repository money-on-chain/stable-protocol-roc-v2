#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");

const network = process.argv[2];
const mcDeploymentId = process.argv[3];
const outputFileArg = process.argv[4];

if (!network || !mcDeploymentId) {
  console.error(
    "Usage: node scripts/changers/addTasksRunner/merge-ignition-params.mjs <network> <mc-deployment-id> [output-file]",
  );
  process.exit(1);
}

const baseParamsPath = path.join(rootDir, "ignition", "modules", "changers", "addTasksRunner", "parameters", `${network}.json`);
const mcDeployedAddressesPath = path.join(rootDir, "ignition", "deployments", mcDeploymentId, "deployed_addresses.json");
const mcMergedParamsPath = path.join(
  rootDir,
  "ignition",
  "modules",
  "changers",
  "multiCollateralUpgrade",
  "parameters",
  `full-${network}.json`,
);
const outputPath =
  outputFileArg ||
  path.join(rootDir, "ignition", "modules", "changers", "addTasksRunner", "parameters", `full-${network}.json`);

if (!fs.existsSync(baseParamsPath)) {
  throw new Error(`Base params file not found: ${baseParamsPath}`);
}
if (!fs.existsSync(mcDeployedAddressesPath)) {
  throw new Error(`MultiCollateral deployed addresses not found: ${mcDeployedAddressesPath}`);
}

const base = JSON.parse(fs.readFileSync(baseParamsPath, "utf8"));
if (!base.AddTasksRunner) {
  throw new Error(`Invalid AddTasksRunner params file (missing AddTasksRunner root): ${baseParamsPath}`);
}

const deployed = JSON.parse(fs.readFileSync(mcDeployedAddressesPath, "utf8"));
const mcParams = fs.existsSync(mcMergedParamsPath)
  ? JSON.parse(fs.readFileSync(mcMergedParamsPath, "utf8")).FullMultiCollateralUpgrade || {}
  : {};

const getAddr = id => deployed[`FullMultiCollateralUpgrade#${id}`] || "0x0000000000000000000000000000000000000000";

const out = JSON.parse(JSON.stringify(base));
const p = out.AddTasksRunner;

// Dynamic wiring from previous deployment
p["core.mocMultiCollateralGuard"] = getAddr("MultiCollateral_MocMultiCollateralGuardProxy");
p["core.bucket1"] = getAddr("DocBucket_DocBucketProxy");

p["reverseAuctions.revAuctionDOCtoMOC_tasksRunner.mocSwapper"] = getAddr("Swappers_SwapperDOCMOC");
p["triggerOrderRevAuctions.revAuctionDOCtoMOC_rocRewardsBuffer"] = getAddr("FeeFlow_ReverseAuctionDOCtoMOC");
p["triggerOrderRevAuctions.revAuctionMOCtoDOC_docBucket"] = getAddr("FeeFlow_ReverseAuctionMOCtoDOC");
p["bufferTasks.rocrRewardsBuffer"] = getAddr("FeeFlow_RocrRewardsBuffer");
p["docCommissionSplitterV2.commissionSplitter"] = getAddr("FeeFlow_FeesSplitterProxy");

// Fill price providers from merged MC params if available
if (mcParams["MultiCollateralUpgrade.rifPriceProvider"]) {
  p["reverseAuctions.revAuctionRIFtoMOC_tasksRunner.priceProvider"] =
    mcParams["MultiCollateralUpgrade.rifPriceProvider"];
}
const docToMocPriceProvider = getAddr("FeeFlow_DocToMocPriceProvider");
if (docToMocPriceProvider !== "0x0000000000000000000000000000000000000000") {
  p["reverseAuctions.revAuctionDOCtoMOC_tasksRunner.priceProvider"] = docToMocPriceProvider;
}

out._generatedBy = "scripts/changers/addTasksRunner/merge-ignition-params.mjs";
out._network = network;
out._sources = [
  path.relative(rootDir, baseParamsPath),
  path.relative(rootDir, mcDeployedAddressesPath),
  fs.existsSync(mcMergedParamsPath) ? path.relative(rootDir, mcMergedParamsPath) : null,
].filter(Boolean);

fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`Merged AddTasksRunner parameters written to: ${outputPath}`);
