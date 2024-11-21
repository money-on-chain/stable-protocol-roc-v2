import {
  MocCARC20,
  MocCARC20__factory,
  FlowChangeProposal,
  FlowChangeProposal__factory,
  CommissionSplitter,
  CommissionSplitter__factory
} from "../typechain";
import { getNetworkChangerParams } from "../config/changers/flowChangeProposal-params";

import hre from "hardhat";

async function main() {
  // Our code will go here
  console.log("Running script");

  const { deployments, getNamedAccounts } = hre;
  const signer = ethers.provider.getSigner();

  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");

  const mocQueueImp = await deployments.getOrNull("MocQueue");
  if (!mocQueueImp) throw new Error("No mocQueueImp deployed.");

  const feesSplitterProxy = await deployments.getOrNull("FeesSplitterProxy");
  if (!feesSplitterProxy) throw new Error("No FeesSplitter deployed.");

  const tcInterestSplitterProxy = await deployments.getOrNull("TCInterestSplitterProxy");
  if (!tcInterestSplitterProxy) throw new Error("No tcInterestSplitterProxy deployed.");

  const flowChangeProposal = await deployments.getOrNull("FlowChangeProposal");
  if (!flowChangeProposal) throw new Error("No Changer deployed.");

  const contractInfo = {};
  console.log('Reading contracts deployed ...');
  console.log('')

  const changer = FlowChangeProposal__factory.connect(flowChangeProposal.address, signer);
  const feesSplitter = CommissionSplitter__factory.connect(feesSplitterProxy.address, signer);
  const tcInterestSplitter = CommissionSplitter__factory.connect(tcInterestSplitterProxy.address, signer);
  const mocCore = MocCARC20__factory.connect(changerParams.changer.mocCoreProxyAddress, signer);


  console.log('FlowChangeProposal contract: ', changer.address);
  console.log('===========================');
  console.log('')
  contractInfo.FlowChangeProposal = {}
  contractInfo.FlowChangeProposal.mocCoreProxy = await changer.mocCoreProxy();
  console.log('mocCoreProxy: ', contractInfo.FlowChangeProposal.mocCoreProxy);
  contractInfo.FlowChangeProposal.mocQueueProxy = await changer.mocQueueProxy();
  console.log('mocQueueProxy: ', contractInfo.FlowChangeProposal.mocQueueProxy);
  contractInfo.FlowChangeProposal.newMocQueueImpl = await changer.newMocQueueImpl();
  console.log('newMocQueueImpl: ', contractInfo.FlowChangeProposal.newMocQueueImpl);
  contractInfo.FlowChangeProposal.feeTokenPriceProvider = await changer.feeTokenPriceProvider();
  console.log('feeTokenPriceProvider: ', contractInfo.FlowChangeProposal.feeTokenPriceProvider);
  contractInfo.FlowChangeProposal.feesSplitterProxy = await changer.feesSplitterProxy();
  console.log('feesSplitterProxy: ', contractInfo.FlowChangeProposal.feesSplitterProxy);
  contractInfo.FlowChangeProposal.tcInterestsSplitterProxy = await changer.tcInterestsSplitterProxy();
  console.log('tcInterestsSplitterProxy: ', contractInfo.FlowChangeProposal.tcInterestsSplitterProxy);
  contractInfo.FlowChangeProposal.tcInterestPaymentBlockSpan = await changer.tcInterestPaymentBlockSpan();
  console.log('tcInterestPaymentBlockSpan: ', contractInfo.FlowChangeProposal.tcInterestPaymentBlockSpan.toString());
  contractInfo.FlowChangeProposal.settlementBlockSpan = await changer.settlementBlockSpan();
  console.log('settlementBlockSpan: ', contractInfo.FlowChangeProposal.settlementBlockSpan.toString());
  contractInfo.FlowChangeProposal.decayBlockSpan = await changer.decayBlockSpan();
  console.log('decayBlockSpan: ', contractInfo.FlowChangeProposal.decayBlockSpan.toString());
  contractInfo.FlowChangeProposal.emaCalculationBlockSpan = await changer.emaCalculationBlockSpan();
  console.log('emaCalculationBlockSpan: ', contractInfo.FlowChangeProposal.emaCalculationBlockSpan.toString());
  console.log('')
  console.log('')
  console.log('feesSplitter contract: ', feesSplitter.address);
  console.log('=====================');
  console.log('')
  contractInfo.feesSplitter = {}
  contractInfo.feesSplitter.acToken = await feesSplitter.acToken();
  console.log('acToken: ', contractInfo.feesSplitter.acToken);
  contractInfo.feesSplitter.feeToken = await feesSplitter.feeToken();
  console.log('feeToken: ', contractInfo.feesSplitter.feeToken);
  contractInfo.feesSplitter.acTokenAddressRecipient1 = await feesSplitter.acTokenAddressRecipient1();
  console.log('acTokenAddressRecipient1: ', contractInfo.feesSplitter.acTokenAddressRecipient1);
  contractInfo.feesSplitter.acTokenAddressRecipient2 = await feesSplitter.acTokenAddressRecipient2();
  console.log('acTokenAddressRecipient2: ', contractInfo.feesSplitter.acTokenAddressRecipient2);
  contractInfo.feesSplitter.acTokenPctToRecipient1 = await feesSplitter.acTokenPctToRecipient1();
  console.log('acTokenPctToRecipient1: ', contractInfo.feesSplitter.acTokenPctToRecipient1.toString());
  contractInfo.feesSplitter.feeTokenAddressRecipient1 = await feesSplitter.feeTokenAddressRecipient1();
  console.log('feeTokenAddressRecipient1: ', contractInfo.feesSplitter.feeTokenAddressRecipient1);
  contractInfo.feesSplitter.feeTokenAddressRecipient2 = await feesSplitter.feeTokenAddressRecipient2();
  console.log('feeTokenAddressRecipient2: ', contractInfo.feesSplitter.feeTokenAddressRecipient2);
  contractInfo.feesSplitter.feeTokenPctToRecipient1 = await feesSplitter.feeTokenPctToRecipient1();
  console.log('feeTokenPctToRecipient1: ', contractInfo.feesSplitter.feeTokenPctToRecipient1.toString());
  console.log('');
  console.log('tcInterestSplitter contract: ', tcInterestSplitter.address);
  console.log('=====================');
  console.log('')
  contractInfo.tcInterestSplitter = {}
  contractInfo.tcInterestSplitter.acToken = await tcInterestSplitter.acToken();
  console.log('acToken: ', contractInfo.tcInterestSplitter.acToken);
  contractInfo.tcInterestSplitter.feeToken = await tcInterestSplitter.feeToken();
  console.log('feeToken: ', contractInfo.tcInterestSplitter.feeToken);
  contractInfo.tcInterestSplitter.acTokenAddressRecipient1 = await tcInterestSplitter.acTokenAddressRecipient1();
  console.log('acTokenAddressRecipient1: ', contractInfo.tcInterestSplitter.acTokenAddressRecipient1);
  contractInfo.tcInterestSplitter.acTokenAddressRecipient2 = await tcInterestSplitter.acTokenAddressRecipient2();
  console.log('acTokenAddressRecipient2: ', contractInfo.tcInterestSplitter.acTokenAddressRecipient2);
  contractInfo.tcInterestSplitter.acTokenPctToRecipient1 = await tcInterestSplitter.acTokenPctToRecipient1();
  console.log('acTokenPctToRecipient1: ', contractInfo.tcInterestSplitter.acTokenPctToRecipient1.toString());
  contractInfo.tcInterestSplitter.feeTokenAddressRecipient1 = await tcInterestSplitter.feeTokenAddressRecipient1();
  console.log('feeTokenAddressRecipient1: ', contractInfo.tcInterestSplitter.feeTokenAddressRecipient1);
  contractInfo.tcInterestSplitter.feeTokenAddressRecipient2 = await tcInterestSplitter.feeTokenAddressRecipient2();
  console.log('feeTokenAddressRecipient2: ', contractInfo.tcInterestSplitter.feeTokenAddressRecipient2);
  contractInfo.tcInterestSplitter.feeTokenPctToRecipient1 = await tcInterestSplitter.feeTokenPctToRecipient1();
  console.log('feeTokenPctToRecipient1: ', contractInfo.tcInterestSplitter.feeTokenPctToRecipient1.toString());
  console.log('');
  console.log('')
  console.log('MocCARC20 contract:', mocCore.address);
  console.log('==================');
  console.log('')
  contractInfo.mocCore = {}
  contractInfo.mocCore.mocFeeFlowAddress = await mocCore.mocFeeFlowAddress();
  console.log('1. mocFeeFlowAddress: ', contractInfo.mocCore.mocFeeFlowAddress);
  if (
      contractInfo.mocCore.mocFeeFlowAddress.toLowerCase() !==
      feesSplitter.address.toLowerCase()
    )
  {
    console.log('--> ERROR!: Need to be iqual to feesSplitter address');
  } else {
    console.log('--> OK');
  }
  contractInfo.mocCore.tcInterestCollectorAddress = await mocCore.tcInterestCollectorAddress();
  console.log('2. tcInterestCollectorAddress: ', contractInfo.mocCore.tcInterestCollectorAddress);
  if (
      contractInfo.mocCore.tcInterestCollectorAddress.toLowerCase() !==
      tcInterestSplitter.address.toLowerCase()
    )
  {
    console.log('--> ERROR!: Need to be iqual to tcInterestSplitter address');
  } else {
    console.log('--> OK');
  }
  contractInfo.mocCore.feeTokenPriceProvider = await mocCore.feeTokenPriceProvider();
  console.log('3. feeTokenPriceProvider: ', contractInfo.mocCore.feeTokenPriceProvider);
  if (
      contractInfo.mocCore.feeTokenPriceProvider.toLowerCase() !==
      contractInfo.FlowChangeProposal.feeTokenPriceProvider.toLowerCase()
    )
  {
    console.log('--> ERROR!: No the same as the changer!');
  } else {
    console.log('--> OK');
  }
  contractInfo.mocCore.tcInterestPaymentBlockSpan = await mocCore.tcInterestPaymentBlockSpan();
  console.log('4. tcInterestPaymentBlockSpan: ', contractInfo.mocCore.tcInterestPaymentBlockSpan.toString());
  if (
      contractInfo.mocCore.tcInterestPaymentBlockSpan.toString() !==
      contractInfo.FlowChangeProposal.tcInterestPaymentBlockSpan.toString()
    )
  {
    console.log('--> ERROR!: No the same as the changer!');
  } else {
    console.log('--> OK');
  }
  contractInfo.mocCore.bes = await mocCore.bes();
  console.log('5. bes: ', contractInfo.mocCore.bes.toString());
  if (
      contractInfo.mocCore.bes.toString() !==
      contractInfo.FlowChangeProposal.settlementBlockSpan.toString()
    )
  {
    console.log('--> ERROR!: No the same as the changer!');
  } else {
    console.log('--> OK');
  }
  contractInfo.mocCore.decayBlockSpan = await mocCore.decayBlockSpan();
  console.log('6. decayBlockSpan: ', contractInfo.mocCore.decayBlockSpan.toString());
  if (
      contractInfo.mocCore.decayBlockSpan.toString() !==
      contractInfo.FlowChangeProposal.decayBlockSpan.toString()
    )
  {
    console.log('--> ERROR!: No the same as the changer!');
  } else {
    console.log('--> OK');
  }
  contractInfo.mocCore.emaCalculationBlockSpan = await mocCore.emaCalculationBlockSpan();
  console.log('7. emaCalculationBlockSpan: ', contractInfo.mocCore.emaCalculationBlockSpan.toString());
  if (
      contractInfo.mocCore.emaCalculationBlockSpan.toString() !==
      contractInfo.FlowChangeProposal.emaCalculationBlockSpan.toString()
    )
  {
    console.log('--> ERROR!: No the same as the changer!');
  } else {
    console.log('--> OK');
  }
  console.log('')

}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
