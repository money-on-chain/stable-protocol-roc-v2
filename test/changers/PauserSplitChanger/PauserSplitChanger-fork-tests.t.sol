// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { PauserSplitChanger } from "../../../contracts/changers/PauserSplitChanger/PauserSplitChanger.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocMultiCollateralGuard } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { MocOperations } from "moc-main-latest/contracts/core/MocOperations.sol";
import { MocVendors } from "moc-main-latest/contracts/vendors/MocVendors.sol";
import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { IGovernor } from "moc-main-latest/contracts/interfaces/IGovernor.sol";

interface IOwnableGovernor {
    function owner() external view returns (address);
}

contract PauserSplitChangerForkTests is Test {
    // Default fork block used in existing project fork tests
    uint256 internal constant DEFAULT_FORK_BLOCK = 8879200;
    string internal constant DEFAULT_PARAMS_PATH = "ignition/modules/changers/pauserSplit/parameters/rskMainnet.json";

    MocMultiCollateralGuard internal mocMultiCollateralGuard;
    PauserSplitChanger internal changer;
    address internal newPauser;

    function setUp() public {
        string memory defaultMainnetForkUrl = vm.envOr("RSK_MAINNET_RPC_URL", string("https://public-node.rsk.co"));
        string memory forkUrl = vm.envOr("FORK_URL", defaultMainnetForkUrl);
        uint256 forkBlock = vm.envOr("FORK_BLOCK", DEFAULT_FORK_BLOCK);
        vm.createSelectFork(forkUrl, forkBlock);

        _loadParamsFromJson();
        changer = new PauserSplitChanger(mocMultiCollateralGuard, newPauser);
    }

    function test_BucketsAndQueuesAreTwo() public view {
        uint256 bucketAmount = mocMultiCollateralGuard.getBucketAmount();
        assertEq(bucketAmount, 2, "Expected exactly 2 buckets");

        for (uint256 i = 0; i < bucketAmount; i++) {
            MocOperations bucket = mocMultiCollateralGuard.buckets(i);
            assertTrue(address(bucket) != address(0), "Bucket must exist");
            assertTrue(bucket.mocQueue() != address(0), "Queue must exist");
        }
    }

    function test_BucketsShareSameMocVendors() public view {
        assertEq(mocMultiCollateralGuard.getBucketAmount(), 2, "Expected exactly 2 buckets");
        MocVendors vendors0 = mocMultiCollateralGuard.buckets(0).mocVendors();
        MocVendors vendors1 = mocMultiCollateralGuard.buckets(1).mocVendors();
        assertEq(address(vendors0), address(vendors1), "Both buckets must share same MocVendors");
    }

    function test_ExecuteSetsNewPauserEverywhere() public {
        uint256 bucketAmount = mocMultiCollateralGuard.getBucketAmount();
        address previousGuardPauser = mocMultiCollateralGuard.pauser();
        MocVendors vendors0 = mocMultiCollateralGuard.buckets(0).mocVendors();
        MocVendors vendors1 = mocMultiCollateralGuard.buckets(1).mocVendors();
        assertEq(address(vendors0), address(vendors1), "Both buckets must share same MocVendors");
        address previousVendorsPauser = vendors0.pauser();
        address previousVendorsGuardian = vendors0.vendorsGuardianAddress();

        address[] memory previousBucketPausers = new address[](bucketAmount);
        address[] memory previousQueuePausers = new address[](bucketAmount);
        for (uint256 i = 0; i < bucketAmount; i++) {
            MocOperations bucket = mocMultiCollateralGuard.buckets(i);
            previousBucketPausers[i] = bucket.pauser();
            previousQueuePausers[i] = MocQueue(bucket.mocQueue()).pauser();
        }

        IGovernor governor = IGovernor(address(mocMultiCollateralGuard.governor()));
        address governorOwner = IOwnableGovernor(address(governor)).owner();
        vm.prank(governorOwner);
        governor.executeChange(IChangeContract(address(changer)));

        assertEq(mocMultiCollateralGuard.pauser(), newPauser, "Guard pauser mismatch");
        assertTrue(previousGuardPauser != newPauser, "Previous guard pauser should exist");
        assertEq(vendors0.pauser(), newPauser, "MocVendors pauser mismatch");
        assertEq(vendors0.vendorsGuardianAddress(), newPauser, "MocVendors guardian mismatch");
        assertTrue(previousVendorsPauser != newPauser, "Previous MocVendors pauser should exist");
        assertTrue(previousVendorsGuardian != newPauser, "Previous MocVendors guardian should exist");

        for (uint256 i = 0; i < bucketAmount; i++) {
            MocOperations bucket = mocMultiCollateralGuard.buckets(i);
            assertEq(bucket.pauser(), newPauser, "Bucket pauser mismatch");
            assertEq(MocQueue(bucket.mocQueue()).pauser(), newPauser, "Queue pauser mismatch");
            assertTrue(previousBucketPausers[i] != newPauser, "Previous bucket pauser should exist");
            assertTrue(previousQueuePausers[i] != newPauser, "Previous queue pauser should exist");
        }
    }

    function _loadParamsFromJson() internal {
        string memory paramsPath = vm.envOr("PAUSER_SPLIT_PARAMS_PATH", string(DEFAULT_PARAMS_PATH));
        string memory json = vm.readFile(paramsPath);
        mocMultiCollateralGuard = MocMultiCollateralGuard(
            payable(vm.parseJsonAddress(json, ".PauserSplitChanger.mocMultiCollateralGuard"))
        );
        newPauser = vm.parseJsonAddress(json, ".PauserSplitChanger.newPauser");
    }
}
