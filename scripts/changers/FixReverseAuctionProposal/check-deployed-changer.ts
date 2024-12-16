import {
  FixReverseAuctionProposal,
  FixReverseAuctionProposal__factory
} from "../../../typechain";
import { getNetworkChangerParams } from "../../../config/changers/fixReverseAuctionProposal-params";

import hre from "hardhat";

async function main() {
  // Our code will go here
  console.log("Running script");

  const { deployments, getNamedAccounts } = hre;
  const signer = ethers.provider.getSigner();

  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");

  const fixReverseAuctionProposal = await deployments.getOrNull("FixReverseAuctionProposal");
  if (!fixReverseAuctionProposal) throw new Error("No Changer deployed.");

  const contractInfo = {};
  console.log('Reading contracts deployed ...');
  console.log('')

  const changer = FixReverseAuctionProposal__factory.connect(fixReverseAuctionProposal.address, signer);

  console.log('FixReverseAuctionProposal__factory contract: ', changer.address);
  console.log('===========================');
  console.log('')
  contractInfo.FixReverseAuctionProposal = {}
  contractInfo.FixReverseAuctionProposal.rocCoreProxy = await changer.rocCoreProxy();
  console.log('rocCoreProxy: ', contractInfo.FixReverseAuctionProposal.rocCoreProxy);
  contractInfo.FixReverseAuctionProposal.mocMocStateProxy = await changer.mocMocStateProxy();
  console.log('mocMocStateProxy: ', contractInfo.FixReverseAuctionProposal.mocMocStateProxy);
  contractInfo.FixReverseAuctionProposal.upgradeDelegator = await changer.upgradeDelegator();
  console.log('upgradeDelegator: ', contractInfo.FixReverseAuctionProposal.upgradeDelegator);
  contractInfo.FixReverseAuctionProposal.mocFeeTokenPriceProvider = await changer.mocFeeTokenPriceProvider();
  console.log('mocFeeTokenPriceProvider: ', contractInfo.FixReverseAuctionProposal.mocFeeTokenPriceProvider);
  contractInfo.FixReverseAuctionProposal.rocFeeTokenPriceProvider = await changer.rocFeeTokenPriceProvider();
  console.log('rocFeeTokenPriceProvider: ', contractInfo.FixReverseAuctionProposal.rocFeeTokenPriceProvider);
  contractInfo.FixReverseAuctionProposal.revAucBTC2MOCProxy = await changer.revAucBTC2MOCProxy();
  console.log('revAucBTC2MOCProxy: ', contractInfo.FixReverseAuctionProposal.revAucBTC2MOCProxy);
  contractInfo.FixReverseAuctionProposal.revAucBTC2MOCNewImplement = await changer.revAucBTC2MOCNewImplement();
  console.log('revAucBTC2MOCNewImplement: ', contractInfo.FixReverseAuctionProposal.revAucBTC2MOCNewImplement);

  console.log('')
  console.log('')

}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
