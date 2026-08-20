import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const rawAddressBook = require("./addressBook.json");
export const addressBook = rawAddressBook;
export const mainnet = rawAddressBook.mainnet;
export const testnet = rawAddressBook.testnet;
export const RIF_USD_COIN_PAIR_ID = rawAddressBook.constants.RIF_USD_COIN_PAIR_ID;
export const TASKS_RUNNER_COIN_PAIR_ID = rawAddressBook.constants.TASKS_RUNNER_COIN_PAIR_ID;
export default addressBook;
//# sourceMappingURL=addressBook.js.map