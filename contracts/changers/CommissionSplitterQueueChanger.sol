// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { IChangerContract } from "../interfaces/IChangerContract.sol";
import { IDataProvider } from "../interfaces/IDataProvider.sol";
import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";
import { MocQueue } from "moc-main/contracts/queue/MocQueue.sol";
// TODO: "moc-main": "github:money-on-chain/main-sc-protocol-v2#remove-fc-halting-queue-feature-export"
//        install library with the audited tag
import { CommissionSplitter } from "moc-main/contracts/auxiliary/CommissionSplitter.sol";

/**
  In this changer we change:

  1) Set Fee flow output to new commission splitter
  2) Set TCInterest output to new commission splitter
  3) New implementation of MoCQueue (fix bug)
  4) New feeTokenPriceProvider get the price from OKU swap
  5) Before upgrade split() to get the funds of the old commission splitter

 */

contract CommissionSplitterQueueChanger is IChangerContract {
    uint256 public constant PRECISION = 10 ** 18;
    // ------- Custom Errors -------
    error WrongSetup();

    // ------- Storage -------

    // MocCore proxy contract
    MocCARC20 public immutable mocCoreProxy;
    // MocQueue proxy contract
    MocQueue public immutable mocQueueProxy;
    // new MocQueue implementation contract
    address public immutable newMocQueueImpl;
    // Fee Token price provider
    IDataProvider public feeTokenPriceProvider;

    // current operations fees splitter that will be migrated
    ICurrentCommissionSplitter public immutable commissionSplitterV2Proxy;
    // current TC interests splitter that will be migrated
    ICurrentCommissionSplitter public immutable commissionSplitterV3Proxy;

    // new operations fees splitter
    CommissionSplitter public immutable feesSplitterProxy;

    /**
     * @notice constructor
     * @param mocCoreProxy_ MocCore proxy contract
     * @param newMocQueueImpl_ new MocQueue implementation contract
     * @param feeTokenPriceProvider_ new Fee Token price provider address
     * @param feesSplitterProxy_ new Commission splitter
     */
    constructor(
        MocCARC20 mocCoreProxy_,
        address newMocQueueImpl_,
        IDataProvider feeTokenPriceProvider_,
        CommissionSplitter feesSplitterProxy_
    ) {
        mocCoreProxy = mocCoreProxy_;
        newMocQueueImpl = newMocQueueImpl_;
        feeTokenPriceProvider = feeTokenPriceProvider_;
        feesSplitterProxy = feesSplitterProxy_;

        commissionSplitterV2Proxy = ICurrentCommissionSplitter(mocCoreProxy.mocFeeFlowAddress());
        commissionSplitterV3Proxy = ICurrentCommissionSplitter(mocCoreProxy.tcInterestCollectorAddress());
        mocQueueProxy = MocQueue(mocCoreProxy.mocQueue());
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
        mocQueueProxy.upgradeTo(newMocQueueImpl);
    }

    /**
      @notice Intended to prepare the system for the upgrade
    */
    function _beforeUpgrade() internal view {}

    /**
      @notice Intended to do the final tweaks after the upgrade, for example initialize the contract
    */
    function _afterUpgrade() internal {
        // commissionSplitterV2 cannot be split because fail transferring balance to MocV1
        // split commissionSplitterV3 to keep them empty
        commissionSplitterV3Proxy.split();

        // update MocCore setups
        mocCoreProxy.setMocFeeFlowAddress(address(feesSplitterProxy));
        mocCoreProxy.setTCInterestCollectorAddress(address(feesSplitterProxy));
        mocCoreProxy.setFeeTokenPriceProviderAddress(address(feeTokenPriceProvider));

        //revert if any commission splitter configuration is wrong;
        if (!validateSetups()) revert WrongSetup();
    }

    function validateSetups() public view returns (bool ok) {

        /////////////////////////////////////////
        // feesSplitterProxy verifications /////
        ///////////////////////////////////////
        if (feesSplitterProxy.governor() != mocCoreProxy.governor()) return false;
        if (address(feesSplitterProxy.acToken()) != commissionSplitterV2Proxy.reserveToken()) return false;
        if (address(feesSplitterProxy.feeToken()) != commissionSplitterV2Proxy.tokenGovern()) return false;
        return true;
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
