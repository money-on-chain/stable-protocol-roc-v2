// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { MocRif } from "../../MocRif.sol";
import { TokenMigrator } from "../../TokenMigrator.sol";

interface IAccessControl {
    function hasRole(bytes32 role_, address account_) external view returns (bool);
}

/**
  @title RifPRoMigrationChanger
  @notice Migrates RIFPro token to the new one
  @dev Preconditions:
       - The new RIFPro token must have the MINTER_ROLE, BURNER_ROLE and DEFAULT_ADMIN_ROLE assigned to the RIF bucket proxy address before executing the change.
       - The RIF bucket must have valid prices in the same block as the change execution, so the new nTCcb and migration rate are correctly calculated.
       - The RIF queue must be empty, a redeem TC operation enqueued may cause a bad calculation of the new nTTcb.
       - The protocol should be paused during execution. Otherwise, an attacker could
 *        enqueue operations around the migration and manipulate the TC price.
 */
contract RifPRoMigrationChanger is IChangeContract {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error MissingTokenRole(bytes32 role_, address account_);

    MocRif public immutable rifBucketProxy;
    address public immutable newRifBucketImplementation;
    address public immutable legacyRifProToken;
    address public immutable newRifProToken;
    TokenMigrator public tokenMigrator;

    constructor(
        address rifBucketProxy_,
        address newRifBucketImplementation_,
        address legacyRifProToken_,
        address newRifProToken_
    ) {
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
    function _beforeUpgrade() internal view {
        address rifBucketAddress = address(rifBucketProxy);
        if (!IAccessControl(newRifProToken).hasRole(MINTER_ROLE, rifBucketAddress))
            revert MissingTokenRole(MINTER_ROLE, rifBucketAddress);
        if (!IAccessControl(newRifProToken).hasRole(BURNER_ROLE, rifBucketAddress))
            revert MissingTokenRole(BURNER_ROLE, rifBucketAddress);
        if (!IAccessControl(newRifProToken).hasRole(DEFAULT_ADMIN_ROLE, rifBucketAddress))
            revert MissingTokenRole(DEFAULT_ADMIN_ROLE, rifBucketAddress);
    }
    function _afterUpgrade() internal {
        // Setting this new nTCcb ensures that new RIFpro token price is 1:1 with RIF token
        uint256 newNTCcb = rifBucketProxy.getTotalACavailable() - rifBucketProxy.getLckAC();
        // Calculate migration rate based on the new nTCcb and the previous one, so users get the correct amount of new RIFPro tokens according to the new price
        uint256 migrationRate = (newNTCcb * 1e18) / rifBucketProxy.nTCcb();
        // Initialize the token migrator with the legacy and new RIFPro token addresses and the calculated migration rate
        tokenMigrator = new TokenMigrator(legacyRifProToken, newRifProToken, migrationRate);
        // Set the new RIFPro token and the new nTCcb in the bucket, so it can work with the new token after the upgrade
        rifBucketProxy.migrateTCToken(newRifProToken, newNTCcb, address(tokenMigrator));
    }
}
