# ROC V2 protocol

ROC is an implementation of the Money On Chain V2 main protocol that uses RIF Token as collateral of the system.
For more information, please refer to the [documentation section](https://github.com/money-on-chain/main-sc-protocol/blob/master/docs/README.md) for the _Moc CA RC20_ variation.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
# Install proper node version
nvm use
```

Create `.env` file (you can base on [`.env.example`](./.env.example))

### Installing

A step by step series of examples that tell you how to get a development env running

Say what the step will be

```bash
# Install the dependencies
npm install
```

### Generate Types

In order to get contract types

```bash
npm run typechain
```

## Deployment

This solution has a fully functional deploy mechanism following [hardhat deploy](https://github.com/wighawag/hardhat-deploy) standard.
It imports smart contracts and deploy scripts from [MoC-main-sc](https://github.com/money-on-chain/main-sc-protocol) repository and uses them to deploy the RC20 Collateralized Asset version, with custom networks configurations. To add networks for deployment or set new deploy parameters see [hardhat.base.config.ts](hardhat.base.config.ts).

You can configure a network as `testnet` using [tags](https://github.com/wighawag/hardhat-deploy#tags) mechanism, that will allow you to:

1. deploy and initialize the protocol using a governor mocked to skip governance system
2. initialize the protocol with Pegged Tokens
3. transfer governance to the real governor

Otherwise, you can set it as `mainnet` and will be initialized with the real governor. In that way, you must add Pegged Tokens using the governance system. See more in [Areopagus-Governance](https://github.com/money-on-chain/Areopagus-Governance)

For the deployer account, you can either set you mnemonic in the `.env` file, or if you want to use the hashed Private Key directly, set the `PK` environment variable (without `0x` prefix).

### Deploy scripts

There are mainly to ways to deploy the system, from scratch using a full configuration file, or migrating it from v1. For that, there are two different set of deploy scripts and commands.

To deploy contracts in rsk testnet

```bash
npm run deploy-rskTestnet
```

To migrate contracts in rsk testnet from a V1 instance

```bash
npm run deploy-rskTestnet-migration
```

A deployments folder will be created with a sub folder for each network. There you will find a json file for each contract deployed that includes the address and ABI.

Keep in mind that all the contracts are upgradeable using [UUPS](https://eips.ethereum.org/EIPS/eip-1822) proxy pattern, so to interact with them you must use the contract implementation ABI but calling the contract proxy address.

## Built With

* [Hardhat](https://hardhat.org/) - Task runner

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## Versioning

We use [SemVer](http://semver.org/) and [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

To create a new release execute the script

`npm run release`

## License

See the [LICENSE](./LICENSE) file for details
