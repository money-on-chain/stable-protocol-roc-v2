// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";

/**
  @title MocRif
  @notice A mocCore implementation using RIF Token as RRC20 Collateral Asset 
 */
contract MocRif is MocCARC20 {
    error protocolAlreadyMigrated();

    /**
     * @notice One time only specific function for protocols migrating from V1 implementation
     */
    function migrateFromV1(
        uint256 qAC_,
        uint256 qTC_,
        uint256 qTP_,
        uint256 nextEmaCalculation_,
        uint256 nextTCInterestPayment_
    ) external onlyAuthorizedChanger {
        // Note: nACcb can be different to zero, by collateral injection
        if (nTCcb != 0 || pegContainer[0].nTP != 0) revert protocolAlreadyMigrated();
        _depositAC(qAC_);
        _depositTC(qTC_, 0);
        _depositTP(0, qTP_, 0);
        nextEmaCalculation = nextEmaCalculation_;
        nextTCInterestPayment = nextTCInterestPayment_;
    }
}
