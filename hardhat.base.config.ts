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
import { BigNumber } from "ethers";
import "solidity-coverage";
import "hardhat-storage-layout";
import { DeployParameters } from "moc-main/export/scripts/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const PCT_BASE = BigNumber.from((1e18).toString());
const DAY_BLOCK_SPAN = 2880;
const WEEK_BLOCK_SPAN = DAY_BLOCK_SPAN * 7;
const MONTH_BLOCK_SPAN = DAY_BLOCK_SPAN * 30;

export type RifDeployParameters = Omit<DeployParameters, "ctParams"> & {
  ctParams?: {
    name: String;
    symbol: String;
  };
  mocAddresses: {
    collateralTokenAddress: String;
  };
};

declare module "hardhat/types/config" {
  export interface HardhatNetworkUserConfig {
    deployParameters: RifDeployParameters;
    mocV1Address?: string;
  }
  export interface HardhatNetworkConfig {
    deployParameters: RifDeployParameters;
    mocV1Address?: string;
  }
  export interface HttpNetworkConfig {
    deployParameters: RifDeployParameters;
    mocV1Address?: string;
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
  polygonMumbai: 80001,
};

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}
/*
let alchemyApiKey: string;
if (!process.env.ALCHEMY_API_KEY) {
  throw new Error("Please set your ALCHEMY_API_KEY in a .env file");
} else {
  alchemyApiKey = process.env.ALCHEMY_API_KEY;
}*/
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
      deployParameters: {
        coreParams: {
          protThrld: PCT_BASE.mul(2), // 2
          liqThrld: PCT_BASE.mul(104).div(100), // 1.04
          emaCalculationBlockSpan: DAY_BLOCK_SPAN,
          successFee: PCT_BASE.mul(10).div(100), // 10%
          appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
          tcInterestRate: PCT_BASE.mul(5).div(100000), // 0.005% : weekly 0.0025 / 365 * 7
          tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
          decayBlockSpan: DAY_BLOCK_SPAN,
        },
        settlementParams: {
          bes: MONTH_BLOCK_SPAN,
        },
        feeParams: {
          feeRetainer: PCT_BASE.mul(0), // 0%
          mintFee: PCT_BASE.mul(5).div(100), // 5%
          redeemFee: PCT_BASE.mul(5).div(100), // 5%
          swapTPforTPFee: PCT_BASE.mul(1).div(100), // 1%
          swapTPforTCFee: PCT_BASE.mul(1).div(100), // 1%
          swapTCforTPFee: PCT_BASE.mul(1).div(100), // 1%
          redeemTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
          mintTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
          feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
        },
        mocAddresses: {
          governorAddress: "", // if not provided a new GovernorMock.sol is deployed
          collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
          collateralTokenAddress: "", // if not provided a new MocTC.sol is deployed
          pauserAddress: "", // if not provided is set to deployer
          feeTokenAddress: "0x26a00AF444928d689DDeC7b4d17c0e4A8c9D4060",
          feeTokenPriceProviderAddress: "0x26A00AF444928d689ddec7b4d17c0E4A8C9D4061",
          mocFeeFlowAddress: "0x26a00aF444928d689DDEC7b4D17c0E4a8c9D407d",
          mocAppreciationBeneficiaryAddress: "0x26A00aF444928D689ddEC7B4D17C0E4A8C9d407F",
          vendorsGuardianAddress: "0x26a00AF444928D689DDeC7b4D17c0E4a8C9d407E",
          tcInterestCollectorAddress: "0x27a00Af444928D689DDec7B4D17c0E4a8c9d407F",
          maxAbsoluteOpProviderAddress: "", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
          maxOpDiffProviderAddress: "", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
        },
        ctParams: {
          name: "RIFPROv2",
          symbol: "RIFPv2",
        },
        tpParams: {
          tpParams: [
            {
              name: "tUSDRIF",
              symbol: "tUSDRIF",
              priceProvider: "", // if not provided a new FakePriceProvider with price = 1 will be deployed
              ctarg: PCT_BASE.mul(55).div(10), // 5.5
              mintFee: PCT_BASE.div(100), // 1%
              redeemFee: PCT_BASE.div(100), // 1%
              initialEma: PCT_BASE.mul(6790).div(100000), //0.06790
              smoothingFactor: PCT_BASE.mul(1104).div(100000), // 0.01104
            },
          ],
        },
        queueParams: {
          minOperWaitingBlk: 1,
          maxOperPerBatch: 10,
          execFeeParams: {
            tcMintExecFee: BigNumber.from("1000000"),
            tcRedeemExecFee: BigNumber.from("1000001"),
            tpMintExecFee: BigNumber.from("1000002"),
            tpRedeemExecFee: BigNumber.from("1000003"),
            mintTCandTPExecFee: BigNumber.from("2000000"),
            redeemTCandTPExecFee: BigNumber.from("2000001"),
            swapTPforTPExecFee: BigNumber.from("2000002"),
            swapTPforTCExecFee: BigNumber.from("1000003"),
            swapTCforTPExecFee: BigNumber.from("1000004"),
          },
        },
        gasLimit: 30000000, // high value to avoid coverage issue. https://github.com/NomicFoundation/hardhat/issues/3121
      },
      tags: ["local"],
    },
    development: {
      url: "http://127.0.0.1:8545",
      deployParameters: {
        coreParams: {
          protThrld: PCT_BASE.mul(2), // 2
          liqThrld: PCT_BASE.mul(104).div(100), // 1.04
          emaCalculationBlockSpan: DAY_BLOCK_SPAN,
          successFee: PCT_BASE.mul(10).div(100), // 10%
          appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
          tcInterestRate: PCT_BASE.mul(5).div(100000), // 0.005% : weekly 0.0025 / 365 * 7
          tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
          decayBlockSpan: DAY_BLOCK_SPAN,
        },
        settlementParams: {
          bes: MONTH_BLOCK_SPAN,
        },
        feeParams: {
          feeRetainer: PCT_BASE.mul(0), // 0%
          mintFee: PCT_BASE.mul(5).div(100), // 5%
          redeemFee: PCT_BASE.mul(5).div(100), // 5%
          swapTPforTPFee: PCT_BASE.mul(1).div(100), // 1%
          swapTPforTCFee: PCT_BASE.mul(1).div(100), // 1%
          swapTCforTPFee: PCT_BASE.mul(1).div(100), // 1%
          redeemTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
          mintTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
          feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
        },
        mocAddresses: {
          governorAddress: "", // if not provided a new GovernorMock.sol is deployed
          collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
          collateralTokenAddress: "", // if not provided a new MocTC.sol is deployed, but required ctParams
          pauserAddress: "", // if not provided is set to deployer
          feeTokenAddress: "0x26a00AF444928d689DDeC7b4d17c0e4A8c9D4060",
          feeTokenPriceProviderAddress: "0x26A00AF444928d689ddec7b4d17c0E4A8C9D4061",
          mocFeeFlowAddress: "0x26a00aF444928d689DDEC7b4D17c0E4a8c9D407d",
          mocAppreciationBeneficiaryAddress: "0x26A00aF444928D689ddEC7B4D17C0E4A8C9d407F",
          vendorsGuardianAddress: "0x26a00AF444928D689DDeC7b4D17c0E4a8C9d407E",
          tcInterestCollectorAddress: "0x27a00Af444928D689DDec7B4D17c0E4a8c9d407F",
          maxAbsoluteOpProviderAddress: "", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
          maxOpDiffProviderAddress: "", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
        },
        queueParams: {
          minOperWaitingBlk: 1,
          maxOperPerBatch: 10,
          execFeeParams: {
            tcMintExecFee: BigNumber.from("1000000"),
            tcRedeemExecFee: BigNumber.from("1000001"),
            tpMintExecFee: BigNumber.from("1000002"),
            tpRedeemExecFee: BigNumber.from("1000003"),
            mintTCandTPExecFee: BigNumber.from("2000000"),
            redeemTCandTPExecFee: BigNumber.from("2000001"),
            swapTPforTPExecFee: BigNumber.from("2000002"),
            swapTPforTCExecFee: BigNumber.from("1000003"),
            swapTCforTPExecFee: BigNumber.from("1000004"),
          },
        },
        gasLimit: 6800000,
      },
      mocV1Address: "0x25ba86304D6CD460C848768dB0478EB984C990d7",
      tags: ["local", "migration"],
    },
    rskTestnetMigration: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://public-node.testnet.rsk.co",
      deployParameters: {
        coreParams: {
          protThrld: PCT_BASE.mul(2), // 2
          liqThrld: PCT_BASE.mul(104).div(100), // 1.04
          emaCalculationBlockSpan: DAY_BLOCK_SPAN,
          successFee: PCT_BASE.mul(10).div(100), // 10%
          appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
          tcInterestRate: PCT_BASE.mul(5).div(100000), // 0.005% : weekly 0.0025 / 365 * 7
          tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
          decayBlockSpan: DAY_BLOCK_SPAN,
        },
        settlementParams: {
          bes: MONTH_BLOCK_SPAN,
        },
        feeParams: {
          feeRetainer: PCT_BASE.mul(0), // 0%
          mintFee: PCT_BASE.mul(5).div(100), // 5%
          redeemFee: PCT_BASE.mul(5).div(100), // 5%
          swapTPforTPFee: PCT_BASE.mul(1).div(100), // 1%
          swapTPforTCFee: PCT_BASE.mul(1).div(100), // 1%
          swapTCforTPFee: PCT_BASE.mul(1).div(100), // 1%
          redeemTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
          mintTCandTPFee: PCT_BASE.mul(8).div(100), // 8%
          feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
        },
        mocAddresses: {
          governorAddress: "0x26a00af444928d689dDEc7B4D17C0e4A8c9D407A", // if not provided a new GovernorMock.sol is deployed
          collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
          collateralTokenAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE", // if not provided a new MocTC.sol is deployed
          pauserAddress: "0x26a00aF444928D689DDec7B4D17C0e4a8c9d407b", // if not provided is set to deployer
          feeTokenAddress: "0x26a00AF444928d689DDeC7b4d17c0e4A8c9D4060",
          feeTokenPriceProviderAddress: "0x26A00AF444928d689ddec7b4d17c0E4A8C9D4061",
          mocFeeFlowAddress: "0x26a00aF444928d689DDEC7b4D17c0E4a8c9D407d",
          mocAppreciationBeneficiaryAddress: "0x26A00aF444928D689ddEC7B4D17C0E4A8C9d407F",
          vendorsGuardianAddress: "0x26a00AF444928D689DDeC7b4D17c0E4a8C9d407E",
          tcInterestCollectorAddress: "0x27a00Af444928D689DDec7B4D17c0E4a8c9d407F",
          maxAbsoluteOpProviderAddress: "", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
          maxOpDiffProviderAddress: "", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
        },
        queueParams: {
          minOperWaitingBlk: 5,
          maxOperPerBatch: 65,
          execFeeParams: {
            tcMintExecFee: BigNumber.from("100"),
            tcRedeemExecFee: BigNumber.from("100"),
            tpMintExecFee: BigNumber.from("100"),
            tpRedeemExecFee: BigNumber.from("100"),
            mintTCandTPExecFee: BigNumber.from("100"),
            redeemTCandTPExecFee: BigNumber.from("100"),
            swapTPforTPExecFee: BigNumber.from("100"),
            swapTPforTCExecFee: BigNumber.from("100"),
            swapTCforTPExecFee: BigNumber.from("100"),
          },
        },
        gasLimit: 6800000,
      },
      mocV1Address: "0x4512f4C1d984bbf8B7f7404EddFb1881cFA79EfD",
      tags: ["testnet", "migration"],
    },
    rskTestnet: {
      accounts: process.env.PK ? [`0x${process.env.PK}`] : { mnemonic },
      chainId: chainIds.rskTestnet,
      url: "https://public-node.testnet.rsk.co",
      deployParameters: {
        coreParams: {
          protThrld: PCT_BASE.mul(15).div(10), // 1.5
          liqThrld: PCT_BASE.mul(104).div(100), // 1.04
          emaCalculationBlockSpan: DAY_BLOCK_SPAN,
          successFee: PCT_BASE.mul(10).div(100), // 10%
          appreciationFactor: PCT_BASE.mul(50).div(100), // 50%
          tcInterestRate: PCT_BASE.mul(5).div(100000), // 0.005% : weekly 0.0025 / 365 * 7
          tcInterestPaymentBlockSpan: WEEK_BLOCK_SPAN,
          decayBlockSpan: DAY_BLOCK_SPAN,
        },
        settlementParams: {
          bes: MONTH_BLOCK_SPAN,
        },
        feeParams: {
          feeRetainer: PCT_BASE.div(10), // 10%
          mintFee: PCT_BASE.div(1000), // 0.1%
          redeemFee: PCT_BASE.div(1000), // 0.1%
          swapTPforTPFee: PCT_BASE.div(1000), // 0.1%
          swapTPforTCFee: PCT_BASE.div(1000), // 0.1%
          swapTCforTPFee: PCT_BASE.div(1000), // 0.1%
          redeemTCandTPFee: PCT_BASE.mul(8).div(10000), // 0.08%
          mintTCandTPFee: PCT_BASE.mul(8).div(10000), // 0.08%
          feeTokenPct: PCT_BASE.mul(5).div(10), // 50%
        },
        ctParams: {
          name: "RIFPROv2",
          symbol: "RIFPv2",
        },
        tpParams: {
          tpParams: [
            {
              name: "USDRv2",
              symbol: "USDRv2",
              priceProvider: "0x9d4b2c05818A0086e641437fcb64ab6098c7BbEc".toLowerCase(),
              ctarg: PCT_BASE.mul(55).div(10), // 5.5
              mintFee: PCT_BASE.div(100), // 1%
              redeemFee: PCT_BASE.div(100), // 1%
              initialEma: PCT_BASE.mul(6790).div(100000), //0.06790
              smoothingFactor: PCT_BASE.mul(1104).div(100000), // 0.01104
            },
          ],
        },
        mocAddresses: {
          governorAddress: "", // if not provided a new GovernorMock.sol is deployed
          collateralAssetAddress: "0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE",
          collateralTokenAddress: "", // if not provided a new MocTC.sol is deployed
          pauserAddress: "", // if not provided is set to deployer
          feeTokenAddress: "0x45a97b54021a3F99827641AFe1BFAE574431e6ab",
          feeTokenPriceProviderAddress: "0x8DCE78BbD4D757EF7777Be113277cf5A35283b1E",
          mocFeeFlowAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
          mocAppreciationBeneficiaryAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
          vendorsGuardianAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
          tcInterestCollectorAddress: "0xcd8a1c9acc980ae031456573e34dc05cd7dae6e3",
          maxAbsoluteOpProviderAddress: "", // if not provided a new FCMaxAbsoluteOpProvider.sol will be deployed with pauser as owner
          maxOpDiffProviderAddress: "", // if not provided a new FCMaxOpDifferenceProvider.sol will be deployed with pauser as owner
        },
        queueParams: {
          minOperWaitingBlk: 5,
          maxOperPerBatch: 65,
          execFeeParams: {
            tcMintExecFee: BigNumber.from("100"),
            tcRedeemExecFee: BigNumber.from("100"),
            tpMintExecFee: BigNumber.from("100"),
            tpRedeemExecFee: BigNumber.from("100"),
            mintTCandTPExecFee: BigNumber.from("100"),
            redeemTCandTPExecFee: BigNumber.from("100"),
            swapTPforTPExecFee: BigNumber.from("100"),
            swapTPforTCExecFee: BigNumber.from("100"),
            swapTCforTPExecFee: BigNumber.from("100"),
          },
        },
        gasLimit: 6800000,
      },
      tags: ["testnet"],
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
