import test from "node:test";
import assert from "node:assert/strict";

import addressBook, { mainnet, testnet, RIF_USD_COIN_PAIR_ID, TASKS_RUNNER_COIN_PAIR_ID } from "../addressBook.js";

test("addressBook exports the flat camelCase network maps", () => {
  assert.equal(addressBook.mainnet.mocRegistry, mainnet.mocRegistry);
  assert.equal(addressBook.mainnet.mocStateV1, mainnet.mocStateV1);
  assert.equal(addressBook.mainnet.mocMultiCollateralGuard, mainnet.mocMultiCollateralGuard);
  assert.equal(addressBook.mainnet.rifQueue, mainnet.rifQueue);
  assert.equal(addressBook.mainnet.docQueue, mainnet.docQueue);
  assert.equal(addressBook.mainnet.supporters, mainnet.supporters);
  assert.equal(addressBook.testnet.mocRegistry, testnet.mocRegistry);
  assert.equal(addressBook.testnet.mocStateV1, testnet.mocStateV1);
  assert.equal(addressBook.testnet.rifQueue, testnet.rifQueue);
  assert.equal(addressBook.testnet.btcUsdCoinPair, testnet.btcUsdCoinPair);
});

test("addressBook re-exports shared constants from the JSON source", () => {
  assert.equal(RIF_USD_COIN_PAIR_ID, addressBook.constants.RIF_USD_COIN_PAIR_ID);
  assert.equal(TASKS_RUNNER_COIN_PAIR_ID, addressBook.constants.TASKS_RUNNER_COIN_PAIR_ID);
});
