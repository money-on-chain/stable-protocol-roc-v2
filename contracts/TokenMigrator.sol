// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title TokenMigrator
 * @notice Migrates balances from a legacy ERC20 token to a new ERC20 token.
 * This contract holds the supply of new tokens available for migration.
 * To migrate, token holders must approve this contract to transfer their full legacy token balance.
 * During migration, legacy tokens are transferred from the holder to this contract, where they remain
 * indefinitely, and new tokens are sent to the holder according to the configured migration rate.
 */
contract TokenMigrator {
    using SafeERC20 for IERC20;

    error InsufficientLegacyTokenBalance();
    error InvalidMigrationRate();

    IERC20 public immutable legacyToken;
    IERC20 public immutable newToken;
    uint256 public immutable migrationRate;
    uint256 public _totalMigrated;

    uint256 public constant MIGRATION_RATE_PRECISION = 1e18;

    /**
     * @notice Emitted when tokens are migrated.
     * @param sender_ The caller that triggered the migration.
     * @param user_ The holder whose tokens were migrated.
     * @param legacyAmount_ The legacy token amount migrated.
     * @param newAmount_ The new token amount sent to the holder.
     */
    event TokenMigrated(address indexed sender_, address indexed user_, uint256 legacyAmount_, uint256 newAmount_);

    /**
     * @param legacyToken_ The legacy token address.
     * @param newToken_ The new token address.
     * @param migrationRate_ The amount of new tokens sent per legacy token, scaled by `MIGRATION_RATE_PRECISION`.
     */
    constructor(address legacyToken_, address newToken_, uint256 migrationRate_) {
        if (migrationRate_ == 0) revert InvalidMigrationRate();
        legacyToken = IERC20(legacyToken_);
        newToken = IERC20(newToken_);
        migrationRate = migrationRate_;
    }

    /**
     * @notice Migrates `user_`'s full legacy token balance to the new token using the configured migration rate.
     * `user_` must approve this contract to transfer their legacy tokens before this function is called.
     * @param user_ The holder whose tokens are migrated.
     */
    function _migrateToken(address user_) internal {
        uint256 legacyAmount = legacyToken.balanceOf(user_);
        if (legacyAmount == 0) revert InsufficientLegacyTokenBalance();
        uint256 newAmount = Math.mulDiv(legacyAmount, migrationRate, MIGRATION_RATE_PRECISION);
        _totalMigrated += legacyAmount;
        legacyToken.safeTransferFrom(user_, address(this), legacyAmount);
        newToken.safeTransfer(user_, newAmount);
        emit TokenMigrated(msg.sender, user_, legacyAmount, newAmount);
    }

    /**
     * @notice Migrates the caller's full legacy token balance to the new token using the configured migration rate.
     * The caller must approve this contract to transfer their legacy tokens before calling this function.
     */
    function migrateToken() external {
        _migrateToken(msg.sender);
    }

    /**
     * @notice Migrates `user_`'s full legacy token balance to the new token using the configured migration rate.
     * `user_` must approve this contract to transfer their legacy tokens before this function is called.
     * @param user_ The holder whose tokens are migrated.
     */
    function migrateTokenFrom(address user_) external {
        _migrateToken(user_);
    }
}
