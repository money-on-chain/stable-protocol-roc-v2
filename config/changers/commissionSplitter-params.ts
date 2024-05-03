import { HardhatRuntimeEnvironment } from "hardhat/types";

type ChangerParams = {
  addresses: {
    mocCoreProxyAddress: string;
  };
  gasLimit: number;
};

export const rskTestnetChangerParams: ChangerParams = {
  addresses: {
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
