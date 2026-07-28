export declare const RIF_USD_COIN_PAIR_ID: string;
export declare const TASKS_RUNNER_COIN_PAIR_ID: string;

export interface RocNetworkAddressBook {
  chainId: number;
  network: string;
  governor?: string;
  governorOwner?: string;
  oracleManager?: string;
  mocRegistry?: string;
  mocStateV1: string;
  mocMultiCollateralGuard?: string;
  mocCore?: string;
  mocToken?: string;
  rifToken?: string;
  rifProToken?: string;
  usdRifToken?: string;
  docToken?: string;
  docProToken?: string;
  rifBucket?: string;
  docBucket?: string;
  rifQueue?: string;
  docQueue?: string;
  rifUsdLegacyPriceProvider?: string;
  rifToRbtcPriceProvider?: string;
  docToUsdRifPriceProvider?: string;
  docToRbtcPriceProvider?: string;
  mocToRifBasePriceProvider?: string;
  rifToRbtcDivisorPriceProvider?: string;
  btcUsdCoinPair?: string;
  supporters?: string;
  foundation?: string;
  holder?: string;
  oracleOwner1?: string;
  oracleOwner2?: string;
  oracleOwner3?: string;
  rifCommissionSplitterV2?: string;
  rifCommissionSplitterV3?: string;
  docCommissionSplitterV2?: string;
  mocCommissionSplitterV2?: string;
  mocCommissionSplitterV3?: string;
  rifProRewardsBuffer?: string;
  rocrRewardsBuffer?: string;
  bitProRewardsBuffer?: string;
  bproRewardsBuffer?: string;
  mocRewardsBuffer?: string;
  rifToMocRocRewardsReverseAuction?: string;
  mocToRifRifBucketReverseAuction?: string;
  docToMocRocRewardsReverseAuction?: string;
  mocToDocDocBucketReverseAuction?: string;
  rbtcToMocMocRewardsReverseAuction?: string;
  mocToRbtcMocV1ReverseAuction?: string;
  mocRifImplementation?: string;
  usdRifImplementation?: string;
  mocQueueImplementation?: string;
  docBucketImplementation?: string;
  docBucketQueueImplementation?: string;
  mocMultiCollateralGuardImplementation?: string;
}

export interface RocAddressBook {
  constants: {
    RIF_USD_COIN_PAIR_ID: string;
    TASKS_RUNNER_COIN_PAIR_ID: string;
  };
  mainnet: RocNetworkAddressBook;
  testnet: RocNetworkAddressBook;
}

export declare const addressBook: RocAddressBook;
export declare const mainnet: RocNetworkAddressBook;
export declare const testnet: RocNetworkAddressBook;
export default addressBook;
