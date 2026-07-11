import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Address } from "viem";
type ChangerParams = {
    mocVendorsAddress: Address;
    maxVendorMarkup: string;
    vendors: Address[];
    gasLimit: number;
};
export declare const rskTestnetChangerParams: ChangerParams;
export declare const rskMainnetChangerParams: ChangerParams;
export declare const deployChangerParamsr: Record<string, ChangerParams>;
export declare const getNetworkChangerParams: (hre: HardhatRuntimeEnvironment) => ChangerParams;
export {};
//# sourceMappingURL=mocVendorsUpgradeParams.d.ts.map