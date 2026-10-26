// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { TokenMigrator } from "../contracts/TokenMigrator.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address to_, uint256 amount_) external {
        _mint(to_, amount_);
    }
}

contract TokenMigratorTests is Test {
    event TokenMigrated(address indexed sender_, address indexed user_, uint256 legacyAmount_, uint256 newAmount_);

    uint256 internal constant RATE_PRECISION = 1e18;
    address internal user = address(0x1234);
    address internal operator = address(0x5678);

    ERC20Mock internal legacyToken;
    ERC20Mock internal newToken;

    function setUp() public {
        legacyToken = new ERC20Mock("Legacy Token", "LGY");
        newToken = new ERC20Mock("New Token", "NEW");
    }

    function test_MigrateTokenUsesMigrationRate() public {
        uint256 legacyAmount = 100 ether;
        uint256 migrationRate = 2 * RATE_PRECISION;
        uint256 newAmount = 200 ether;
        TokenMigrator migrator = new TokenMigrator(address(legacyToken), address(newToken), migrationRate);

        legacyToken.mint(user, legacyAmount);
        newToken.mint(address(migrator), newAmount);

        vm.prank(user);
        legacyToken.approve(address(migrator), legacyAmount);

        vm.expectEmit(true, true, false, true, address(migrator));
        emit TokenMigrated(user, user, legacyAmount, newAmount);

        vm.prank(user);
        migrator.migrateToken();

        assertEq(legacyToken.balanceOf(user), 0, "user legacy balance should be migrated");
        assertEq(legacyToken.balanceOf(address(migrator)), legacyAmount, "migrator should keep legacy tokens");
        assertEq(newToken.balanceOf(user), newAmount, "user should receive new tokens");
        assertEq(newToken.balanceOf(address(migrator)), 0, "migrator new token balance should be spent");
        assertEq(migrator._totalMigrated(), legacyAmount, "total migrated should track legacy amount");
    }

    function test_MigrateTokenFromMigratesAnotherUser() public {
        uint256 legacyAmount = 100 ether;
        uint256 migrationRate = RATE_PRECISION / 2;
        uint256 newAmount = 50 ether;
        TokenMigrator migrator = new TokenMigrator(address(legacyToken), address(newToken), migrationRate);

        legacyToken.mint(user, legacyAmount);
        newToken.mint(address(migrator), newAmount);

        vm.prank(user);
        legacyToken.approve(address(migrator), legacyAmount);

        vm.expectEmit(true, true, false, true, address(migrator));
        emit TokenMigrated(operator, user, legacyAmount, newAmount);

        vm.prank(operator);
        migrator.migrateTokenFrom(user);

        assertEq(legacyToken.balanceOf(user), 0, "user legacy balance should be migrated");
        assertEq(newToken.balanceOf(user), newAmount, "user should receive new tokens");
        assertEq(migrator._totalMigrated(), legacyAmount, "total migrated should track legacy amount");
    }

    function test_RevertWhenMigratingZeroBalance() public {
        TokenMigrator migrator = new TokenMigrator(address(legacyToken), address(newToken), RATE_PRECISION);

        vm.prank(user);
        vm.expectRevert(TokenMigrator.InsufficientLegacyTokenBalance.selector);
        migrator.migrateToken();
    }

    function test_RevertWhenMigrationRateIsZero() public {
        vm.expectRevert(TokenMigrator.InvalidMigrationRate.selector);
        new TokenMigrator(address(legacyToken), address(newToken), 0);
    }
}
