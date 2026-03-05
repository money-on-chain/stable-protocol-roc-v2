import type {
  IgnitionModuleBuilder,
  ContractFuture,
  ModuleParameterRuntimeValue,
} from "@nomicfoundation/ignition-core";
import { getPrefixedParameterName } from "./parameterPrefixes";

const FULL_PERCENT = 1000000000000000000n;

// Type aliases for parameters
type StringParam = string | ModuleParameterRuntimeValue<string>;
type BigintParam = bigint | ModuleParameterRuntimeValue<bigint>;
// AddressOrFuture can be: a literal string, a ContractFuture from another deployment, or a ModuleParameterRuntimeValue
type AddressOrFuture = string | ContractFuture<string> | ModuleParameterRuntimeValue<string>;

/**
 * Parameters for deploying FeeFlow
 * Swapper addresses can be either literal strings or ContractFutures from MocSwappers deployment
 */
export interface FeeFlowParams {
  governorAddress: StringParam;
  docTokenAddress: StringParam;
  mocTokenAddress: StringParam;
  // These can be ContractFutures from MocSwappers deployment
  swapperDOCMOCAddress: AddressOrFuture;
  mocRewards: StringParam;
  // Splitter parameters
  feeTokenAddressRecipient1: StringParam;
  feeTokenAddressRecipient2: StringParam;
  feesSplitterFeeTokenPct1: BigintParam;
  // ReverseAuction parameters
  docToMocOrderThreshold: BigintParam;
  docToMocSlippage: BigintParam;
  mocToDocPriceProvider: StringParam;
}

/**
 * Partial params for FeeFlow - swapper addresses provided separately (from another deployment)
 */
export type FeeFlowParamsWithoutSwappers = Omit<FeeFlowParams, "swapperDOCMOCAddress">;

/**
 * Helper to get FeeFlow parameters from module parameters (excluding swapper addresses)
 * @param m - The IgnitionModuleBuilder
 * @param parameterPrefix - Optional prefix for namespaced parameters (e.g., "FeeFlow" for Full module)
 */
export function getFeeFlowParams(m: IgnitionModuleBuilder, parameterPrefix?: string): FeeFlowParamsWithoutSwappers {
  const getParameter = <T extends string | bigint | boolean | string[] | bigint[]>(parameterName: string) =>
    m.getParameter<T>(getPrefixedParameterName(parameterName, parameterPrefix));

  return {
    governorAddress: getParameter<string>("governorAddress"),
    docTokenAddress: getParameter<string>("docTokenAddress"),
    mocTokenAddress: getParameter<string>("mocTokenAddress"),
    mocRewards: getParameter<string>("mocRewards"),
    feeTokenAddressRecipient1: getParameter<string>("feeTokenAddressRecipient1"),
    feeTokenAddressRecipient2: getParameter<string>("feeTokenAddressRecipient2"),
    feesSplitterFeeTokenPct1: getParameter<bigint>("feesSplitterFeeTokenPct1"),
    docToMocOrderThreshold: getParameter<bigint>("docToMocOrderThreshold"),
    docToMocSlippage: getParameter<bigint>("docToMocSlippage"),
    mocToDocPriceProvider: getParameter<string>("mocToDocPriceProvider"),
  };
}

/**
 * Deploy FeeFlow infrastructure with the given parameters
 * This function can be called from the standalone module or from FullMultiCollateralUpgrade
 */
export function deployFeeFlow(m: IgnitionModuleBuilder, params: FeeFlowParams, idPrefix: string = "") {
  const prefix = idPrefix ? `${idPrefix}_` : "";

  // Deploy PriceProviderDummy for DOC pegged token, initialized at 1e18
  const docToMocPriceProvider = m.contract("PriceProviderInverse", [params.mocToDocPriceProvider], {
    id: `${prefix}DocToMocPriceProvider`,
  });

  // Deploy ReverseAuctions (splitters need their addresses)
  const reverseAuctionDOCtoMOC = m.contract(
    "MocReverseAuction",
    [
      params.governorAddress,
      params.swapperDOCMOCAddress,
      params.docTokenAddress,
      params.mocTokenAddress,
      params.mocRewards, // MOC rewards recipient
      params.docToMocOrderThreshold,
      docToMocPriceProvider,
      params.docToMocSlippage,
    ],
    { id: `${prefix}ReverseAuctionDOCtoMOC` },
  );

  // Deploy CommissionSplitterRC20 for FeesSplitter
  const feesSplitterImpl = m.contract("CommissionSplitterRC20", [], {
    id: `${prefix}FeesSplitterImplementation`,
  });

  const feesSplitterInitData = m.encodeFunctionCall(feesSplitterImpl, "initialize", [
    params.docTokenAddress, // acToken (DOC)
    params.governorAddress,
    params.mocTokenAddress, // feeToken (MOC)
    reverseAuctionDOCtoMOC, // acTokenAddressRecipient1_ (DOC -> MOC auction)
    reverseAuctionDOCtoMOC, // acTokenAddressRecipient2_ (same recipient; zero-address would break 0-value transfer)
    FULL_PERCENT, // acTokenPctToRecipient1_ = 100%
    params.feeTokenAddressRecipient1,
    params.feeTokenAddressRecipient2,
    params.feesSplitterFeeTokenPct1, // feeTokenPctToRecipient1_
  ]);

  const feesSplitterProxy = m.contract("ERC1967Proxy", [feesSplitterImpl, feesSplitterInitData], {
    id: `${prefix}FeesSplitterProxy`,
  });

  return {
    feesSplitterImpl,
    feesSplitterProxy,
    reverseAuctionDOCtoMOC,
  };
}
