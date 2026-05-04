// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";

abstract contract IgnitionDeployments is Test {
    string constant DEPLOYED_ADDRESSES_PATH = "test/changers/addTasksRunner/fixtures/deployed-addresses.json";

    mapping(string => address) public deployedAddresses;
    bool public addressesLoaded;

    function _loadDeployedAddresses() internal {
        if (addressesLoaded) return;

        string memory json = vm.readFile(DEPLOYED_ADDRESSES_PATH);
        bytes memory jsonBytes = bytes(json);
        require(jsonBytes.length > 0, "Deployed addresses file is empty");

        _tryParseAddress(json, "MultiCollateral_MultiCollateralUpgradeChanger");
        _tryParseAddress(json, "MultiCollateral_MocQueueProxy");
        _tryParseAddress(json, "MultiCollateral_MocMultiCollateralGuardProxy");
        _tryParseAddress(json, "DocBucket_DocBucketProxy");
        _tryParseAddress(json, "FeeFlow_ReverseAuctionDOCtoMOC");
        _tryParseAddress(json, "FeeFlow_ReverseAuctionMOCtoDOC");
        _tryParseAddress(json, "FeeFlow_RocrRewardsBuffer");
        _tryParseAddress(json, "MultiCollateral_RifPriceProvider");
        _tryParseAddress(json, "MultiCollateral_RifToRbtcPriceProvider");
        _tryParseAddress(json, "Swappers_RifToDocMaxAmountProvider");

        _tryParseAddress(json, "AddTasksRunner_AddTasksRunnerChanger");
        _tryParseAddress(json, "AddTasksRunnerChanger");

        addressesLoaded = true;
    }

    function _tryParseAddress(string memory json, string memory key) internal {
        string memory selector = string.concat(".", key);
        try vm.parseJsonAddress(json, selector) returns (address addr) {
            if (addr != address(0)) {
                deployedAddresses[key] = addr;
            }
        } catch {}
    }

    function getDeployedAddress(string memory contractId) public view returns (address) {
        return deployedAddresses[contractId];
    }
}
