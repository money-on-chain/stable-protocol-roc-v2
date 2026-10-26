// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { MocCARC20 } from "moc-main-latest/contracts/collateral/rc20/MocCARC20.sol";

/**
  @title FixInfinityAndDOCRNameChanger
  @notice Sets DOC bucket time spans to `type(uint256).max / 2` to represent infinity safely
 */
contract FixInfinityAndDOCRNameChanger is IChangeContract {
    uint256 public constant HALF_INFINITY = type(uint256).max / 2;

    MocCARC20 public immutable docBucket;

    constructor(MocCARC20 docBucket_) {
        docBucket = docBucket_;
    }

    function execute() external {
        docBucket.setTCInterestParams(
            docBucket.tcInterestCollectorAddress(),
            docBucket.tcInterestRate(),
            HALF_INFINITY
        );
        docBucket.setSettlementTimeSpan(HALF_INFINITY);
        docBucket.setEmaCalculationTimeSpan(HALF_INFINITY);
    }
}
