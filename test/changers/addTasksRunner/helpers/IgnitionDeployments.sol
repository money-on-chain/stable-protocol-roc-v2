// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";

abstract contract IgnitionDeployments is Test {
    string constant DEPLOYED_ADDRESSES_PATH = "test/changers/addTasksRunner/fixtures/deployed-addresses.json";
    string constant ADDRESS_BOOK_PATH = "addressBook.json";

    mapping(string => address) public deployedAddresses;
    bool public addressesLoaded;

    function _loadDeployedAddresses() internal {
        if (addressesLoaded) return;

        string memory json = vm.readFile(DEPLOYED_ADDRESSES_PATH);
        bytes memory jsonBytes = bytes(json);
        require(jsonBytes.length > 0, "Deployed addresses file is empty");

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

    function getMainnetAddress(string memory key) public view returns (address) {
        return _getAddressBookAddress("mainnet", key);
    }

    function getTestnetAddress(string memory key) public view returns (address) {
        return _getAddressBookAddress("testnet", key);
    }

    function _getAddressBookAddress(string memory network, string memory key) internal view returns (address) {
        string memory json = vm.readFile(ADDRESS_BOOK_PATH);
        return vm.parseJsonAddress(json, string.concat(".", network, ".", key));
    }
}
