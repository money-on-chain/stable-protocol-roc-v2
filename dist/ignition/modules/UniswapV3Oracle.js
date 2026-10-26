import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { batchModule } from "ignition-utils";
/**
 * Deploys the Uniswap V3 oracle used for the WRBTC/MOC testnet pool.
 *
 * The constructor arguments are intentionally kept in this module because this
 * deployment is testnet-only and does not need a network parameter file.
 */
const UniswapV3OracleModule = buildModule("UniswapV3OracleModule", m => {
    // Rootstock Testnet WRBTC/MOC Uniswap V3 pool.
    const pool = "0x536af50B25887808C6100343772eDed07C5bC414";
    const quoteToken = "0x69FE5cEC81D5eF92600c1A0dB1F11986AB3758Ab";
    const twapInterval = 3600;
    const oracle = m.contract("@moc/price-oracle-interfaces/contracts/UniswapV3Oracle.sol:UniswapV3Oracle", [
        pool,
        twapInterval,
        quoteToken,
    ]);
    return { oracle };
});
export default batchModule(UniswapV3OracleModule);
//# sourceMappingURL=UniswapV3Oracle.js.map