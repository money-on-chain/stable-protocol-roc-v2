import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-solhint";
import "@nomicfoundation/hardhat-chai-matchers";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import "hardhat-contract-sizer";
import "hardhat-deploy";
import "hardhat-docgen";
import "hardhat-gas-reporter";
import { removeConsoleLog } from "hardhat-preprocessor";
import { HardhatUserConfig } from "hardhat/config";
import { Address } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import "solidity-coverage";
import "hardhat-storage-layout";
import { DeployParameters } from "moc-main/export/scripts/types";
import { hardhatDeployParams } from "./config/deployParams-hardhat";
import { developmentMigrateParams } from "./config/deployParams-development";
import { rskTestnetMigrationParams } from "./config/deployParams-rskTestnet";
import { rskMainnetMigrationParams } from "./config/deployParams-rskMainnet";
import { rskAlphaTestnetMigrationParams, rskAlphaTestnetDeployParams } from "./config/deployParams-rskAlphaTestnet";

dotenvConfig({ path: resolve(__dirname, "./.env") });

export type MigrateParameters = {
  coreParams: {
    decayBlockSpan: number;
    successFee: BigNumber;
    appreciationFactor: BigNumber;
    allowDifferentRecipient: boolean;
  };
  mocAddresses: {
    mocAppreciationBeneficiaryAddress: Address;
    maxAbsoluteOpProviderAddress?: Address;
    maxOpDiffProviderAddress?: Address;
    mocVendorsAddress?: Address;
  };
  feeParams: {
    feeRetainer: BigNumber;
    swapTPforTPFee: BigNumber;
    swapTPforTCFee: BigNumber;
    swapTCforTPFee: BigNumber;
    redeemTCandTPFee: BigNumber;
    mintTCandTPFee: BigNumber;
    feeTokenPct: BigNumber;
  };
  queueParams: DeployParameters["queueParams"];
  gasLimit: DeployParameters["gasLimit"];
  mocV1Address: string;
};

declare module "hardhat/types/config" {
  export interface HardhatNetworkUserConfig {
    deployParameters: { deploy?: DeployParameters; migrate?: MigrateParameters };
  }
  export interface HardhatNetworkConfig {
    deployParameters: { deploy?: DeployParameters; migrate?: MigrateParameters };
  }
  export interface HttpNetworkConfig {
    deployParameters: { deploy?: DeployParameters; migrate?: MigrateParameters };
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
  polygonMumbai: 80001,
};

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
    otherUser: 1,
    alice: 2,
    bob: 3,
    charlie: 4,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
        accountsBalance: "100000000000000000000000000000000000",
      },
      chainId: chainIds.hardhat,
      hardfork: "london", // FIXME: latest evm version supported by rsk explorers, keep it updated
      // TODO: remove this
      allowUnlimitedContractSize: true,
      deployParameters: { deploy: hardhatDeployParams },
      tags: ["local"],
    },
    development: {
      url: "http://127.0.0.1:8545",
      deployParameters: { migrate: developmentMigrateParams },
      tags: ["local", "migration"],
    },
    rskTestnetMigration: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://public-node.testnet.rsk.co",
      deployParameters: { migrate: rskTestnetMigrationParams },
      tags: ["testnet", "migration"],
    },
    rskTestnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://rpc.testnet.rootstock.io/Lgi4Te7Fpti2h1yfKWYSKpNLLnmM5R-T" /*https://rpc.testnet.rootstock.io/Lgi4Te7Fpti2h1yfKWYSKpNLLnmM5R-T*/,
      deployParameters: { migrate: rskTestnetMigrationParams },
      tags: ["testnet"],
      gasPrice: 69000000,
    },
    rskAlphaTestnetMigration: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://public-node.testnet.rsk.co",
      deployParameters: { migrate: rskAlphaTestnetMigrationParams },
      tags: ["testnet", "migration"],
    },
    rskAlphaTestnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://rpc.testnet.rootstock.io/Lgi4Te7Fpti2h1yfKWYSKpNLLnmM5R-T",
      deployParameters: { deploy: rskAlphaTestnetDeployParams },
      tags: ["testnet"],
    },
    rskMainnetMigration: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskMainnet,
      url: "https://public-node.rsk.co",
      deployParameters: { migrate: rskMainnetMigrationParams },
      tags: ["mainnet", "migration"],
    },
    rskMainnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskMainnet,
      url: "https://public-node.rsk.co",
      deployParameters: { migrate: rskMainnetMigrationParams },
      tags: ["mainnet"],
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
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
      evmVersion: "london", // FIXME: latest evm version supported by rsk explorers, keep it updated
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["node_modules/moc-main/export/artifacts/*.json", "./dependencies/mocV1Imports/*.json"],
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
    except: ["^contracts/echidna/", "^contracts/mocks/"],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  mocha: {
    timeout: 100000,
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
