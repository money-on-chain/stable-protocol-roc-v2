// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IChangeContract } from "moc-main-latest/contracts/interfaces/IChangeContract.sol";
import { IDataProvider } from "moc-main-latest/contracts/interfaces/IDataProvider.sol";

interface IUpgradeDelegator {
    function upgrade(address proxy, address newImplementation) external;
}

interface IOracleManager {
    function getCoinPairCount() external view returns (uint256);
    function getCoinPairAtIndex(uint256 i) external view returns (bytes32);
    function getContractAddress(bytes32 coinPair) external view returns (address);
    function unregisterCoinPair(bytes32 coinPair, uint256 hint) external;
    function registerCoinPair(bytes32 coinPair, address addr) external;
}

interface ICoinPairPrice {
    function addPriceQueryModeWhitelist(address _account) external;
}

interface IMocSwapperV3MultiHop {
    function setPath(
        address tokenA_,
        address tokenB_,
        address[] memory intermediateTokens_,
        uint24[] memory fees_,
        IDataProvider providerSwappingAtoB_
    ) external;

    function maxAmountToSwapProviders(address tokenIn_, address tokenOut_) external view returns (IDataProvider);
}

/**
 * @title PreTasksRunnerChanger
 * @notice ChangeContract used to:
 *   1. Upgrade OracleManager and all registered CoinPairPrice proxies to new implementations
 *   2. Unregister deprecated CoinPairs at indices 1, 3 and 4 from OracleManager
 *   3. Add pauser address to the priceQueryMode whitelist on the 2 remaining CoinPairs (BTCUSD and RIFUSD)
 *   4. Register the new TasksRunner proxy as a coinpair in OracleManager
 *   5. Set the RIF <-> MoC paths on the MocSwapper, preserving its existing providers
 */
contract PreTasksRunnerChanger is IChangeContract {
    address public immutable oracleManagerProxy;
    IUpgradeDelegator public immutable upgradeDelegator;

    address public immutable newOracleManagerImplementation;
    address public immutable newCoinPairImplementation;

    address public immutable multiSigCoinPairPauser;

    address public immutable tasksRunnerProxy;
    bytes32 public immutable tasksRunnerName;

    IMocSwapperV3MultiHop public immutable mocSwapper;
    address public immutable rifToken;
    address public immutable mocToken;

    address[] public rifToMocIntermediateTokens;
    uint24[] public rifToMocFees;
    address[] public mocToRifIntermediateTokens;
    uint24[] public mocToRifFees;

    address[] public coinPairProxies;

    constructor(
        address _oracleManagerProxy,
        IUpgradeDelegator _upgradeDelegator,
        address _newOracleManagerImplementation,
        address _newCoinPairImplementation,
        address _multiSigCoinPairPauser,
        address _tasksRunnerProxy,
        bytes32 _tasksRunnerName,
        address _mocSwapper,
        address _rifToken,
        address _mocToken,
        address[] memory _rifToMocIntermediateTokens,
        uint24[] memory _rifToMocFees,
        address[] memory _mocToRifIntermediateTokens,
        uint24[] memory _mocToRifFees
    ) {
        oracleManagerProxy = _oracleManagerProxy;
        upgradeDelegator = _upgradeDelegator;
        newOracleManagerImplementation = _newOracleManagerImplementation;
        newCoinPairImplementation = _newCoinPairImplementation;
        multiSigCoinPairPauser = _multiSigCoinPairPauser;
        tasksRunnerProxy = _tasksRunnerProxy;
        tasksRunnerName = _tasksRunnerName;
        mocSwapper = IMocSwapperV3MultiHop(_mocSwapper);
        rifToken = _rifToken;
        mocToken = _mocToken;
        rifToMocIntermediateTokens = _rifToMocIntermediateTokens;
        rifToMocFees = _rifToMocFees;
        mocToRifIntermediateTokens = _mocToRifIntermediateTokens;
        mocToRifFees = _mocToRifFees;

        // Read all CoinPair proxies from OracleManager at construction time
        IOracleManager om = IOracleManager(_oracleManagerProxy);
        uint256 count = om.getCoinPairCount();
        for (uint256 i = 0; i < count; i++) {
            bytes32 coinPair = om.getCoinPairAtIndex(i);
            address proxy = om.getContractAddress(coinPair);
            coinPairProxies.push(proxy);
        }
    }

    function execute() external {
        if (address(mocSwapper) != address(0)) {
            // Only for mainnet
            _setMocSwapperPaths();
        }
        _beforeUpgrade();
        _upgrade();
        _afterUpgrade();
    }

    function _setMocSwapperPaths() internal {
        IDataProvider rifToMocProvider = mocSwapper.maxAmountToSwapProviders(rifToken, mocToken);
        IDataProvider mocToRifProvider = mocSwapper.maxAmountToSwapProviders(mocToken, rifToken);

        mocSwapper.setPath(rifToken, mocToken, rifToMocIntermediateTokens, rifToMocFees, rifToMocProvider);
        mocSwapper.setPath(mocToken, rifToken, mocToRifIntermediateTokens, mocToRifFees, mocToRifProvider);
    }

    function _beforeUpgrade() internal virtual {}

    /**
     * @notice Upgrades OracleManager and all CoinPairPrice proxies.
     * @dev All CoinPairs are upgraded before the unregister step so that
     *      forceCloseRound (called internally by unregisterCoinPair) succeeds
     *      with the new implementation.
     */
    function _upgrade() internal virtual {
        upgradeDelegator.upgrade(oracleManagerProxy, newOracleManagerImplementation);
        for (uint256 i = 0; i < coinPairProxies.length; i++) {
            upgradeDelegator.upgrade(coinPairProxies[i], newCoinPairImplementation);
        }
    }

    /**
     * @notice Unregisters deprecated CoinPairs from the OracleManager, adds
     *         the pauser address to the priceQueryMode whitelist on the 2 remaining
     *         CoinPairs (BTCUSD and RIFUSD), and registers the new TasksRunner proxy.
     * @dev Indices are read and unregistered in descending order (4, 3, 1) to avoid
     *      index shifting caused by the internal array compaction after each removal.
     */
    function _afterUpgrade() internal virtual {
        IOracleManager om = IOracleManager(oracleManagerProxy);

        // Read all target coinpairs before any removal to avoid index drift
        bytes32 cp4 = om.getCoinPairAtIndex(4); // USDCO
        bytes32 cp3 = om.getCoinPairAtIndex(3); // USDARS
        bytes32 cp1 = om.getCoinPairAtIndex(1); // RIFBTC

        // Unregister in descending index order
        om.unregisterCoinPair(cp4, 4); // USDCO
        om.unregisterCoinPair(cp3, 3); // USDARS
        om.unregisterCoinPair(cp1, 1); // RIFBTC

        // Add pauser to the priceQueryMode whitelist on the 2 remaining CoinPairs
        uint256 remainingCount = om.getCoinPairCount();
        for (uint256 i = 0; i < remainingCount; i++) {
            bytes32 coinPair = om.getCoinPairAtIndex(i);
            address proxy = om.getContractAddress(coinPair);
            ICoinPairPrice(proxy).addPriceQueryModeWhitelist(multiSigCoinPairPauser);
        }

        // Register the new TasksRunner proxy as a coinpair in OracleManager
        om.registerCoinPair(tasksRunnerName, tasksRunnerProxy);
    }
}
