import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import {
  addPeggedTokensAndChangeGovernor,
  getNetworkDeployParams,
  waitForTxConfirmation,
} from "moc-main/export/scripts/utils";

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { coreParams, settlementParams, feeParams, tpParams, mocAddresses, gasLimit } = getNetworkDeployParams(hre);
  const signer = ethers.provider.getSigner();

  const deployedMocContract = await deployments.getOrNull("MocRifProxy");
  if (!deployedMocContract) throw new Error("No MocRifProxy deployed.");
  const mocCARC20 = await ethers.getContractAt("MocRif", deployedMocContract.address, signer);

  const deployedMocExpansionContract = await deployments.getOrNull("MocRifExpansion");
  if (!deployedMocExpansionContract) throw new Error("No MocRifExpansion deployed.");

  const deployedMocVendors = await deployments.getOrNull("MocVendorsRifProxy");
  if (!deployedMocVendors) throw new Error("No MocVendors deployed.");
  const MocVendors = await ethers.getContractAt("MocVendors", deployedMocVendors.address, signer);

  let {
    collateralAssetAddress,
    collateralTokenAddress,
    governorAddress,
    pauserAddress,
    feeTokenAddress,
    feeTokenPriceProviderAddress,
    mocFeeFlowAddress,
    mocAppreciationBeneficiaryAddress,
    vendorsGuardianAddress,
    tcInterestCollectorAddress,
  } = mocAddresses;

  // for tests and testnet we deploy a Governor Mock
  if (hre.network.tags.testnet || hre.network.tags.local) {
    const governorMockFactory = await deploy("GovernorMock", {
      from: deployer,
    });
    governorAddress = governorMockFactory.address;
  }

  console.log("initializing...");
  // initializations
  await waitForTxConfirmation(
    MocVendors.initialize(vendorsGuardianAddress, governorAddress, pauserAddress, {
      gasLimit,
    }),
  );
  await waitForTxConfirmation(
    mocCARC20.initialize(
      {
        initializeCoreParams: {
          initializeBaseBucketParams: {
            feeTokenAddress,
            feeTokenPriceProviderAddress,
            tcTokenAddress: collateralTokenAddress,
            mocFeeFlowAddress,
            mocAppreciationBeneficiaryAddress,
            protThrld: coreParams.protThrld,
            liqThrld: coreParams.liqThrld,
            feeRetainer: feeParams.feeRetainer,
            tcMintFee: feeParams.mintFee,
            tcRedeemFee: feeParams.redeemFee,
            swapTPforTPFee: feeParams.swapTPforTPFee,
            swapTPforTCFee: feeParams.swapTPforTCFee,
            swapTCforTPFee: feeParams.swapTCforTPFee,
            redeemTCandTPFee: feeParams.redeemTCandTPFee,
            mintTCandTPFee: feeParams.mintTCandTPFee,
            feeTokenPct: feeParams.feeTokenPct,
            successFee: coreParams.successFee,
            appreciationFactor: coreParams.appreciationFactor,
            bes: settlementParams.bes,
            tcInterestCollectorAddress,
            tcInterestRate: coreParams.tcInterestRate,
            tcInterestPaymentBlockSpan: coreParams.tcInterestPaymentBlockSpan,
          },
          governorAddress,
          pauserAddress: deployer,
          mocCoreExpansion: deployedMocExpansionContract.address,
          emaCalculationBlockSpan: coreParams.emaCalculationBlockSpan,
          mocVendors: MocVendors.address,
        },
        acTokenAddress: collateralAssetAddress!,
      },
      { gasLimit },
    ),
  );
  console.log("pausing MocRif until migration from V1 has been completed...");
  // pause
  await mocCARC20.pause();

  console.log("initialization completed!");
  // for testnet we add some Pegged Token and then transfer governance to the real governor
  if (hre.network.tags.testnet) {
    await addPeggedTokensAndChangeGovernor(hre, mocAddresses.governorAddress, mocCARC20, tpParams);
  }
  return hre.network.live; // prevents re execution on live networks
};
export default deployFunc;

deployFunc.id = "Initialized_Rif"; // id required to prevent re-execution
deployFunc.tags = ["InitializerRif"];
deployFunc.dependencies = ["MocRif", "MocRifExpansion", "MocVendors"];
