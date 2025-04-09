import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { ContractTransactionResponse } from "ethers";
import { Address } from "hardhat-deploy/types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

export type Balance = BigNumber;

export function pEth(eth: string | number): bigint {
  let ethStr: string;
  if (typeof eth === "number") ethStr = eth.toLocaleString("fullwide", { useGrouping: false }).replace(",", ".");
  else ethStr = eth;
  return ethers.parseEther(ethStr);
}

export enum OperType {
  none, // avoid using zero as Type
  mintTC,
  redeemTC,
  mintTP,
  redeemTP,
  mintTCandTP,
  redeemTCandTP,
  swapTCforTP,
  swapTPforTC,
  swapTPforTP,
}

export const getStatus = async (mocProxy: any) => {
  const [coverage, tcAvailable, tpAvailable] = await Promise.all([
    mocProxy.getCglb(),
    mocProxy.getTCAvailableToRedeem(),
    mocProxy.getTPAvailableToMint(await mocProxy.tpTokens(0)),
  ]);
  return {
    coverage,
    tcAvailable,
    tpAvailable,
  };
};

const filterRelevantOperationEvent = async (contracts: any, tx: ContractTransactionResponse, eventKey: string) => {
  return (await tx.wait())!.logs.reduce<any[][]>((accumulator: any[], log: any) => {
    if (log.address === contracts.mocQueue.target) {
      const parsedLog = contracts.mocQueue.interface.parseLog(log);
      if (parsedLog!.name === eventKey) {
        accumulator.push({ name: parsedLog!.name, ...parsedLog!.args });
      }
    }
    return accumulator;
  }, []);
};

export const mintTP =
  (contracts: any, executionCost: bigint) => async (qTP: number, from: Address, vendor: Address) => {
    const [acBalance, tpBalance] = await Promise.all([
      contracts.acToken.balanceOf(from),
      contracts.tpToken.balanceOf(from),
    ]);
    const fromSigner = await ethers.getSigner(from);
    await helpers.impersonateAccount(from);
    await contracts.acToken.connect(fromSigner).approve(contracts.bucket.target, pEth(qTP * 20));
    await contracts.bucket
      .connect(fromSigner)
      .mintTP(contracts.tpToken.target, pEth(qTP), pEth(qTP * 20), from, vendor, {
        value: executionCost,
      });
    await helpers.mine(await contracts.mocQueue.minOperWaitingBlk());
    const tx = await contracts.executor.execute(from);
    const events = await filterRelevantOperationEvent(contracts, tx, "TPMinted");
    return {
      ...(await getStatus(contracts.bucket)),
      acSpent: acBalance - (await contracts.acToken.balanceOf(from)),
      tpEarn: (await contracts.tpToken.balanceOf(from)) - tpBalance,
      events,
    };
  };

export const redeemTC =
  (contracts: any, executionCost: bigint) => async (qTC: number, from: Address, vendor: Address) => {
    const [acBalance, tcBalance] = await Promise.all([
      contracts.acToken.balanceOf(from),
      contracts.tcToken.balanceOf(from),
    ]);
    const fromSigner = await ethers.getSigner(from);
    await helpers.impersonateAccount(from);
    await contracts.tcToken.connect(fromSigner).approve(contracts.bucket.target, pEth(qTC * 20));
    await contracts.bucket.connect(fromSigner).redeemTC(pEth(qTC), 0, from, vendor, {
      value: executionCost,
    });
    await helpers.mine(await contracts.mocQueue.minOperWaitingBlk());
    const tx = await contracts.executor.execute(from);
    const events = await filterRelevantOperationEvent(contracts, tx, "TCRedeemed");
    return {
      ...(await getStatus(contracts.bucket)),
      acEarn: (await contracts.acToken.balanceOf(from)) - acBalance,
      tcSpent: tcBalance - (await contracts.tcToken.balanceOf(from)),
      events,
    };
  };

export const mintTCandTP =
  (contracts: any, executionCost: bigint) => async (qTP: number, from: Address, vendor: Address) => {
    const [acBalance, tcBalance, tpBalance] = await Promise.all([
      contracts.acToken.balanceOf(from),
      contracts.tcToken.balanceOf(from),
      contracts.tpToken.balanceOf(from),
    ]);
    const fromSigner = await ethers.getSigner(from);
    await helpers.impersonateAccount(from);
    await contracts.acToken.connect(fromSigner).approve(contracts.bucket.target, pEth(qTP * 100));
    await contracts.bucket
      .connect(fromSigner)
      .mintTCandTP(contracts.tpToken.target, pEth(qTP), pEth(qTP * 100), from, vendor, {
        value: executionCost,
      });
    await helpers.mine(await contracts.mocQueue.minOperWaitingBlk());
    const tx = await contracts.executor.execute(from);
    const events = await filterRelevantOperationEvent(contracts, tx, "TCandTPMinted");
    return {
      ...(await getStatus(contracts.bucket)),
      acSpent: acBalance - (await contracts.acToken.balanceOf(from)),
      tcEarn: (await contracts.tcToken.balanceOf(from)) - tcBalance,
      tpEarn: (await contracts.tpToken.balanceOf(from)) - tpBalance,
      events,
    };
  };
