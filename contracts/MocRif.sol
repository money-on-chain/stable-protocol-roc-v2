// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";

contract MocRif is MocCARC20 {
    error protocolAlreadyMigrated();

    function migrateFromV1(
        uint256 qAC_,
        uint256 qTC_,
        uint256 qTP_,
        uint256 tpEma_,
        uint256 nextEmaCalculation_,
        uint256 nextTCInterestPayment_
    ) external onlyAuthorizedChanger {
        if (nACcb != 0 || nTCcb != 0 || pegContainer[0].nTP != 0) revert protocolAlreadyMigrated();
        _depositAC(qAC_);
        _depositTC(qTC_, 0);
        _depositTP(0, qTP_, 0);
        // update TP Ema because could be calculated after this contract initialization and before the migration
        EmaItem storage _tpEma = tpEma[0];
        _tpEma.ema = tpEma_;
        nextEmaCalculation = nextEmaCalculation_;
        nextTCInterestPayment = nextTCInterestPayment_;
    }
}
