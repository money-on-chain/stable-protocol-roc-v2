import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { getNetworkChangerParams } from "../../../config/changers/commissionSplitterQueue-params";
import { ICurrentCommissionSplitter__factory, MocCARC20__factory } from "../../../typechain";

export const fetchNetworkDeployParams = async (hre: HardhatRuntimeEnvironment) => {
  const changerParams = getNetworkChangerParams(hre);
  if (!changerParams) throw new Error("No deploy params config found.");
  const {
    changer,
  } = changerParams;

  const signer = ethers.provider.getSigner();

  const mocProxy = MocCARC20__factory.connect(changer.mocCoreProxyAddress, signer);
  const commissionSplitterV2Proxy = ICurrentCommissionSplitter__factory.connect(
    await mocProxy.mocFeeFlowAddress(),
    signer,
  );
  const commissionSplitterV3Proxy = ICurrentCommissionSplitter__factory.connect(
    await mocProxy.tcInterestCollectorAddress(),
    signer,
  );

  const [governorAddress, acTokenAddress, feeTokenAddress, ...restPromises] = await Promise.all([
    mocProxy.governor(),
    mocProxy.acToken(),
    mocProxy.feeToken(),
    commissionSplitterV2Proxy.outputAddress_2(),
    commissionSplitterV2Proxy.outputAddress_3(),
    commissionSplitterV2Proxy.outputTokenGovernAddress_1(),
    commissionSplitterV2Proxy.outputTokenGovernAddress_2(),
    commissionSplitterV2Proxy.outputProportionTokenGovern_1(),
    commissionSplitterV3Proxy.outputAddress_1(),
    commissionSplitterV3Proxy.outputAddress_2(),
    commissionSplitterV3Proxy.outputProportion_1(),
  ]);

  return {
    governorAddress,
    acTokenAddress,
    feeTokenAddress,
    feesSplitterParams: {
      acTokenAddressRecipient1: restPromises[0],
      acTokenAddressRecipient2: restPromises[1],
      feeTokenAddressRecipient1: restPromises[2],
      feeTokenAddressRecipient2: restPromises[3],
      feeTokenPctToRecipient1: restPromises[4],
    },
    tcInterestsSplitterParams: {
      acTokenAddressRecipient1: restPromises[5],
      acTokenAddressRecipient2: restPromises[6],
      acTokenPctToRecipient1: restPromises[7],
    },
  };
};
