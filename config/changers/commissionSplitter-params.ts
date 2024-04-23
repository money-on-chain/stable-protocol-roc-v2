import { HardhatRuntimeEnvironment } from "hardhat/types";

type ChangerParams = {
  addresses: {
    upgradeDelegatorAddress: string;
    newCommissionSplitterV2Address: string;
    mocCoreProxyAddress: string;
  };
  gasLimit: number;
};

export const rskTestnetChangerParams: ChangerParams = {
  addresses: {
    upgradeDelegatorAddress: "0x546AFdf647d0B5c73323366B090Ebe6C0C4D9b2C",
    newCommissionSplitterV2Address: "0xe14E976c1153FCd20E69361d6AEb168292dF3876",
    mocCoreProxyAddress: "0xa416934264515bb381E3b746f10f22D5c6f9431a",
  },
  gasLimit: 6800000,
};

export const deployChangerParamsr: Record<string, ChangerParams> = {
  hardhat: rskTestnetChangerParams, // TODO: use mainnet params
  rskTestnet: rskTestnetChangerParams,
};

export const getNetworkChangerParams = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  return deployChangerParamsr[network];
};
