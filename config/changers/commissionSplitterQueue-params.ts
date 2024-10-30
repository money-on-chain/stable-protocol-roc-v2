import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";


const PCT_BASE = BigNumber.from((1e18).toString());

type ChangerParams = {
  changer: {
    mocCoreProxyAddress: string,
    feeTokenPriceProvider: string
  },
  feesSplitterParams: {
    governorAddress: string,
    acTokenAddress: string,
    feeTokenAddress: string,
    acTokenAddressRecipient1: string,
    acTokenAddressRecipient2: string,
    acTokenPctToRecipient1: BigNumber,
    feeTokenAddressRecipient1: string,
    feeTokenAddressRecipient2: string,
    feeTokenPctToRecipient1: BigNumber
  },
  gasLimit: number;
};

export const rskTestnetChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "0xa416934264515bb381E3b746f10f22D5c6f9431a",
    feeTokenPriceProvider: "0x8DCE78BbD4D757EF7777Be113277cf5A35283b1E"
  },
  feesSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100)
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "",
    feeTokenPriceProvider: ""
  },
  feesSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xb5E2BeD9235b6366fA0254c2E6754E167E0A2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "0xb5E2BeD9235b6366fA0254c2E6754E167E0A2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100)
  },
  gasLimit: 6800000,
};

export const rskMainnetChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "",
    feeTokenPriceProvider: ""
  },
  feesSplitterParams: {
    governorAddress: "",
    acTokenAddress: "",
    feeTokenAddress: "",
    acTokenAddressRecipient1: "",
    acTokenAddressRecipient2: "",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "",
    feeTokenAddressRecipient2: "",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100)
  },
  gasLimit: 6800000,
};

export const deployChangerParamsr: Record<string, ChangerParams> = {
  hardhat: rskTestnetChangerParams, // TODO: use mainnet params
  rskTestnet: rskTestnetChangerParams,
  rskAlphaTestnet: rskAlphaTestnetChangerParams,
  rskMainnet: rskMainnetChangerParams,
};

export const getNetworkChangerParams = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  return deployChangerParamsr[network];
};
