// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IgnitionDeployments } from "./IgnitionDeployments.sol";
import { MocRif } from "../../../../contracts/MocRif.sol";
import { MocQueue } from "moc-main-latest/contracts/queue/MocQueue.sol";
import { MocMultiCollateralGuard } from "moc-main-latest/contracts/multiCollateral/MocMultiCollateralGuard.sol";
import { MultiCollateralUpgradeChanger } from "../../../../contracts/changers/multiCollateralUpgrade/MultiCollateralUpgradeChanger.sol";
import { AddTasksRunnerChanger } from "../../../../contracts/changers/addTasksRunnerChanger/AddTasksRunnerChanger.sol";
import { MocRC20 } from "moc-main-latest/contracts/tokens/MocRC20.sol";
import { MocCARC20 } from "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol";
import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { IGovernor } from "moc-main-latest/contracts/interfaces/IGovernor.sol";

contract BaseFork is IgnitionDeployments {
    address constant GOVERNOR_OWNER = 0x65a5681bE95d212F0c90eAd40170D8277de81169;
    address constant HOLDER_ADDRESS = 0xe4822F07C1d988A8f2F53D1817f7e8848897b67A;
    address constant MOC_CORE_ADDRESS = 0xA27024Ed70035E46dba712609fc2Afa1c97aA36A;

    MocRif public rifBucket;
    MocQueue public rifQueue;
    MocMultiCollateralGuard public mocMultiCollateralGuard;
    MultiCollateralUpgradeChanger public multiCollateralChanger;
    AddTasksRunnerChanger public addTasksRunnerChanger;
    MocCARC20 public docBucket;

    MocRC20 public rifToken;
    MocRC20 public rifProToken;
    MocRC20 public usdRifToken;
    MocRC20 public docToken;
    MocRC20 public docProToken;

    address public holder;

    function _loadIgnitionContracts() internal {
        address mcChangerAddr = getDeployedAddress("MultiCollateral_MultiCollateralUpgradeChanger");
        require(mcChangerAddr != address(0), "MultiCollateralUpgradeChanger not deployed");
        multiCollateralChanger = MultiCollateralUpgradeChanger(mcChangerAddr);

        address addTasksChangerAddr = getDeployedAddress("AddTasksRunner_AddTasksRunnerChanger");
        if (addTasksChangerAddr == address(0)) {
            addTasksChangerAddr = getDeployedAddress("AddTasksRunnerChanger");
        }
        require(addTasksChangerAddr != address(0), "AddTasksRunnerChanger not deployed");
        addTasksRunnerChanger = AddTasksRunnerChanger(addTasksChangerAddr);

        address queueAddr = getDeployedAddress("MultiCollateral_MocQueueProxy");
        require(queueAddr != address(0), "MocQueueProxy not deployed");
        rifQueue = MocQueue(payable(queueAddr));

        address guardAddr = getDeployedAddress("MultiCollateral_MocMultiCollateralGuardProxy");
        require(guardAddr != address(0), "MocMultiCollateralGuardProxy not deployed");
        mocMultiCollateralGuard = MocMultiCollateralGuard(payable(guardAddr));

        address docBucketAddr = getDeployedAddress("DocBucket_DocBucketProxy");
        require(docBucketAddr != address(0), "DocBucketProxy not deployed");
        docBucket = MocCARC20(payable(docBucketAddr));
    }

    function setUp() public virtual {
        string memory forkUrl = vm.envOr("FORK_URL", string("http://127.0.0.1:8545"));
        vm.createSelectFork(forkUrl);

        _loadDeployedAddresses();
        _loadIgnitionContracts();

        rifBucket = MocRif(payable(MOC_CORE_ADDRESS));

        rifToken = MocRC20(address(rifBucket.acToken()));
        rifProToken = MocRC20(address(rifBucket.tcToken()));
        usdRifToken = MocRC20(address(rifBucket.tpTokens(0)));

        docToken = MocRC20(address(docBucket.acToken()));
        docProToken = MocRC20(address(docBucket.tcToken()));

        holder = HOLDER_ADDRESS;
        vm.deal(holder, 100 ether);
        vm.deal(GOVERNOR_OWNER, 100 ether);
    }

    function _executeMultiCollateralChanger() internal {
        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(GOVERNOR_OWNER);
        governor.executeChange(IChangeContract(address(multiCollateralChanger)));
    }

    function _executeAddTasksRunnerChanger() internal {
        IGovernor governor = IGovernor(address(rifBucket.governor()));
        vm.prank(GOVERNOR_OWNER);
        governor.executeChange(IChangeContract(address(addTasksRunnerChanger)));
    }
}
