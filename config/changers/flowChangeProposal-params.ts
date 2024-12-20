import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 3756;
const WEEK_BLOCK_SPAN = DAY_BLOCK_SPAN * 7;
const MONTH_BLOCK_SPAN = DAY_BLOCK_SPAN * 30;

type ChangerParams = {
  changer: {
    mocCoreProxyAddress: string;
    feeTokenPriceProvider: string;
    tcInterestPaymentBlockSpan: number;
    settlementBlockSpan: number;
    decayBlockSpan: number;
    emaCalculationBlockSpan: number;
  };
  feesSplitterParams: {
    governorAddress: string;
    acTokenAddress: string;
    feeTokenAddress: string;
    acTokenAddressRecipient1: string;
    acTokenAddressRecipient2: string;
    acTokenPctToRecipient1: BigNumber;
    feeTokenAddressRecipient1: string;
    feeTokenAddressRecipient2: string;
    feeTokenPctToRecipient1: BigNumber;
  };
  tcInterestSplitterParams: {
    governorAddress: string;
    acTokenAddress: string;
    feeTokenAddress: string;
    acTokenAddressRecipient1: string;
    acTokenAddressRecipient2: string;
    acTokenPctToRecipient1: BigNumber;
    feeTokenAddressRecipient1: string;
    feeTokenAddressRecipient2: string;
    feeTokenPctToRecipient1: BigNumber;
  };
  gasLimit: number;
};

export const rskTestnetChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "0xa416934264515bb381E3b746f10f22D5c6f9431a",
    feeTokenPriceProvider: "0x4F9724e78e7Cd521c879b6B9eE7D5b4e7df3cfbC",
    tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
    settlementBlockSpan: MONTH_BLOCK_SPAN,
    decayBlockSpan: DAY_BLOCK_SPAN,
    emaCalculationBlockSpan: DAY_BLOCK_SPAN,
  },
  feesSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: BigNumber.from("666666666666666666"),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
  },
  tcInterestSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(100).div(100),
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "0xf5008675cF2b677682C8dfF7f1ae149643781169",
    feeTokenPriceProvider: "0x8DCE78BbD4D757EF7777Be113277cf5A35283b1E",
    tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
    settlementBlockSpan: MONTH_BLOCK_SPAN,
    decayBlockSpan: DAY_BLOCK_SPAN,
    emaCalculationBlockSpan: DAY_BLOCK_SPAN,
  },
  feesSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: BigNumber.from("666666666666666666"),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
  },
  tcInterestSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(100).div(100),
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetQAChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "0x16F68976cDF62B911509921418dAaA95e686ca65",
    feeTokenPriceProvider: "0x8DCE78BbD4D757EF7777Be113277cf5A35283b1E",
    tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
    settlementBlockSpan: MONTH_BLOCK_SPAN,
    decayBlockSpan: DAY_BLOCK_SPAN,
    emaCalculationBlockSpan: DAY_BLOCK_SPAN
  },
  feesSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: BigNumber.from('666666666666666666'),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100)
  },
  tcInterestSplitterParams: {
    governorAddress: "0x7b716178771057195bB511f0B1F7198EEE62Bc22",
    acTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
    feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
    acTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    acTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "0xB5E2Bed9235b6366Fa0254c2e6754E167e0a2383",
    feeTokenAddressRecipient2: "0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3",
    feeTokenPctToRecipient1: PCT_BASE.mul(100).div(100)
  },
  gasLimit: 6800000,
};

export const rskMainnetChangerParams: ChangerParams = {
  changer: {
    mocCoreProxyAddress: "0xA27024Ed70035E46dba712609fc2Afa1c97aA36A",
    feeTokenPriceProvider: "0x4fE0f11966DE88a0F8b489017F52d13D9eC1230f",
    tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
    settlementBlockSpan: MONTH_BLOCK_SPAN,
    decayBlockSpan: DAY_BLOCK_SPAN,
    emaCalculationBlockSpan: DAY_BLOCK_SPAN,
  },
  feesSplitterParams: {
    governorAddress: "0x3b8853DF65AfBd94853E6D77ee0Ab5590F41bB08",
    acTokenAddress: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
    feeTokenAddress: "0x9AC7fE28967B30E3A4e6e03286d715b42B453D10",
    acTokenAddressRecipient1: "0x4905f643db489d9561617638d31875b6bff79077",
    acTokenAddressRecipient2: "0x3533bd069Ed7dA74C2274869Cd930778e8edF1E0",
    acTokenPctToRecipient1: BigNumber.from("666666666666666666"),
    feeTokenAddressRecipient1: "0x4905f643db489d9561617638d31875b6bff79077",
    feeTokenAddressRecipient2: "0x73e9DabfcDAE8e50BAF9F6FaDd2F4f8b845E17f3",
    feeTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
  },
  tcInterestSplitterParams: {
    governorAddress: "0x3b8853DF65AfBd94853E6D77ee0Ab5590F41bB08",
    acTokenAddress: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
    feeTokenAddress: "0x9AC7fE28967B30E3A4e6e03286d715b42B453D10",
    acTokenAddressRecipient1: "0x4905f643db489d9561617638d31875b6bff79077",
    acTokenAddressRecipient2: "0x3533bd069Ed7dA74C2274869Cd930778e8edF1E0",
    acTokenPctToRecipient1: PCT_BASE.mul(50).div(100),
    feeTokenAddressRecipient1: "0x4905f643db489d9561617638d31875b6bff79077",
    feeTokenAddressRecipient2: "0x4905f643db489d9561617638d31875b6bff79077",
    feeTokenPctToRecipient1: PCT_BASE.mul(100).div(100),
  },
  gasLimit: 6800000,
};

export const deployChangerParams: Record<string, ChangerParams> = {
  hardhat: rskMainnetChangerParams,
  rskTestnet: rskTestnetChangerParams,
  rskAlphaTestnet: rskAlphaTestnetChangerParams,
  rskAlphaTestnetQA: rskAlphaTestnetQAChangerParams,
  rskMainnet: rskMainnetChangerParams,
};

export const getNetworkChangerParams = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  return deployChangerParams[network];
};