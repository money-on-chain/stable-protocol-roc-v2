import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Address } from "hardhat-deploy/types";

type ChangerParams = {
  mocCoreAddress: Address;
  rifPriceProvider: Address;
  blockSpan: bigint;
  queueParams: {
    minOperWaitingBlk: bigint;
    maxOperWaitingBlk: bigint;
    execCostParams: {
      tcMintExecCost: bigint;
      tcRedeemExecCost: bigint;
      tpMintExecCost: bigint;
      tpRedeemExecCost: bigint;
      mintTCandTPExecCost: bigint;
      redeemTCandTPExecCost: bigint;
      swapTPforTPExecCost: bigint;
      swapTPforTCExecCost: bigint;
      swapTCforTPExecCost: bigint;
    };
  };
  multiCollateralParams: {
    maxOperPerBatch: bigint;
    useMaxLastPublicationBlock: boolean;
    microLiquidationExecCost: bigint;
    liquidationExecCost: bigint;
  };
  gasLimit: number;
};

export const rskTestnetChangerParams: ChangerParams = {
  mocCoreAddress: "0xa416934264515bb381E3b746f10f22D5c6f9431a",
  rifPriceProvider: "",
  blockSpan: 24n,
  queueParams: {
    minOperWaitingBlk: 1n,
    maxOperWaitingBlk: 3n,
    execCostParams: {
      tcMintExecCost: 103000n,
      tcRedeemExecCost: 105000n,
      tpMintExecCost: 131500n,
      tpRedeemExecCost: 121500n,
      mintTCandTPExecCost: 165000n,
      redeemTCandTPExecCost: 174500n,
      swapTPforTPExecCost: 154000n,
      swapTPforTCExecCost: 140000n,
      swapTCforTPExecCost: 147500n,
    },
  },
  multiCollateralParams: {
    maxOperPerBatch: 10n,
    useMaxLastPublicationBlock: true,
    microLiquidationExecCost: 0n, // not used, only one bucket is defined
    liquidationExecCost: 0n, // not used, only one bucket is defined
  },
  gasLimit: 6800000,
};

export const rskMainnetChangerParams: ChangerParams = {
  mocCoreAddress: "0xA27024Ed70035E46dba712609fc2Afa1c97aA36A",
  rifPriceProvider: "",
  blockSpan: 24n,
  queueParams: {
    minOperWaitingBlk: 1n,
    maxOperWaitingBlk: 3n,
    execCostParams: {
      tcMintExecCost: 103000n,
      tcRedeemExecCost: 105000n,
      tpMintExecCost: 131500n,
      tpRedeemExecCost: 121500n,
      mintTCandTPExecCost: 165000n,
      redeemTCandTPExecCost: 174500n,
      swapTPforTPExecCost: 154000n,
      swapTPforTCExecCost: 140000n,
      swapTCforTPExecCost: 147500n,
    },
  },
  multiCollateralParams: {
    maxOperPerBatch: 10n,
    useMaxLastPublicationBlock: true,
    microLiquidationExecCost: 0n, // not used, only one bucket is defined
    liquidationExecCost: 0n, // not used, only one bucket is defined
  },
  gasLimit: 6800000,
};

export const deployChangerParamsr: Record<string, ChangerParams> = {
  hardhat: rskMainnetChangerParams,
  rskTestnet: rskTestnetChangerParams,
};

export const getNetworkChangerParams = (hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name === "localhost" ? "hardhat" : hre.network.name;
  return deployChangerParamsr[network];
};
