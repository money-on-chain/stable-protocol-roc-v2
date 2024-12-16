import { HardhatRuntimeEnvironment } from "hardhat/types";

type ChangerParams = {
  changer: {
    rocCoreProxy: string;
    mocMocStateProxy: string;
    upgradeDelegator: string;
    mocFeeTokenPriceProvider: string;
    rocFeeTokenPriceProvider: string;
    revAucBTC2MOCProxy: string;
    revAucBTC2MOCNewImplement: string;
  };
  gasLimit: number;
};

export const rskTestnetChangerParams: ChangerParams = {
  changer: {
    rocCoreProxy: "0xa416934264515bb381E3b746f10f22D5c6f9431a",
    mocMocStateProxy: "0x0adb40132cB0ffcEf6ED81c26A1881e214100555",
    upgradeDelegator: "0xa12a9A492eFEBf4E43B174A57886286dA5057B8D",
    mocFeeTokenPriceProvider: "0x8DCE78BbD4D757EF7777Be113277cf5A35283b1E",
    rocFeeTokenPriceProvider: "0x4F9724e78e7Cd521c879b6B9eE7D5b4e7df3cfbC",
    revAucBTC2MOCProxy: "0xb908E56e1f386d6F955569a687d5286F7e49A90F",
    revAucBTC2MOCNewImplement: "0xc2d83b071aC905c0083a4Be4547631Cf197Bcc28",
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetChangerParams: ChangerParams = {
  changer: {
    rocCoreProxy: "0xf5008675cF2b677682C8dfF7f1ae149643781169",
    mocMocStateProxy: "0xfb526c0Ace90f52049691389B040a33D03343eb7",
    upgradeDelegator: "0xa12a9A492eFEBf4E43B174A57886286dA5057B8D",
    mocFeeTokenPriceProvider: "0xE972c8E83A5b97bB4FC867855A0aA13EF96f228D",
    rocFeeTokenPriceProvider: "0x4F9724e78e7Cd521c879b6B9eE7D5b4e7df3cfbC",
    revAucBTC2MOCProxy: "0xb908E56e1f386d6F955569a687d5286F7e49A90F",
    revAucBTC2MOCNewImplement: "0xc2d83b071aC905c0083a4Be4547631Cf197Bcc28",
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetQAChangerParams: ChangerParams = {
  changer: {
    rocCoreProxy: "",
    mocMocStateProxy: "",
    upgradeDelegator: "0xa12a9A492eFEBf4E43B174A57886286dA5057B8D",
    mocFeeTokenPriceProvider: "",
    rocFeeTokenPriceProvider: "",
    revAucBTC2MOCProxy: "",
    revAucBTC2MOCNewImplement: "",
  },
  gasLimit: 6800000,
};

export const rskMainnetChangerParams: ChangerParams = {
  changer: {
    rocCoreProxy: "0xA27024Ed70035E46dba712609fc2Afa1c97aA36A",
    mocMocStateProxy: "0xb9C42EFc8ec54490a37cA91c423F7285Fa01e257",
    upgradeDelegator: "0x131564703310a294C1bFDC09D10EC0659f18E253",
    mocFeeTokenPriceProvider: "0x11683439c9509C135ee4F7bB6e23835e1d86ECBA",
    rocFeeTokenPriceProvider: "0xC6f37A4DF82B21aC382442BC73D668B3B2F4Cef0",
    revAucBTC2MOCProxy: "0xc8863d91604A12cE6073cA6A01D00172BB9BD508",
    revAucBTC2MOCNewImplement: "0xB3ec05D6971Ea5D86D38EB1Ea0284733876aB6F4",
  },
  gasLimit: 6800000,
};

export const deployChangerParamsr: Record<string, ChangerParams> = {
  hardhat: rskTestnetChangerParams,
  rskTestnet: rskTestnetChangerParams,
  rskAlphaTestnet: rskAlphaTestnetChangerParams,
  rskAlphaTestnetQA: rskAlphaTestnetQAChangerParams,
  rskMainnet: rskMainnetChangerParams,
};

export const getNetworkChangerParams = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  return deployChangerParamsr[network];
};
