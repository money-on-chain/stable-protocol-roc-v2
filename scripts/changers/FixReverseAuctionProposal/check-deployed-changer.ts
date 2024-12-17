import hre, { ethers } from "hardhat";
import { FixReverseAuctionProposal__factory } from "../../../typechain";
import { getNetworkChangerParams } from "../../../config/changers/fixReverseAuctionProposal-params";

async function main() {
  // Our code will go here
  console.log("Running script");

  const { deployments } = hre;
  const signer = ethers.provider.getSigner();

  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");

  const fixReverseAuctionProposal = await deployments.getOrNull("FixReverseAuctionProposal");
  if (!fixReverseAuctionProposal) throw new Error("No Changer deployed.");

  const contractInfo = {};
  console.log("Reading contracts deployed ...");
  console.log("");

  const changer = FixReverseAuctionProposal__factory.connect(fixReverseAuctionProposal.address, signer);

  console.log("FixReverseAuctionProposal__factory contract: ", changer.address);
  console.log("===========================");
  console.log("");
  contractInfo.FixReverseAuctionProposal = {};
  contractInfo.FixReverseAuctionProposal.rocCoreProxy = await changer.rocCoreProxy();
  console.log("rocCoreProxy: ", contractInfo.FixReverseAuctionProposal.rocCoreProxy);
  contractInfo.FixReverseAuctionProposal.mocMocStateProxy = await changer.mocMocStateProxy();
  console.log("mocMocStateProxy: ", contractInfo.FixReverseAuctionProposal.mocMocStateProxy);
  contractInfo.FixReverseAuctionProposal.upgradeDelegator = await changer.upgradeDelegator();
  console.log("upgradeDelegator: ", contractInfo.FixReverseAuctionProposal.upgradeDelegator);
  contractInfo.FixReverseAuctionProposal.mocFeeTokenPriceProvider = await changer.mocFeeTokenPriceProvider();
  console.log("mocFeeTokenPriceProvider: ", contractInfo.FixReverseAuctionProposal.mocFeeTokenPriceProvider);
  contractInfo.FixReverseAuctionProposal.rocFeeTokenPriceProvider = await changer.rocFeeTokenPriceProvider();
  console.log("rocFeeTokenPriceProvider: ", contractInfo.FixReverseAuctionProposal.rocFeeTokenPriceProvider);
  contractInfo.FixReverseAuctionProposal.revAucBTC2MOCProxy = await changer.revAucBTC2MOCProxy();
  console.log("revAucBTC2MOCProxy: ", contractInfo.FixReverseAuctionProposal.revAucBTC2MOCProxy);
  contractInfo.FixReverseAuctionProposal.revAucBTC2MOCNewImplement = await changer.revAucBTC2MOCNewImplement();
  console.log("revAucBTC2MOCNewImplement: ", contractInfo.FixReverseAuctionProposal.revAucBTC2MOCNewImplement);
  contractInfo.FixReverseAuctionProposal.mocCommissionSplitterV2 = await changer.mocCommissionSplitterV2();
  console.log("mocCommissionSplitterV2: ", contractInfo.FixReverseAuctionProposal.mocCommissionSplitterV2);
  contractInfo.FixReverseAuctionProposal.rocCommissionSplitterV2 = await changer.rocCommissionSplitterV2();
  console.log("rocCommissionSplitterV2: ", contractInfo.FixReverseAuctionProposal.rocCommissionSplitterV2);
  contractInfo.FixReverseAuctionProposal.mocFeeTokenAddressRecipient2 = await changer.mocFeeTokenAddressRecipient2();
  console.log("mocFeeTokenAddressRecipient2: ", contractInfo.FixReverseAuctionProposal.mocFeeTokenAddressRecipient2);
  contractInfo.FixReverseAuctionProposal.rocFeeTokenAddressRecipient2 = await changer.rocFeeTokenAddressRecipient2();
  console.log("rocFeeTokenAddressRecipient2: ", contractInfo.FixReverseAuctionProposal.rocFeeTokenAddressRecipient2);
  contractInfo.FixReverseAuctionProposal.revAuctionRIF2BTC = await changer.revAuctionRIF2BTC();
  console.log("revAuctionRIF2BTC: ", contractInfo.FixReverseAuctionProposal.revAuctionRIF2BTC);
  contractInfo.FixReverseAuctionProposal.revAuctionBTC2RIF = await changer.revAuctionBTC2RIF();
  console.log("revAuctionBTC2RIF: ", contractInfo.FixReverseAuctionProposal.revAuctionBTC2RIF);
  contractInfo.FixReverseAuctionProposal.revAuctionFee = await changer.revAuctionFee();
  console.log("revAuctionFee: ", contractInfo.FixReverseAuctionProposal.revAuctionFee);
  console.log("");
  console.log("");
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
