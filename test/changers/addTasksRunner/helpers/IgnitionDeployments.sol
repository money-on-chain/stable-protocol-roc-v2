// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";

abstract contract IgnitionDeployments is Test {
    string constant ADDRESS_BOOK_PATH = "addressBook.json";

    mapping(string => address) public deployedAddresses;
    bool public addressesLoaded;

    function _loadDeployedAddresses() internal {
        if (addressesLoaded) return;

        string memory json = vm.readFile(_deployedAddressesPath());
        bytes memory jsonBytes = bytes(json);
        require(jsonBytes.length > 0, "Deployed addresses file is empty");

        _tryParseAddress(json, "AddTasksRunner#AddTasksRunnerChanger", "AddTasksRunnerChanger");
        _tryParseAddress(json, "AddTasksRunner#TasksRunner", "TasksRunner");

        string memory preTasksJson = vm.readFile(_preTasksDeploymentPath());
        _tryParseAddress(preTasksJson, "PreTasksRunnerModule#PreTasksRunnerChanger", "PreTasksRunnerChanger");

        addressesLoaded = true;
    }

    function _deployedAddressesPath() internal pure returns (string memory) {
        return "ignition/deployments/addTasksRunner-mainnet/deployed_addresses.json";
    }

    function _preTasksDeploymentPath() internal pure returns (string memory) {
        return "ignition/deployments/preTasksRunner-mainnet/deployed_addresses.json";
    }

    function _tryParseAddress(string memory json, string memory selectorKey, string memory contractId) internal {
        string memory selector = string.concat(".", selectorKey);
        try vm.parseJsonAddress(json, selector) returns (address addr) {
            if (addr != address(0)) {
                deployedAddresses[contractId] = addr;
            }
        } catch {}
    }

    function getAddTasksRunnerAddress(string memory json, string memory contractId) public pure returns (address) {
        return vm.parseJsonAddress(json, string.concat(".AddTasksRunner#", contractId));
    }

    function getDeployedAddress(string memory contractId) public view returns (address) {
        return deployedAddresses[contractId];
    }

    function getMainnetAddress(string memory key) public view returns (address) {
        return _getAddressBookAddress("mainnet", key);
    }

    function _getAddressBookAddress(string memory network, string memory key) internal view returns (address) {
        string memory json = vm.readFile(ADDRESS_BOOK_PATH);
        return vm.parseJsonAddress(json, string.concat(".", network, ".", key));
    }
}
