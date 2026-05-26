// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { MocMultiCollateralGuard } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { MocOperations } from "moc-main-latest/contracts/core/MocOperations.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocVendors } from "moc-main-latest/contracts/vendors/MocVendors.sol";

/**
 * @title PauserSplitChanger
 * @notice Sets a new pauser on MocMultiCollateralGuard, all registered buckets, their queues and MocVendors
 */
contract PauserSplitChanger is IChangeContract {
    MocMultiCollateralGuard public immutable mocMultiCollateralGuard;
    address public immutable newPauser;

    constructor(MocMultiCollateralGuard mocMultiCollateralGuard_, address newPauser_) {
        mocMultiCollateralGuard = mocMultiCollateralGuard_;
        newPauser = newPauser_;
    }

    function execute() external {
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
}
