# How to deploy and execute migration from V1 protocol

Go to the [RDOC-Contract-Internal repository](https://github.com/money-on-chain/RDOC-Contract), look at RDOC-Contract/scripts/deploy/upgrade_v0.2.0/V2Migration.md to follow the upgrade process

`V2MigrationChanger.sol` is the changer that will execute the migration on V1 contracts. In that process, it will check that some parameters are the same in the new V2 contract, otherwise the transaction will revert.
To prevent this, you can set MoCV1 address in `hardhat.base.config.ts` and before deploying the script will dynamically fetch all the parameters from it and overwrite them.

in [hardhat.base.config.ts](hardhat.base.config.ts):

```json
network: {
deployParameters: {
      ....
      },
      mocV1Address: "0x24a1a1......5050EE1",
      },
    },
```

You can see the parameters fetch detail in [fetchNetworkDeployParams](scripts/utils.ts) function.
