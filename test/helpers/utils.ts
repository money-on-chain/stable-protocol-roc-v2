import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";

export type Balance = BigNumber;

export function pEth(eth: string | number): BigNumber {
  let ethStr: string;
  if (typeof eth === "number") ethStr = eth.toLocaleString("fullwide", { useGrouping: false }).replace(",", ".");
  else ethStr = eth;
  return ethers.utils.parseEther(ethStr);
}
