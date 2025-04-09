import "@nomiclabs/hardhat-solhint";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@tenderly/hardhat-tenderly";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import "hardhat-contract-sizer";
import "hardhat-deploy";
import "hardhat-docgen";
import "hardhat-gas-reporter";
import { removeConsoleLog } from "hardhat-preprocessor";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
import "hardhat-storage-layout";

dotenvConfig({ path: resolve(__dirname, "./.env") });

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    tenderly?: {
      project?: string;
      username?: string;
      privateVerification?: boolean;
    };
  }

  interface HardhatConfig {
    tenderly?: {
      project?: string;
      username?: string;
      privateVerification?: boolean;
    };
  }
}

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
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

let rskTestnetApiKey: string;
if (!process.env.RSK_TESTNET_API_KEY) {
  throw new Error("Please set your RSK_TESTNET_API_KEY in a .env file");
} else {
  rskTestnetApiKey = process.env.RSK_TESTNET_API_KEY;
}

let rskMainnetApiKey: string;
if (!process.env.RSK_MAINNET_API_KEY) {
  throw new Error("Please set your RSK_MAINNET_API_KEY in a .env file");
} else {
  rskMainnetApiKey = process.env.RSK_MAINNET_API_KEY;
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
    otherUser: 1,
    alice: 2,
    bob: 3,
    charlie: 4,
    pauser: 6,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
        accountsBalance: "100000000000000000000000000000000000",
      },
      chainId: chainIds.hardhat,
      hardfork: "london", // FIXME: latest evm version supported by rsk explorers, keep it updated
      tags: ["testing", "local"],
    },
    rskAlphaTestnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://rpc.testnet.rootstock.io/" + rskTestnetApiKey,
      tags: ["testing"],
      verify: {
        etherscan: {
          apiUrl: "https://rootstock-testnet.blockscout.com/api/",
          apiKey: "API_KEY",
        },
      },
    },
    rskTestnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://rpc.testnet.rootstock.io/" + rskTestnetApiKey,
      tags: ["testing"],
      verify: {
        etherscan: {
          apiUrl: "https://rootstock-testnet.blockscout.com/api/",
          apiKey: "API_KEY",
        },
      },
    },
    rskMainnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskMainnet,
      url: "https://rpc.mainnet.rootstock.io/" + rskMainnetApiKey,
      tags: ["mainnet"],
      verify: {
        etherscan: {
          apiUrl: "https://rootstock.blockscout.com/api/",
          apiKey: "API_KEY",
        },
      },
    },
  },
  tenderly: {
    privateVerification: false,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
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
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yulDetails: {
                // solves viaIR issue that inline internal functions: https://github.com/ethereum/solidity/issues/13858#issuecomment-1428754261
                optimizerSteps:
                  "dhfoDgvulfnTUtnIf[xa[r]EscLMcCTUtTOntnfDIulLculVcul[j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTOtfDnca[r]Iulc]jmul[jul]VcTOculjmul",
              },
            },
          },
          viaIR: process.env.VIA_IR === undefined ? true : process.env.VIA_IR == "true",
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
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yulDetails: {
                // solves viaIR issue that inline internal functions: https://github.com/ethereum/solidity/issues/13858#issuecomment-1428754261
                optimizerSteps:
                  "dhfoDgvulfnTUtnIf[xa[r]EscLMcCTUtTOntnfDIulLculVcul[j]Tpeulxa[rul]xa[r]cLgvifCTUca[r]LSsTOtfDnca[r]Iulc]jmul[jul]VcTOculjmul",
              },
            },
          },
          viaIR: process.env.VIA_IR === undefined ? true : process.env.VIA_IR == "true",
          evmVersion: "london", // FIXME: latest evm version supported by rsk explorers, keep it updated
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: [
      "node_modules/moc-main/export/artifacts/*.json",
      "node_modules/moc-main-v1.0.6/export/artifacts/*.json",
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    gasPrice: 21,
  },
  preprocess: {
    eachLine: removeConsoleLog(hre => !["hardhat", "localhost"].includes(hre.network.name)),
  },
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: false,
    except: ["^contracts/mocks/"],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  mocha: {
    timeout: 900000,
  },
  external: {
    contracts: [
      {
        artifacts: "node_modules/moc-main/export/artifacts",
      },
    ],
  },
};

export default config;
