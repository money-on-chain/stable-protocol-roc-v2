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
    mocFeeTokenPriceProvider: "",
    rocFeeTokenPriceProvider: "",
    revAucBTC2MOCProxy: "",
    revAucBTC2MOCNewImplement: "",
  },
  gasLimit: 6800000,
};

export const rskAlphaTestnetChangerParams: ChangerParams = {
  changer: {
    rocCoreProxy: "0xf5008675cF2b677682C8dfF7f1ae149643781169",
    mocMocStateProxy: "0xfb526c0Ace90f52049691389B040a33D03343eb7",
    upgradeDelegator: "0xa12a9A492eFEBf4E43B174A57886286dA5057B8D",
    mocFeeTokenPriceProvider: "",
    rocFeeTokenPriceProvider: "",
    revAucBTC2MOCProxy: "",
    revAucBTC2MOCNewImplement: "",
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
    revAucBTC2MOCProxy: "0xc8863D91604A12CE6073CA6A01d00172bb9Bd508",
    revAucBTC2MOCNewImplement: "0xb3eC05D6971ea5D86d38eb1EA0284733876ab6f4",
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
