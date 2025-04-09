# Multicollateral upgrade

This process involves upgrading the ROC protocol from single collateral to multi-collateral

To support multi-collateral, it is necessary to create a new implementation and perform an upgrade on the following proxy contracts:

- [MocRif](https://github.com/money-on-chain/stable-protocol-core-v2/blob/master/contracts/collateral/rc20/MocCARC20.sol) : This is the core contract of the protocol. It needs to be modified to support multi-collateral.
- [USDRIF](../../contracts/token/USDRIF/StableTokenV2.sol) : The option to grant and revoke roles from governance has been added. This allows us to give new buckets the power to mint and burn tokens during the execution of the changer.

Additionally, other contracts currently used in the protocol must be migrated:

- [MocRifExpansion](https://github.com/money-on-chain/stable-protocol-core-v2/blob/master/contracts/core/MocCoreExpansion.sol) : For the same reason that MocRif needs to be upgraded, but in this case, since it is a stateless contract that is called from the core to execute functions via delegation, an upgrade is not needed. Instead, a new one is deployed and set in MocRif.
- [MocQueue](https://github.com/money-on-chain/stable-protocol-core-v2/blob/master/contracts/queue/MocQueue.sol): Due to modifications in the storage layout, it is simpler to deploy a new proxy and migrate to it rather than performing an upgrade.

**Attention!**

All operations queued in MocQueue before executing the changer will not be migrated. Therefore, it is desired to execute and clear the queue immediately beforehand. The changer will neither process the queue nor verify that it is empty to prevent potential DOS attacks. So in the event that any operation remains pending execution, it will be resolved in a subsequent changer.

To review the changes in detail, please refer to the following [pull request](https://github.com/money-on-chain/main-sc-protocol-v2/pull/375/files). // TODO: use link to the public repo

## New Protocol contracts

- [MocMultiCollateralGuard](https://github.com/money-on-chain/main-sc-protocol-v2/pull/375/files#diff-aabd37289f00dafc8505b0b332fa143d78f8f5590030859e0dbb215708f00900) : This contract serves as a new checkpoint that is linked to all buckets (onlyRIF for now) and will determine whether operations can be performed in the protocol based on the global state of the system. This determination is primarily made by calculating the current combined coverage and the target combined coverage. // TODO: use link to the public repo

## Changer contract

- [MultiCollateralUpgradeChanger](../../contracts/changers/multiCollateralUpgrade/MultiCollateralUpgradeChanger.sol)

## Step 1: Configuration params

Set the correct parameters on the configuration file [multiCollateralUpgrade_params.ts](./multiCollateralUpgrade_params.ts) for the needed network.

## Step 2: Deploy the contracts

### Prerequisites

What things you need to install the software and how to install them

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
# Install proper node version
nvm use
```

Create `.env` file (you can base on [`.env.example`](../../../.env.example))

### Installing

A step by step series of examples that tell you how to get a development env running

Say what the step will be

```bash
# Install the dependencies
npm install
```

### Generate Types

In order to get contract types you can generate those typings when compiling

```bash
npm run compile
```

### Deploy

```bash
npx hardhat deploy --tags MultiCollateralUpgradeChanger --network <targetNetwork>
```
