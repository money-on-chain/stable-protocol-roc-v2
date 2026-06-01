// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { FixInfinityAndDOCRNameChanger } from "../../../contracts/changers/fixInfinityAndDOCRName/FixInfinityAndDOCRNameChanger.sol";
import { MocCARC20 } from "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol";
import { MocCore } from "moc-main-latest/contracts/core/MocCore.sol";
import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { IGovernor } from "moc-main-latest/contracts/interfaces/IGovernor.sol";

interface IGovernorOwner {
    function owner() external view returns (address);
}

contract FixInfinityAndDOCRNameChangerForkTests is Test {
    uint256 internal constant HALF_INFINITY = type(uint256).max / 2;
    uint256 internal constant HUNDRED_YEARS_IN_SECONDS = 100 * 365 days;
    string internal constant DEFAULT_DEPLOYED_ADDRESSES_PATH = "ignition/deployments/chain-30/deployed_addresses.json";
    string internal constant DOC_BUCKET_KEY = "DocBucket_DocBucketProxy";
    string internal constant MODULE_PREFIX = "FullMultiCollateralUpgrade#";

    MocCARC20 internal docBucket;
    FixInfinityAndDOCRNameChanger internal changer;
    address internal governorOwner;

    function setUp() public {
        string memory defaultMainnetForkUrl = vm.envOr("RSK_MAINNET_RPC_URL", string("https://public-node.rsk.co"));
        string memory forkUrl = vm.envOr("FORK_URL", defaultMainnetForkUrl);
        vm.createSelectFork(forkUrl, 8879400);

        address docBucketAddress = _loadDocBucketAddressFromJson();
        docBucket = MocCARC20(payable(docBucketAddress));
        changer = new FixInfinityAndDOCRNameChanger(docBucket);

        address governorAddress = address(docBucket.governor());
        governorOwner = IGovernorOwner(governorAddress).owner();
        vm.deal(governorOwner, 100 ether);
    }

    function test_ExecuteChangerSetsInfinityHalfTimeSpans() public {
        address collectorBefore = docBucket.tcInterestCollectorAddress();
        uint256 rateBefore = docBucket.tcInterestRate();

        IGovernor governor = IGovernor(address(docBucket.governor()));

        vm.prank(governorOwner);
        governor.executeChange(IChangeContract(address(changer)));

        assertEq(docBucket.tcInterestCollectorAddress(), collectorBefore, "TC collector should not change");
        assertEq(docBucket.tcInterestRate(), rateBefore, "TC interest rate should not change");
        assertEq(
            docBucket.tcInterestPaymentTimeSpan(),
            HALF_INFINITY,
            "TC interest payment span should be half infinity"
        );
        assertEq(docBucket.settlementTimeSpan(), HALF_INFINITY, "Settlement span should be half infinity");
        assertEq(docBucket.emaCalculationTimeSpan(), HALF_INFINITY, "EMA span should be half infinity");
    }

    function test_TimeBasedTasksSetNextTimesInfinitelyFarAfterExecution() public {
        IGovernor governor = IGovernor(address(docBucket.governor()));

        vm.prank(governorOwner);
        governor.executeChange(IChangeContract(address(changer)));

        docBucket.tcHoldersInterestPayment();
        docBucket.updateEmas();
        docBucket.execSettlement();

        uint256 ultraFutureThreshold = block.timestamp + (HUNDRED_YEARS_IN_SECONDS * 100); // 10,000 years in the future

        assertEq(
            docBucket.nextTCInterestPayment(),
            block.timestamp + HALF_INFINITY,
            "nextTCInterestPayment should be recalculated with half infinity"
        );
        assertEq(
            docBucket.nextEmaCalculation(),
            block.timestamp + HALF_INFINITY,
            "nextEmaCalculation should be recalculated with half infinity"
        );
        assertEq(
            docBucket.nextSettlementTime(),
            block.timestamp + HALF_INFINITY,
            "nextSettlementTime should be recalculated with half infinity"
        );

        assertGt(
            docBucket.nextTCInterestPayment(),
            ultraFutureThreshold,
            "nextTCInterestPayment should be far in the future"
        );
        assertGt(
            docBucket.nextEmaCalculation(),
            ultraFutureThreshold,
            "nextEmaCalculation should be far in the future"
        );
        assertGt(
            docBucket.nextSettlementTime(),
            ultraFutureThreshold,
            "nextSettlementTime should be far in the future"
        );

        // cannot be executed again in the same block due to time-based checks
        vm.expectRevert(MocCore.MissingTimeToTCInterestPayment.selector);
        docBucket.tcHoldersInterestPayment();
        docBucket.updateEmas();
        vm.expectRevert(MocCore.MissingTimeToSettlement.selector);
        docBucket.execSettlement();
    }

    function test_TimeBasedTasksWithoutChangerWrapNextTimesToCurrentTimestamp() public {
        // This test validates current on-chain behavior without running the changer.
        // It expects spans already configured as "infinite" in the forked state.
        uint256 maxUint = type(uint256).max;
        assertEq(docBucket.tcInterestPaymentTimeSpan(), maxUint, "Expected max uint TC interest span before changer");
        assertEq(docBucket.emaCalculationTimeSpan(), maxUint, "Expected max uint EMA span before changer");
        assertEq(docBucket.settlementTimeSpan(), maxUint, "Expected max uint settlement span before changer");

        docBucket.tcHoldersInterestPayment();
        docBucket.updateEmas();
        docBucket.execSettlement();

        assertEq(
            docBucket.nextTCInterestPayment(),
            block.timestamp - 1,
            "nextTCInterestPayment should wrap to current timestamp"
        );
        assertEq(
            docBucket.nextEmaCalculation(),
            block.timestamp - 1,
            "nextEmaCalculation should wrap to current timestamp"
        );
        assertEq(
            docBucket.nextSettlementTime(),
            block.timestamp - 1,
            "nextSettlementTime should wrap to current timestamp"
        );

        // can be executed again in the same block
        docBucket.tcHoldersInterestPayment();
        docBucket.updateEmas();
        docBucket.execSettlement();
    }

    function _loadDocBucketAddressFromJson() internal view returns (address) {
        string memory deployedAddressesPath = vm.envOr(
            "IGNITION_DEPLOYED_ADDRESSES_PATH",
            string(DEFAULT_DEPLOYED_ADDRESSES_PATH)
        );

        string memory json = vm.readFile(deployedAddressesPath);

        string memory selector = string.concat(".", DOC_BUCKET_KEY);
        try vm.parseJsonAddress(json, selector) returns (address addr) {
            require(addr != address(0), "Doc bucket address is zero");
            return addr;
        } catch {
            string memory prefixedSelector = string.concat(".", MODULE_PREFIX, DOC_BUCKET_KEY);
            address prefixedAddr = vm.parseJsonAddress(json, prefixedSelector);
            require(prefixedAddr != address(0), "Doc bucket address is zero");
            return prefixedAddr;
        }
    }
}
