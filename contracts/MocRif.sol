// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { MocCARC20 } from "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol";
import { IMocRC20 } from "moc-main-latest/contracts/interfaces/IMocRC20.sol";

/**
 * @title MocRif
 * @notice MoC Core implementation using RIF as the Collateral Asset.
 */
contract MocRif is MocCARC20 {
    error AlreadyMigrated();

    /**
     * @notice Migrates the core bucket Collateral Token to a new token contract.
     * @dev Updates the Collateral Token reference and bucket accounting balance, then mints the
     *      corresponding amount of the new Collateral Token to the token migrator contract.
     *      Can only be called by an authorized governance changer.
     * @param newTCtoken_ The new Collateral Token address.
     * @param newNTCcb_ The new Collateral Token bucket accounting balance.
     * @param tokenMigrator_ The address that receives the newly minted Collateral Tokens for migration.
     */
    function migrateTCToken(
        address newTCtoken_,
        uint256 newNTCcb_,
        address tokenMigrator_
    ) external onlyAuthorizedChanger {
        if (address(tcToken) == newTCtoken_) revert AlreadyMigrated();
        tcToken = IMocRC20(newTCtoken_);
        nTCcb = newNTCcb_;
        _mintToken(tcToken, tokenMigrator_, newNTCcb_);
    }
}
