// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

import { MocCARC20 } from "moc-main/contracts/collateral/rc20/MocCARC20.sol";

contract MocRif is MocCARC20 {
    error protocolAlreadyMigrated();

    function migrateFromV1(uint256 qAC_, uint256 qTC_, uint256 qTP_) external onlyAuthorizedChanger {
        if (nACcb != 0 || nTCcb != 0 || pegContainer[0].nTP != 0) revert protocolAlreadyMigrated();
        _depositAC(qAC_);
        _depositTC(qTC_, 0);
        _depositTP(0, qTP_, 0);
    }
}
