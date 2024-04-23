// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { IChangerContract } from "../interfaces/IChangerContract.sol";
import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";
// TODO: "moc-main": "github:money-on-chain/main-sc-protocol-v2#add-commissionSplitter"
//        install library with the audited tag
import { CommissionSplitter } from "moc-main/contracts/auxiliary/CommissionSplitter.sol";

contract CommissionSplitterChanger is IChangerContract {
    uint256 public constant PRECISION = 10 ** 18;
    // ------- Custom Errors -------
    error WrongSetup();

    // ------- Storage -------

    // MocCore proxy contract
    MocCARC20 public immutable mocCoreProxy;
    // new MocCore implementation contract
    address public immutable newMocCoreImpl;
    // contract able to make upgrades on V1
    IUpgradeDelegator public immutable upgradeDelegator;
    // new commission splitter implementation used to split tokens to MocCoreV2 instead of V1
    address public immutable newCommissionSplitterV2Impl;
    // current operations fees splitter that will be migrated
    ICurrentCommissionSplitter public immutable commissionSplitterV2Proxy;
    // current TC interests splitter that will be migrated
    ICurrentCommissionSplitter public immutable commissionSplitterV3Proxy;
    // new operations fees splitter
    CommissionSplitter public immutable feesSplitterProxy;
    // new TC interests splitter
    CommissionSplitter public immutable tcInterestsSplitterProxy;
    // pct retain on fees to be re-injected as Collateral, while paying fees with AC [PREC]
    // replace the acTokenPctToRecipient1 used on the current CommissionSplitterV2
    uint256 public immutable feeRetainer;
    uint256 public immutable acTokenPctToRecipient1;

    /**
     * @notice constructor
     * @param upgradeDelegator_ contract able to make upgrades on V1
     * @param mocCoreProxy_ MocCore proxy contract
     * @param newMocCoreImpl_ new MocCore implementation contract
     * @param newCommissionSplitterV2Impl_  new commission splitter implementation used to split tokens to MocCore V2
     * @param feesSplitterProxy_ new operations fees splitter
     * @param tcInterestsSplitterProxy_ new TC interests splitter
     */
    constructor(
        IUpgradeDelegator upgradeDelegator_,
        MocCARC20 mocCoreProxy_,
        address newMocCoreImpl_,
        address newCommissionSplitterV2Impl_,
        CommissionSplitter feesSplitterProxy_,
        CommissionSplitter tcInterestsSplitterProxy_
    ) {
        upgradeDelegator = upgradeDelegator_;
        mocCoreProxy = mocCoreProxy_;
        newMocCoreImpl = newMocCoreImpl_;
        newCommissionSplitterV2Impl = newCommissionSplitterV2Impl_;
        feesSplitterProxy = feesSplitterProxy_;
        tcInterestsSplitterProxy = tcInterestsSplitterProxy_;
        commissionSplitterV2Proxy = ICurrentCommissionSplitter(mocCoreProxy.mocFeeFlowAddress());
        commissionSplitterV3Proxy = ICurrentCommissionSplitter(mocCoreProxy.tcInterestCollectorAddress());

        uint256 outputProportion1 = commissionSplitterV2Proxy.outputProportion_1();
        uint256 outputProportion2 = commissionSplitterV2Proxy.outputProportion_2();

        // we need to map the new percentages
        // 100% = A + B + C
        // 100% - A = B + C => B' + C' is the new 100%
        // 100% = (B / 100% - A) + (C / 100% - A)

        // [PREC]
        feeRetainer = outputProportion1;
        // [PREC] = ([PREC] * [PREC]) / ([PREC] - [PREC])
        acTokenPctToRecipient1 = (outputProportion2 * PRECISION) / (PRECISION - outputProportion1);
    }

    /**
      @notice Execute the changes.
      @dev Should be called by the governor, but this contract does not check that explicitly
      because it is not its responsibility in the current architecture
      IMPORTANT: This function should not be overridden, you should only redefine
      _beforeUpgrade and _afterUpgrade methods to use this template
    */
    function execute() external {
        _beforeUpgrade();
        _upgrade();
        _afterUpgrade();
    }

    /**
      @notice Upgrade the proxy to the newImplementation
      @dev IMPORTANT: This function should not be overridden
    */
    function _upgrade() internal {
        upgradeDelegator.upgrade(address(commissionSplitterV2Proxy), newCommissionSplitterV2Impl);
        mocCoreProxy.upgradeTo(newMocCoreImpl);
    }

    /**
      @notice Intended to prepare the system for the upgrade
    */
    function _beforeUpgrade() internal view {}

    /**
      @notice Intended to do the final tweaks after the upgrade, for example initialize the contract
    */
    function _afterUpgrade() internal {
        // set MocCore as recipient1
        commissionSplitterV2Proxy.setOutputAddress_1(address(mocCoreProxy));
        // split both to keep them empty
        commissionSplitterV2Proxy.split();
        commissionSplitterV3Proxy.split();
        // update MocCore balance to account the new AC tokens
        mocCoreProxy.refreshACBalance();

        // update MocCore setups
        mocCoreProxy.setFeeRetainer(feeRetainer);
        mocCoreProxy.setMocFeeFlowAddress(address(feesSplitterProxy));
        mocCoreProxy.setTCInterestCollectorAddress(address(tcInterestsSplitterProxy));

        // enforce the percentage calculated
        feesSplitterProxy.setAcTokenPctToRecipient1(acTokenPctToRecipient1);

        //revert if any commission splitter configuration is wrong;
        if (!validateSetups()) revert WrongSetup();
    }

    function validateSetups() public view returns (bool ok) {
        /////////////////////////////////////////
        // feesSplitterProxy verifications /////
        ///////////////////////////////////////
        if (feesSplitterProxy.governor() != mocCoreProxy.governor()) return false;
        if (address(feesSplitterProxy.acToken()) != commissionSplitterV2Proxy.reserveToken()) return false;
        // recipient1 is not used anymore and is replaced with the fee retainer
        if (feesSplitterProxy.acTokenAddressRecipient1() != commissionSplitterV2Proxy.outputAddress_2()) return false;
        if (feesSplitterProxy.acTokenAddressRecipient2() != commissionSplitterV2Proxy.outputAddress_3()) return false;
        // acToken percentages are not validated because it was enforced on this changer

        if (address(feesSplitterProxy.feeToken()) != commissionSplitterV2Proxy.tokenGovern()) return false;
        if (feesSplitterProxy.feeTokenAddressRecipient1() != commissionSplitterV2Proxy.outputTokenGovernAddress_1())
            return false;
        if (feesSplitterProxy.feeTokenAddressRecipient2() != commissionSplitterV2Proxy.outputTokenGovernAddress_2())
            return false;
        if (feesSplitterProxy.feeTokenPctToRecipient1() != commissionSplitterV2Proxy.outputProportionTokenGovern_1())
            return false;

        ////////////////////////////////////////////////
        // tcInterestsSplitterProxy verifications /////
        //////////////////////////////////////////////
        if (tcInterestsSplitterProxy.governor() != mocCoreProxy.governor()) return false;
        if (address(tcInterestsSplitterProxy.acToken()) != commissionSplitterV3Proxy.reserveToken()) return false;
        if (tcInterestsSplitterProxy.acTokenAddressRecipient1() != commissionSplitterV3Proxy.outputAddress_1())
            return false;
        if (tcInterestsSplitterProxy.acTokenAddressRecipient2() != commissionSplitterV3Proxy.outputAddress_2())
            return false;
        if (tcInterestsSplitterProxy.acTokenPctToRecipient1() != commissionSplitterV3Proxy.outputProportion_1())
            return false;
        // // for feeToken we only need to check the token because the splitter ask for its balance but is not used
        if (address(tcInterestsSplitterProxy.feeToken()) != commissionSplitterV2Proxy.tokenGovern()) return false;
    }
}

interface ICurrentCommissionSplitter {
    function split() external;

    function setOutputAddress_1(address outputAddress1) external;

    function reserveToken() external view returns (address reserveToken);

    function outputAddress_1() external view returns (address outputAddress1);

    function outputAddress_2() external view returns (address outputAddress2);

    function outputAddress_3() external view returns (address outputAddress3);

    function outputProportion_1() external view returns (uint256 outputProportion1);

    function outputProportion_2() external view returns (uint256 outputProportion2);

    function tokenGovern() external view returns (address tokenGovern);

    function outputTokenGovernAddress_1() external view returns (address outputTokenGovernAddress1);

    function outputTokenGovernAddress_2() external view returns (address outputTokenGovernAddress2);

    function outputProportionTokenGovern_1() external view returns (uint256 outputProportionTokenGovern1);
}

interface IUpgradeDelegator {
    function upgrade(address proxy_, address implementation_) external;
}
