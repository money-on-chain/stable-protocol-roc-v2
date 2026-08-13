// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { MocMultiCollateralGuard } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { MocOperations } from "moc-main-latest/contracts/core/MocOperations.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocVendors } from "moc-main-latest/contracts/vendors/MocVendors.sol";
import { MocRif } from "../../MocRif.sol";
import { TokenMigrator } from "../../TokenMigrator.sol";

interface IAccessControl {
    function hasRole(bytes32 role_, address account_) external view returns (bool);
}

interface IMocQueue {
    function isEmpty() external view returns (bool);
}

/**
 * @title PauserSplitRifProMigrationChanger
 * @notice Sets the pauser across the multi-collateral protocol and migrates RIFPro.
 * @dev The RIF queue must be empty and the new RIFPro token must grant all required
 *      roles to the RIF bucket proxy before this change is executed.
 * @dev Preconditions:
 *       - The new RIFPro token must grant MINTER_ROLE, BURNER_ROLE, and DEFAULT_ADMIN_ROLE
 *         to the RIF bucket proxy before this change is executed.
 *       - The RIF bucket must have fresh valid prices in the execution block, so the new
 *         nTCcb and migration rate are calculated from up-to-date bucket state.
 *       - The RIF queue must be empty. Pending TC redeem operations can distort the new
 *         nTCcb calculation.
 *       - The protocol should be paused during execution. Otherwise, an attacker could
 *         enqueue operations around the migration and manipulate the TC price.
 */
contract PauserSplitRifProMigrationChanger is IChangeContract {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error MissingTokenRole(bytes32 role_, address account_);
    error QueueNotEmpty();

    MocMultiCollateralGuard public immutable mocMultiCollateralGuard;
    address public immutable newPauser;
    MocRif public immutable rifBucketProxy;
    address public immutable newRifBucketImplementation;
    address public immutable legacyRifProToken;
    address public immutable newRifProToken;
    TokenMigrator public tokenMigrator;

    constructor(
        MocMultiCollateralGuard mocMultiCollateralGuard_,
        address newPauser_,
        address rifBucketProxy_,
        address newRifBucketImplementation_,
        address legacyRifProToken_,
        address newRifProToken_
    ) {
        mocMultiCollateralGuard = mocMultiCollateralGuard_;
        newPauser = newPauser_;
        rifBucketProxy = MocRif(rifBucketProxy_);
        newRifBucketImplementation = newRifBucketImplementation_;
        legacyRifProToken = legacyRifProToken_;
        newRifProToken = newRifProToken_;
    }

    function execute() external {
        _beforeUpgrade();
        _upgrade();
        _afterUpgrade();
    }

    function _upgrade() internal {
        rifBucketProxy.upgradeTo(newRifBucketImplementation);
     }

    function _setPausers() internal {
        mocMultiCollateralGuard.setPauser(newPauser);

        MocVendors mocVendors = mocMultiCollateralGuard.buckets(0).mocVendors();
        mocVendors.setPauser(newPauser);
        mocVendors.setVendorsGuardianAddress(newPauser);

        uint256 bucketAmount = mocMultiCollateralGuard.getBucketAmount();
        for (uint256 i = 0; i < bucketAmount; i++) {
            MocOperations bucket = mocMultiCollateralGuard.buckets(i);
            bucket.setPauser(newPauser);
            MocQueue(bucket.mocQueue()).setPauser(newPauser);
        }
    }

    function _beforeUpgrade() internal view {
        address rifBucketAddress = address(rifBucketProxy);
        if (!IMocQueue(rifBucketProxy.mocQueue()).isEmpty()) revert QueueNotEmpty();
        if (!IAccessControl(newRifProToken).hasRole(MINTER_ROLE, rifBucketAddress))
            revert MissingTokenRole(MINTER_ROLE, rifBucketAddress);
        if (!IAccessControl(newRifProToken).hasRole(BURNER_ROLE, rifBucketAddress))
            revert MissingTokenRole(BURNER_ROLE, rifBucketAddress);
        if (!IAccessControl(newRifProToken).hasRole(DEFAULT_ADMIN_ROLE, rifBucketAddress))
            revert MissingTokenRole(DEFAULT_ADMIN_ROLE, rifBucketAddress);

        _setPausers();
    }

    function _afterUpgrade() internal {
        // Setting this new nTCcb ensures that new RIFpro token price is 1:1 with RIF token
        uint256 newNTCcb = rifBucketProxy.getTotalACavailable() - rifBucketProxy.getLckAC();
        // Calculate migration rate based on the new nTCcb and the previous one, 
        // so users get the correct amount of new RIFPro tokens according to the new price
        uint256 migrationRate = (newNTCcb * 1e18) / rifBucketProxy.nTCcb();
        // Initialize the token migrator with the legacy and new RIFPro token addresses and the calculated migration rate
        tokenMigrator = new TokenMigrator(legacyRifProToken, newRifProToken, migrationRate);
        // Set the new RIFPro token and the new nTCcb in the bucket, so it can work with the new token after the upgrade
        rifBucketProxy.migrateTCToken(newRifProToken, newNTCcb, address(tokenMigrator));
    }
}
