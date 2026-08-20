import { defineConfig } from "hardhat/config";
import type { HttpNetworkAccountsUserConfig } from "hardhat/types/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatContractSizer from "@solidstate/hardhat-contract-sizer";

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

const pk = process.env.PK?.trim();
const mnemonic = process.env.MNEMONIC?.trim();

const accounts: HttpNetworkAccountsUserConfig = pk ? [pk] : mnemonic ? { mnemonic } : [];

const testnet_rpc_url = process.env["RSK_TESTNET_RPC_URL"] || "https://public-node.testnet.rsk.co";
const mainnet_rpc_url = process.env["RSK_MAINNET_RPC_URL"] || "https://public-node.rsk.co";

export { compilers, npmFilesToBuild } from "./config/solidity.js";
import { compilers, npmFilesToBuild } from "./config/solidity.js";

export default defineConfig({
  plugins: [hardhatToolboxViem, hardhatContractSizer],

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
    npmFilesToBuild,
  },
  contractSizer: {
    runOnCompile: true,
    except: [/.*[Tt]ests?$/, /.*[Mm]ock.*/, /.*Handler$/, /.*\.t\.sol/],
    flat: false,
  },
  verify: {
    // Rootstock explorer is still experimental
    // as it needs extra parameters obtained from the website
    // to interact with the nextjs app.
    blockscout: {
      enabled: true,
    },
    etherscan: {
      enabled: false,
      apiKey: process.env.ETHERSCAN_API_KEY ?? "unused",
    },
  },
  chainDescriptors: {
    [chainIds.rskMainnet]: {
      name: "Rootstock",
      chainType: "generic",
      hardforkHistory: {
        london: { blockNumber: 0 },
      },
      blockExplorers: {
        etherscan: {
          url: "",
          apiUrl: "",
        },
        blockscout: {
          url: "https://rootstock.blockscout.com",
          apiUrl: "https://rootstock.blockscout.com/api",
        },
      },
    },
    [chainIds.rskTestnet]: {
      name: "Rootstock Testnet",
      chainType: "generic",
      hardforkHistory: {
        london: { blockNumber: 0 },
      },
      blockExplorers: {
        etherscan: {
          url: "",
          apiUrl: "",
        },
        blockscout: {
          url: "https://rootstock-testnet.blockscout.com",
          apiUrl: "https://rootstock-testnet.blockscout.com/api",
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: chainIds.hardhat,
      accounts: {
        mnemonic,
        accountsBalance: 1000000000n,
      },
    },
    // This is the network used when running 'hardhat node'.
    // cli arguments are broken in 'hardhat node' so we use ENV vars
    // directly in this network.
    node: {
      type: "edr-simulated",
      chainId: Number(process.env["FORK_CHAIN_ID"]) || undefined,
      forking: {
        url: (process.env["FORK_RPC_URL"] as string) || mainnet_rpc_url,
        blockNumber: Number(process.env["FORK_BLOCK_NUMBER"]) || undefined,
      },
      accounts: {
        mnemonic,
        accountsBalance: 10000000000000000000000n,
      },
      gas: 30000000,
    },
    rskAlphaTestnet: {
      type: "http",
      url: testnet_rpc_url,
      chainId: chainIds.rskTestnet,
      accounts,
    },
    rskTestnet: {
      type: "http",
      url: testnet_rpc_url,
      chainId: chainIds.rskTestnet,
      accounts,
    },
    rskMainnet: {
      type: "http",
      url: mainnet_rpc_url,
      chainId: chainIds.rskMainnet,
      accounts,
    },
    rskMainnetFork: {
      type: "edr-simulated",
      forking: {
        url: "https://public-node.rsk.co",
        blockNumber: 8525307,
      },
      chainId: 30,
      accounts: {
        mnemonic,
        accountsBalance: 10000000000000000000n,
      },
      //loggingEnabled: true,
    },
    localhost: {
      type: "http",
      url: "http://localhost:8545",
      // Keep the HTTP client aligned with the chain id used by the local fork.
      // The fork runner sets FORK_CHAIN_ID to 30 (mainnet) or 31 (testnet).
      chainId: Number(process.env["FORK_CHAIN_ID"]) || chainIds.rskMainnet,
      gas: 30000000,
    },
  },
  ignition: {
    blockPollingInterval: 5000,
    timeBeforeBumpingFees: 120000,
    maxFeeBumps: 10,
    requiredConfirmations: 1,
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
        readDirectory: ["./out", "./test", "./ignition", "./addressBook.json"],
      },
    },
  },
});
