// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IgnitionDeployments } from "./IgnitionDeployments.sol";
import { MocRif } from "../../../../contracts/MocRif.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocMultiCollateralGuard } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { AddTasksRunnerChanger } from "../../../../contracts/changers/addTasksRunnerChanger/AddTasksRunnerChanger.sol";
import { PreTasksRunnerChanger } from "../../../../contracts/changers/preTasksRunnerChanger/PreTasksRunnerChanger.sol";
import { MocRC20 } from "moc-main-latest/contracts/tokens/MocRC20.sol";
import { MocCARC20 } from "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol";
import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { IGovernor } from "moc-main-latest/contracts/interfaces/IGovernor.sol";
import { OracleTestHelper, IOracleCheats } from "../../../helpers/OracleTestHelper.sol";

interface IOwnableOwner {
    function owner() external view returns (address);
}

contract BaseFork is IgnitionDeployments, OracleTestHelper {
    MocRif public rifBucket;
    MocQueue public rifQueue;
    MocMultiCollateralGuard public mocMultiCollateralGuard;
    PreTasksRunnerChanger public preTasksRunnerChanger;
    AddTasksRunnerChanger public addTasksRunnerChanger;
    MocCARC20 public docBucket;

    MocRC20 public rifToken;
    MocRC20 public rifProToken;
    MocRC20 public usdRifToken;
    MocRC20 public docToken;
    MocRC20 public docProToken;

    address public holder;
    address public governorOwner;

    function _loadIgnitionContracts() internal {
        // Load PreTasksRunnerChanger
        address preTasksChangerAddr = getDeployedAddress("PreTasksRunnerChanger");
        require(preTasksChangerAddr != address(0), "PreTasksRunnerChanger not deployed");
        preTasksRunnerChanger = PreTasksRunnerChanger(preTasksChangerAddr);

        // Load AddTasksRunnerChanger
        address addTasksChangerAddr = getDeployedAddress("AddTasksRunnerChanger");
        require(addTasksChangerAddr != address(0), "AddTasksRunnerChanger not deployed");
        addTasksRunnerChanger = AddTasksRunnerChanger(addTasksChangerAddr);

        address queueAddr = _getNetworkAddress("rifQueue");
        require(queueAddr != address(0), "RifQueue not configured");
        rifQueue = MocQueue(payable(queueAddr));

        address guardAddr = _getNetworkAddress("mocMultiCollateralGuard");
        require(guardAddr != address(0), "MocMultiCollateralGuard not configured");
        mocMultiCollateralGuard = MocMultiCollateralGuard(payable(guardAddr));

        address docBucketAddr = _getNetworkAddress("docBucket");
        require(docBucketAddr != address(0), "DocBucket not configured");
        docBucket = MocCARC20(payable(docBucketAddr));
    }

    function setUp() public virtual {
        vm.createSelectFork(_forkRpcUrl(), _forkBlock());

        _loadDeployedAddresses();
        _loadIgnitionContracts();

        rifBucket = MocRif(payable(_getNetworkAddress("mocCore")));

        rifToken = MocRC20(address(rifBucket.acToken()));
        rifProToken = MocRC20(address(rifBucket.tcToken()));
        usdRifToken = MocRC20(address(rifBucket.tpTokens(0)));

        docToken = MocRC20(address(docBucket.acToken()));
        docProToken = MocRC20(address(docBucket.tcToken()));

        // These are test-only accounts. The holder does not need to exist on the
        // fork, while the governor owner is read from the live Governor contract
        // from the mainnet address book.
        holder = vm.addr(0xBEEF);
        governorOwner = IOwnableOwner(address(rifBucket.governor())).owner();
        vm.deal(holder, 100 ether);
        vm.deal(governorOwner, 100 ether);
    }

    function _executeAddTasksRunnerChanger() internal {
        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(governorOwner);
        governor.executeChange(IChangeContract(address(addTasksRunnerChanger)));
    }

    function _getNetworkAddress(string memory key) internal view returns (address) {
        return getMainnetAddress(key);
    }

    function _forkRpcUrl() internal view returns (string memory) {
        return vm.envOr("RSK_MAINNET_RPC_URL", string("https://public-node.rsk.co"));
    }

    function _forkBlock() internal view returns (uint256) {
        return vm.envOr("ADD_TASKS_RUNNER_FORK_BLOCK", uint256(9170610));
    }
}
