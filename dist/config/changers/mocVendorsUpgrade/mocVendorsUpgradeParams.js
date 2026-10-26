export const rskTestnetChangerParams = {
    mocVendorsAddress: "0x0000000000000000000000000000000000000000", // TODO: set the testnet mocVendors proxy address
    maxVendorMarkup: "20000000000000000", // 2% in 18 decimals
    vendors: [],
    gasLimit: 6800000,
};
export const rskMainnetChangerParams = {
    mocVendorsAddress: "0x5F69df7e853686a794c13be029FF228642C07012",
    maxVendorMarkup: "20000000000000000", // 2% in 18 decimals
    vendors: ["0xd249E2275A6ed216432f167c3393f6F72e09eF49", "0xC61820bFB8F87391d62Cd3976dDc1d35e0cf7128"],
    gasLimit: 6800000,
};
export const deployChangerParamsr = {
    hardhat: rskMainnetChangerParams,
    rskTestnet: rskTestnetChangerParams,
    rskMainnet: rskMainnetChangerParams,
};
export const getNetworkChangerParams = (hre) => {
    const networkName = hre.globalOptions.network ?? "hardhat";
    const network = networkName === "localhost" ? "hardhat" : networkName;
    return deployChangerParamsr[network];
};
//# sourceMappingURL=mocVendorsUpgradeParams.js.map