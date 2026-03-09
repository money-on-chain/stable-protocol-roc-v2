import { defineConfig, configVariable } from "hardhat/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatContractSizer from "@solidstate/hardhat-contract-sizer";

// Note: @nomicfoundation/hardhat-toolbox-mocha-ethers includes:
// - @nomicfoundation/hardhat-ethers
// - @nomicfoundation/hardhat-ethers-chai-matchers
// - @nomicfoundation/hardhat-ignition
// - @nomicfoundation/hardhat-ignition-ethers
// - @nomicfoundation/hardhat-keystore
// - @nomicfoundation/hardhat-mocha
// - @nomicfoundation/hardhat-network-helpers
// - @nomicfoundation/hardhat-typechain
// - @nomicfoundation/hardhat-verify

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  mainnet: 1,
  rskTestnet: 31,
  rskMainnet: 30,
};

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}

const compilers = [
  {
    version: "0.5.8",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  {
    version: "0.7.6",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "london",
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yulDetails: {
            optimizerSteps:
              "dhfoDgvulfnTUtnIf[xa[r]EscLMcCTUtTOntnfDIulLculVcul[j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTOtfDnca[r]Iulc]jmul[jul]VcTOculjmul",
          },
        },
      },
      viaIR: true,
      evmVersion: "london",
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yulDetails: {
            optimizerSteps:
              "dhfoDgvulfnTUtnIf[xa[r]EscLMcCTUtTOntnfDIulLculVcul[j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTOtfDnca[r]Iulc]jmul[jul]VcTOculjmul",
          },
        },
      },
      viaIR: true,
      evmVersion: "london",
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
];

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers, hardhatContractSizer],

  solidity: {
    profiles: {
      production: {
        isolated: false,
        compilers,
      },
      default: {
        compilers,
      },
    },
    npmFilesToBuild: [
      "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol",
      "moc-main-latest/contracts/core/MocCoreExpansion.sol",
      "moc-main-latest/contracts/mocks/PriceProviderMock.sol",
      "moc-main-latest/contracts/auxiliary/CommissionSplitterRC20.sol",
      "moc-main-latest/contracts/governance/InterimGovernor.sol",
      "moc-main-latest/contracts/tokens/MocRC20.sol",
      "moc-main-latest/contracts/queue/MocQueue.sol",
      "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol",

      "moc-main-latest/contracts/auxiliary/MocReverseAuction.sol",
      "moc-main-latest/contracts/multiCollateral/swapper/MocSwapperV3.sol",
      "moc-main-latest/contracts/multiCollateral/swapper/MocSwapperV3MultiHop.sol",

      "@moc/price-oracle-interfaces/contracts/PriceProviderInverse.sol",
      "@moc/price-oracle-interfaces/contracts/PriceProviderDummy.sol",

      "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
    ],
  },
  contractSizer: {
    runOnCompile: true,
    except: [/.*[Tt]ests?$/, /.*[Mm]ock.*/, /.*Handler$/, /.*\.t\.sol/],
    flat: false,
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      accounts: {
        mnemonic,
        accountsBalance: "100000000000000000000000000000000000",
      },
      chainId: chainIds.hardhat,
    },
    rskAlphaTestnet: {
      type: "http",
      url: configVariable("RSK_TESTNET_RPC_URL"),
      chainId: chainIds.rskTestnet,
      accounts: {
        mnemonic,
      },
    },
    rskTestnet: {
      type: "http",
      url: configVariable("RSK_TESTNET_RPC_URL"),
      chainId: chainIds.rskTestnet,
      accounts: {
        mnemonic,
      },
    },
    rskMainnet: {
      type: "http",
      url: configVariable("RSK_MAINNET_RPC_URL"),
      chainId: chainIds.rskMainnet,
      accounts: {
        mnemonic,
      },
    },
    rskMainnetFork: {
      type: "edr-simulated",
      forking: {
        url: "https://public-node.rsk.co",
        blockNumber: 8524500,
      },
      chainId: 30,
      accounts: {
        mnemonic,
        accountsBalance: "100000000000000000000000000000000000",
      },
      //loggingEnabled: true,
    },
    localhost: {
      type: "http",
      url: "http://localhost:8545",
      chainId: chainIds.rskMainnet,
      accounts: {
        mnemonic,
      },
      gas: 30000000,
    },
  },

  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },

  test: {
    solidity: {
      ffi: true,
      fsPermissions: {
        readDirectory: ["./out", "./test"],
      },
    },
  },

  typechain: {
    outDir: "./typechain",
  },
});
