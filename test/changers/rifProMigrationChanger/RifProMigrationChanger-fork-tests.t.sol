// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { IGovernor } from "moc-main-latest/contracts/interfaces/IGovernor.sol";
import { MocMultiCollateralGuard } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocQueueExecFees } from "moc-main-latest/contracts/queue/MocQueueExecFees.sol";
import { MocRC20 } from "moc-main-latest/contracts/tokens/MocRC20.sol";
import { MocRif } from "../../../contracts/MocRif.sol";
import { RifPRoMigrationChanger } from "../../../contracts/changers/rifProMigrationChanger/RifPRoMigrationChanger.sol";
import { TokenMigrator } from "../../../contracts/TokenMigrator.sol";

interface IGovernorOwner {
    function owner() external view returns (address);
}

contract RifProMigrationChangerForkTests is Test {
    address internal constant MOC_CORE_ADDRESS = 0xA27024Ed70035E46dba712609fc2Afa1c97aA36A;
    address internal constant RIF_PRO_HOLDER = 0xe4822F07C1d988A8f2F53D1817f7e8848897b67A;
    address internal constant MIGRATION_OPERATOR = address(0x1234);
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 internal constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 internal constant BURNER_ROLE = keccak256("BURNER_ROLE");

    MocRif internal rifBucket;
    MocRC20 internal legacyRifProToken;
    MocRC20 internal newRifProToken;
    MocRif internal newRifBucketImplementation;
    RifPRoMigrationChanger internal changer;
    address internal governorOwner;

    function setUp() public {
        string memory defaultMainnetForkUrl = vm.envOr("RSK_MAINNET_RPC_URL", string("https://public-node.rsk.co"));
        string memory forkUrl = vm.envOr("FORK_URL", defaultMainnetForkUrl);
        vm.createSelectFork(forkUrl, 8879400);

        rifBucket = MocRif(payable(MOC_CORE_ADDRESS));
        legacyRifProToken = MocRC20(address(rifBucket.tcToken()));

        IGovernor governor = IGovernor(address(rifBucket.governor()));
        governorOwner = IGovernorOwner(address(governor)).owner();
        vm.deal(governorOwner, 100 ether);

        newRifBucketImplementation = new MocRif();
        newRifProToken = _deployRifProToken(governor);
        changer = new RifPRoMigrationChanger(
            address(rifBucket),
            address(newRifBucketImplementation),
            address(legacyRifProToken),
            address(newRifProToken)
        );
    }

    function test_ExecuteChangerUpgradesBucketAndDeploysMigrator() public {
        uint256 expectedNewNTCcb = rifBucket.getTotalACavailable() - rifBucket.getLckAC();
        uint256 expectedMigrationRate = (expectedNewNTCcb * 1e18) / rifBucket.nTCcb();

        _executeChanger();

        TokenMigrator tokenMigrator = changer.tokenMigrator();

        assertEq(address(rifBucket.tcToken()), address(newRifProToken), "TC token should be migrated");
        assertEq(rifBucket.nTCcb(), expectedNewNTCcb, "nTCcb should be migrated");
        assertEq(newRifProToken.balanceOf(address(tokenMigrator)), expectedNewNTCcb, "migrator should receive new TC");
        assertEq(newRifProToken.totalSupply(), expectedNewNTCcb, "new TC supply should match migrated nTCcb");
        assertEq(address(tokenMigrator.legacyToken()), address(legacyRifProToken), "legacy token mismatch");
        assertEq(address(tokenMigrator.newToken()), address(newRifProToken), "new token mismatch");
        assertEq(tokenMigrator.migrationRate(), expectedMigrationRate, "migration rate mismatch");
    }

    function test_ExecuteChangerRevertsIfNewTokenDoesNotGrantBucketRoles() public {
        MocRC20 unpermissionedNewRifProToken = _deployRifProTokenWithoutBucketRoles(
            IGovernor(address(rifBucket.governor()))
        );
        RifPRoMigrationChanger unpermissionedChanger = new RifPRoMigrationChanger(
            address(rifBucket),
            address(newRifBucketImplementation),
            address(legacyRifProToken),
            address(unpermissionedNewRifProToken)
        );

        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(governorOwner);
        vm.expectRevert(
            abi.encodeWithSelector(RifPRoMigrationChanger.MissingTokenRole.selector, MINTER_ROLE, address(rifBucket))
        );
        governor.executeChange(IChangeContract(address(unpermissionedChanger)));
    }

    function test_ExecuteChangerRevertsIfNewTokenDoesNotGrantBucketBurnerRole() public {
        MocRC20 partiallyPermissionedNewRifProToken = _deployRifProTokenWithoutBucketRoles(
            IGovernor(address(rifBucket.governor()))
        );
        partiallyPermissionedNewRifProToken.grantRole(MINTER_ROLE, address(rifBucket));
        RifPRoMigrationChanger partiallyPermissionedChanger = new RifPRoMigrationChanger(
            address(rifBucket),
            address(newRifBucketImplementation),
            address(legacyRifProToken),
            address(partiallyPermissionedNewRifProToken)
        );

        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(governorOwner);
        vm.expectRevert(
            abi.encodeWithSelector(RifPRoMigrationChanger.MissingTokenRole.selector, BURNER_ROLE, address(rifBucket))
        );
        governor.executeChange(IChangeContract(address(partiallyPermissionedChanger)));
    }

    function test_ExecuteChangerRevertsIfNewTokenDoesNotGrantBucketAdminRole() public {
        MocRC20 partiallyPermissionedNewRifProToken = _deployRifProTokenWithoutBucketRoles(
            IGovernor(address(rifBucket.governor()))
        );
        partiallyPermissionedNewRifProToken.grantRole(MINTER_ROLE, address(rifBucket));
        partiallyPermissionedNewRifProToken.grantRole(BURNER_ROLE, address(rifBucket));
        RifPRoMigrationChanger partiallyPermissionedChanger = new RifPRoMigrationChanger(
            address(rifBucket),
            address(newRifBucketImplementation),
            address(legacyRifProToken),
            address(partiallyPermissionedNewRifProToken)
        );

        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(governorOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                RifPRoMigrationChanger.MissingTokenRole.selector,
                DEFAULT_ADMIN_ROLE,
                address(rifBucket)
            )
        );
        governor.executeChange(IChangeContract(address(partiallyPermissionedChanger)));
    }

    function test_NewTokenGrantsBucketAllRequiredRoles() public {
        assertTrue(newRifProToken.hasRole(DEFAULT_ADMIN_ROLE, address(rifBucket)), "bucket should be token admin");
        assertTrue(newRifProToken.hasRole(MINTER_ROLE, address(rifBucket)), "bucket should be token minter");
        assertTrue(newRifProToken.hasRole(BURNER_ROLE, address(rifBucket)), "bucket should be token burner");
    }

    function test_ExecuteChangerCannotBeRepeated() public {
        _executeChanger();

        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(governorOwner);
        vm.expectRevert(MocRif.AlreadyMigrated.selector);
        governor.executeChange(IChangeContract(address(changer)));
    }

    function test_TCPriceIsONE() public {
        _executeChanger();

        assertEq(rifBucket.getPTCac(), 1e18, "PTC price should be 1 after migration");
    }

    function test_TokenMigratorMigratesHolderBalance() public {
        _executeChanger();

        TokenMigrator tokenMigrator = changer.tokenMigrator();
        uint256 legacyAmount = _rifProHolderLegacyBalance();
        uint256 expectedNewAmount = _newAmount(tokenMigrator, legacyAmount);

        (uint256 migratorLegacyBalanceBefore, uint256 migratorNewBalanceBefore) = _migratorBalances(tokenMigrator);

        vm.startPrank(RIF_PRO_HOLDER);
        legacyRifProToken.approve(address(tokenMigrator), legacyAmount);
        tokenMigrator.migrateToken();
        vm.stopPrank();

        assertEq(legacyRifProToken.balanceOf(RIF_PRO_HOLDER), 0, "holder legacy balance should be migrated");
        assertEq(newRifProToken.balanceOf(RIF_PRO_HOLDER), expectedNewAmount, "holder should receive new RIFPro");
        assertEq(
            legacyRifProToken.balanceOf(address(tokenMigrator)),
            migratorLegacyBalanceBefore + legacyAmount,
            "migrator should keep migrated legacy RIFPro"
        );
        assertEq(
            newRifProToken.balanceOf(address(tokenMigrator)),
            migratorNewBalanceBefore - expectedNewAmount,
            "migrator new RIFPro balance should decrease"
        );
        assertEq(tokenMigrator._totalMigrated(), legacyAmount, "total migrated should track legacy amount");
    }

    function test_TokenMigratorFromMigratesHolderBalanceToHolder() public {
        _executeChanger();

        TokenMigrator tokenMigrator = changer.tokenMigrator();
        uint256 legacyAmount = _rifProHolderLegacyBalance();
        uint256 expectedNewAmount = _newAmount(tokenMigrator, legacyAmount);

        vm.prank(RIF_PRO_HOLDER);
        legacyRifProToken.approve(address(tokenMigrator), legacyAmount);

        vm.prank(MIGRATION_OPERATOR);
        tokenMigrator.migrateTokenFrom(RIF_PRO_HOLDER);

        assertEq(legacyRifProToken.balanceOf(RIF_PRO_HOLDER), 0, "holder legacy balance should be migrated");
        assertEq(newRifProToken.balanceOf(RIF_PRO_HOLDER), expectedNewAmount, "holder should receive new RIFPro");
        assertEq(newRifProToken.balanceOf(MIGRATION_OPERATOR), 0, "operator should not receive new RIFPro");
        assertEq(tokenMigrator._totalMigrated(), legacyAmount, "total migrated should track legacy amount");
    }

    function test_TokenMigratorFromRevertsWithoutAllowance() public {
        _executeChanger();

        TokenMigrator tokenMigrator = changer.tokenMigrator();
        _rifProHolderLegacyBalance();

        vm.prank(MIGRATION_OPERATOR);
        vm.expectRevert();
        tokenMigrator.migrateTokenFrom(RIF_PRO_HOLDER);
    }

    function test_TokenMigratorRevertsWhenHolderMigratesTwice() public {
        _executeChanger();

        TokenMigrator tokenMigrator = changer.tokenMigrator();
        uint256 legacyAmount = _rifProHolderLegacyBalance();

        vm.startPrank(RIF_PRO_HOLDER);
        legacyRifProToken.approve(address(tokenMigrator), legacyAmount);
        tokenMigrator.migrateToken();
        vm.expectRevert(TokenMigrator.InsufficientLegacyTokenBalance.selector);
        tokenMigrator.migrateToken();
        vm.stopPrank();
    }

    function test_MintTCAndRedeemTCCanBeQueuedAfterMigration() public {
        _executeChanger();

        IERC20 rifToken = IERC20(rifBucket.acToken());
        uint256 qTC = 1 ether;
        uint256 qACmax = 2 ether;
        uint256 mintExecFee = _execFee(MocQueueExecFees.OperType.mintTC);
        uint256 redeemExecFee = _execFee(MocQueueExecFees.OperType.redeemTC);

        uint256 holderRifProBalanceBefore = newRifProToken.balanceOf(RIF_PRO_HOLDER);
        uint256 nTCcbBefore = rifBucket.nTCcb();

        deal(address(rifToken), RIF_PRO_HOLDER, qACmax);

        vm.startPrank(RIF_PRO_HOLDER);
        rifToken.approve(address(rifBucket), qACmax);
        uint256 mintOperId = rifBucket.mintTC{ value: mintExecFee }(qTC, qACmax, RIF_PRO_HOLDER, address(0));
        vm.stopPrank();

        assertGt(mintOperId, 0, "mintTC should return an operation id");

        _mineUntilQueueCanExecute();

        _executeRifQueue();

        assertEq(
            newRifProToken.balanceOf(RIF_PRO_HOLDER),
            holderRifProBalanceBefore + qTC,
            "holder should receive minted RIFPro"
        );
        assertEq(rifBucket.nTCcb(), nTCcbBefore + qTC, "nTCcb should increase after mintTC execution");

        uint256 holderRifBalanceBeforeRedeem = rifToken.balanceOf(RIF_PRO_HOLDER);

        vm.startPrank(RIF_PRO_HOLDER);
        newRifProToken.approve(address(rifBucket), qTC);
        uint256 redeemOperId = rifBucket.redeemTC{ value: redeemExecFee }(qTC, 0, RIF_PRO_HOLDER, address(0));
        vm.stopPrank();

        assertGt(redeemOperId, mintOperId, "redeemTC should be queued after mintTC");
        _mineUntilQueueCanExecute();

        _executeRifQueue();

        assertEq(
            newRifProToken.balanceOf(RIF_PRO_HOLDER),
            holderRifProBalanceBefore,
            "holder minted RIFPro should be redeemed"
        );
        assertGt(
            rifToken.balanceOf(RIF_PRO_HOLDER),
            holderRifBalanceBeforeRedeem,
            "holder should receive redeemed RIF"
        );
        assertEq(rifBucket.nTCcb(), nTCcbBefore, "nTCcb should return after redeemTC execution");
    }

    function _deployRifProToken(IGovernor governor_) internal returns (MocRC20) {
        MocRC20 token = _deployRifProTokenWithoutBucketRoles(governor_);
        token.grantRole(DEFAULT_ADMIN_ROLE, address(rifBucket));
        token.grantRole(MINTER_ROLE, address(rifBucket));
        token.grantRole(BURNER_ROLE, address(rifBucket));
        return token;
    }

    function _deployRifProTokenWithoutBucketRoles(IGovernor governor_) internal returns (MocRC20) {
        MocRC20 implementation = new MocRC20();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeCall(MocRC20.initialize, ("RIFPro Token", "RIFP", address(this), governor_))
        );
        MocRC20 token = MocRC20(address(proxy));
        return token;
    }

    function _executeChanger() internal {
        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(governorOwner);
        governor.executeChange(IChangeContract(address(changer)));
    }

    function _rifProHolderLegacyBalance() internal view returns (uint256 legacyAmount) {
        legacyAmount = legacyRifProToken.balanceOf(RIF_PRO_HOLDER);
        assertGt(legacyAmount, 0, "holder should have legacy RIFPro balance in fork");
    }

    function _newAmount(TokenMigrator tokenMigrator_, uint256 legacyAmount_) internal view returns (uint256) {
        return (legacyAmount_ * tokenMigrator_.migrationRate()) / tokenMigrator_.MIGRATION_RATE_PRECISION();
    }

    function _migratorBalances(
        TokenMigrator tokenMigrator_
    ) internal view returns (uint256 legacyBalance, uint256 newBalance) {
        legacyBalance = legacyRifProToken.balanceOf(address(tokenMigrator_));
        newBalance = newRifProToken.balanceOf(address(tokenMigrator_));
    }

    function _execFee(MocQueueExecFees.OperType operType_) internal view returns (uint256) {
        return MocQueueExecFees(rifBucket.mocQueue()).getExecFee(operType_);
    }

    function _mocMultiCollateralGuard() internal view returns (MocMultiCollateralGuard) {
        return MocMultiCollateralGuard(payable(MocQueueExecFees(rifBucket.mocQueue()).mocMultiCollateralGuard()));
    }

    function _mineUntilQueueCanExecute() internal {
        uint256 minOperWaitingBlk = MocQueue(payable(rifBucket.mocQueue())).minOperWaitingBlk();
        vm.roll(block.number + minOperWaitingBlk + 1);
    }

    function _executeRifQueue() internal {
        _mocMultiCollateralGuard().execute();
    }
}
