// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

/// @title IndexVault
/// @notice Synthetic, ETH-settled indexes of oracle-priced assets (e.g. tokenized stocks).
///
///         Each index tracks a weighted basket. Its level starts at 1,000 and moves with the
///         weighted return of its components since launch:
///             level = 1000 * sum(weight_i * price_i / basePrice_i)
///
///         Users open a position by depositing ETH. On close they receive
///             principal * exitLevel / entryLevel
///         capped at `maxPayoutBps` of principal, minus the trade fee. The vault's ETH reserves
///         are the counterparty: they pay out gains and keep losses and fees. Every open position
///         reserves enough ETH to pay its maximum payout, so the vault can always settle.
contract IndexVault is Ownable, ReentrancyGuard {
    struct Component {
        AggregatorV3Interface feed;
        uint16 weightBps; // share of the index, all components sum to 10_000
        int256 basePrice; // feed answer when the index launched
    }

    struct IndexInfo {
        string name;
        string symbol;
        string description;
        uint64 launchedAt;
        bool active; // new positions allowed
        uint256 openInterest; // principal in open positions
    }

    struct Position {
        address owner;
        uint32 indexId;
        bool open;
        uint64 openedAt;
        uint256 principal;
        uint256 entryLevel;
    }

    struct Params {
        uint16 feeBps; // charged on open (on principal) and on close (on payout)
        uint32 maxPayoutBps; // payout cap, e.g. 30_000 = 3x principal
        uint256 minPrincipal;
        uint256 walletPrincipalLimit; // max open principal per wallet per index
        uint32 maxPriceAge; // seconds before a feed answer counts as stale
        uint32 emergencyDelay; // seconds of stale prices after which principal can be refunded
    }

    uint256 public constant BASE_LEVEL = 1000e18;
    uint256 private constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 200; // 2%
    uint256 public constant MAX_COMPONENTS = 10;

    Params public params;

    /// @notice ETH owned by the vault (excludes users' principal).
    uint256 public reserves;
    /// @notice Principal in all open positions across indexes.
    uint256 public totalOpenInterest;
    /// @notice Reserves set aside to cover the maximum payout of all open positions.
    uint256 public lockedReserves;

    IndexInfo[] private indexes;
    mapping(uint256 => Component[]) private components;
    Position[] private positions;
    mapping(address => uint256[]) private positionIdsOf;
    mapping(uint256 => mapping(address => uint256)) public walletPrincipal;

    event IndexCreated(uint256 indexed indexId, string name, string symbol);
    event IndexActiveSet(uint256 indexed indexId, bool active);
    event LevelCheckpoint(uint256 indexed indexId, uint256 level, uint256 timestamp);
    event PositionOpened(
        uint256 indexed positionId,
        address indexed owner,
        uint256 indexed indexId,
        uint256 principal,
        uint256 entryLevel,
        uint256 fee,
        uint256 timestamp
    );
    event PositionClosed(
        uint256 indexed positionId,
        address indexed owner,
        uint256 indexed indexId,
        uint256 principal,
        uint256 payout,
        uint256 exitLevel,
        uint256 fee,
        uint256 timestamp
    );
    event EmergencyRefund(uint256 indexed positionId, address indexed owner, uint256 principal);
    event ReservesFunded(address indexed from, uint256 amount);
    event ReservesWithdrawn(address indexed to, uint256 amount);
    event ParamsUpdated(Params params);

    error InvalidParams();
    error InvalidIndex();
    error IndexInactive();
    error StalePrice();
    error PriceStillValid();
    error TooSmall();
    error WalletLimit();
    error InsufficientReserves();
    error NotPositionOwner();
    error PositionClosedAlready();
    error Slippage();
    error EthTransferFailed();

    constructor(Params memory initialParams) Ownable(msg.sender) {
        _setParams(initialParams);
    }

    // ------------------------------------------------------------------
    // Trading
    // ------------------------------------------------------------------

    /// @notice Open a position in `indexId`. `msg.value` covers principal plus the open fee.
    /// @param maxEntryLevel Reverts if the index level is above this (0 to skip).
    function open(uint256 indexId, uint256 maxEntryLevel) external payable nonReentrant returns (uint256 positionId) {
        IndexInfo storage idx = _index(indexId);
        if (!idx.active) revert IndexInactive();
        (uint256 level, bool valid,) = indexLevel(indexId);
        if (!valid) revert StalePrice();
        if (maxEntryLevel != 0 && level > maxEntryLevel) revert Slippage();

        Params memory p = params;
        uint256 principal = (msg.value * BPS) / (BPS + p.feeBps);
        uint256 fee = msg.value - principal;
        if (principal < p.minPrincipal || principal == 0) revert TooSmall();

        uint256 walletTotal = walletPrincipal[indexId][msg.sender] + principal;
        if (walletTotal > p.walletPrincipalLimit) revert WalletLimit();

        // Fee goes to reserves first, then the position locks its worst-case extra payout.
        reserves += fee;
        uint256 lock = _lockFor(principal, p.maxPayoutBps);
        if (lockedReserves + lock > reserves) revert InsufficientReserves();
        lockedReserves += lock;

        walletPrincipal[indexId][msg.sender] = walletTotal;
        idx.openInterest += principal;
        totalOpenInterest += principal;

        positionId = positions.length;
        positions.push(
            Position({
                owner: msg.sender,
                indexId: uint32(indexId),
                open: true,
                openedAt: uint64(block.timestamp),
                principal: principal,
                entryLevel: level
            })
        );
        positionIdsOf[msg.sender].push(positionId);

        emit PositionOpened(positionId, msg.sender, indexId, principal, level, fee, block.timestamp);
        emit LevelCheckpoint(indexId, level, block.timestamp);
    }

    /// @notice Close a position at the current index level.
    function close(uint256 positionId, uint256 minPayout) external nonReentrant {
        Position storage pos = _ownedOpenPosition(positionId);
        (uint256 level, bool valid,) = indexLevel(pos.indexId);
        if (!valid) revert StalePrice();

        (uint256 gross, uint256 fee) = _payout(pos.principal, pos.entryLevel, level);
        uint256 net = gross - fee;
        if (net < minPayout) revert Slippage();

        uint256 principal = pos.principal;
        _release(pos);
        // Vault receives the principal and fee, pays the gross amount. The lock guarantees
        // gross <= principal + reserves.
        reserves = reserves + principal + fee - gross;

        emit PositionClosed(positionId, msg.sender, pos.indexId, principal, net, level, fee, block.timestamp);
        emit LevelCheckpoint(pos.indexId, level, block.timestamp);
        _sendEth(msg.sender, net);
    }

    /// @notice If an index's prices have been stale for `emergencyDelay`, owners can take
    ///         their principal back without a fee.
    function emergencyRefund(uint256 positionId) external nonReentrant {
        Position storage pos = _ownedOpenPosition(positionId);
        (, bool valid, uint256 oldestUpdate) = indexLevel(pos.indexId);
        if (valid || block.timestamp < oldestUpdate + params.emergencyDelay) revert PriceStillValid();

        uint256 principal = pos.principal;
        _release(pos);
        emit EmergencyRefund(positionId, msg.sender, principal);
        _sendEth(msg.sender, principal);
    }

    /// @notice Record the current level so charts have a point even without trades. Anyone can call.
    function checkpoint(uint256 indexId) external {
        (uint256 level, bool valid,) = indexLevel(indexId);
        if (!valid) revert StalePrice();
        emit LevelCheckpoint(indexId, level, block.timestamp);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice Current level of an index (18 decimals, launch = 1000e18).
    /// @return level Weighted level from the latest answers.
    /// @return valid False if any feed is stale or non-positive.
    /// @return oldestUpdate Oldest `updatedAt` among the component feeds.
    function indexLevel(uint256 indexId) public view returns (uint256 level, bool valid, uint256 oldestUpdate) {
        _index(indexId);
        Component[] storage comps = components[indexId];
        valid = true;
        oldestUpdate = type(uint256).max;
        uint256 sum;
        for (uint256 i = 0; i < comps.length; i++) {
            (int256 answer, uint256 updatedAt, bool ok) = _read(comps[i].feed);
            if (updatedAt < oldestUpdate) oldestUpdate = updatedAt;
            if (!ok) {
                valid = false;
                continue;
            }
            sum += (uint256(answer) * 1e18 * comps[i].weightBps) / uint256(comps[i].basePrice);
        }
        level = valid ? (BASE_LEVEL * sum) / (1e18 * BPS) : 0;
    }

    function indexCount() external view returns (uint256) {
        return indexes.length;
    }

    function getIndex(uint256 indexId) external view returns (IndexInfo memory info, Component[] memory comps) {
        info = _index(indexId);
        comps = components[indexId];
    }

    function getPosition(uint256 positionId) external view returns (Position memory) {
        if (positionId >= positions.length) revert InvalidIndex();
        return positions[positionId];
    }

    function positionsOf(address owner) external view returns (uint256[] memory) {
        return positionIdsOf[owner];
    }

    /// @notice Reserves available to back new positions (and withdrawable by the owner).
    function effectiveReserves() public view returns (uint256) {
        return reserves - lockedReserves;
    }

    /// @notice Largest principal that can be opened right now, given reserves (ignores wallet limit).
    function maxOpenPrincipal() external view returns (uint256) {
        uint256 extra = params.maxPayoutBps - BPS;
        return extra == 0 ? type(uint256).max : (effectiveReserves() * BPS) / extra;
    }

    /// @notice What closing a position now would pay, after fee. Zero if prices are stale.
    function quoteClose(uint256 positionId) external view returns (uint256 payout, uint256 fee, uint256 level) {
        Position storage pos = positions[positionId];
        if (!pos.open) return (0, 0, 0);
        bool valid;
        (level, valid,) = indexLevel(pos.indexId);
        if (!valid) return (0, 0, 0);
        uint256 gross;
        (gross, fee) = _payout(pos.principal, pos.entryLevel, level);
        payout = gross - fee;
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    function createIndex(
        string calldata name,
        string calldata symbol,
        string calldata description,
        AggregatorV3Interface[] calldata feeds,
        uint16[] calldata weightsBps
    ) external onlyOwner returns (uint256 indexId) {
        uint256 n = feeds.length;
        if (n == 0 || n > MAX_COMPONENTS || n != weightsBps.length) revert InvalidParams();
        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert InvalidParams();

        indexId = indexes.length;
        indexes.push(
            IndexInfo({
                name: name,
                symbol: symbol,
                description: description,
                launchedAt: uint64(block.timestamp),
                active: true,
                openInterest: 0
            })
        );

        uint256 totalWeight;
        for (uint256 i = 0; i < n; i++) {
            (int256 answer,, bool ok) = _read(feeds[i]);
            if (!ok || weightsBps[i] == 0) revert InvalidParams();
            totalWeight += weightsBps[i];
            components[indexId].push(Component({feed: feeds[i], weightBps: weightsBps[i], basePrice: answer}));
        }
        if (totalWeight != BPS) revert InvalidParams();

        emit IndexCreated(indexId, name, symbol);
        emit LevelCheckpoint(indexId, BASE_LEVEL, block.timestamp);
    }

    /// @notice Pause or resume new positions in an index. Closing is always allowed.
    function setIndexActive(uint256 indexId, bool active) external onlyOwner {
        _index(indexId).active = active;
        emit IndexActiveSet(indexId, active);
    }

    function setParams(Params calldata newParams) external onlyOwner {
        _setParams(newParams);
    }

    /// @notice Add ETH to the reserves. Anyone can fund; only the owner can withdraw.
    function fundReserves() external payable {
        reserves += msg.value;
        emit ReservesFunded(msg.sender, msg.value);
    }

    /// @notice Withdraw reserves not backing open positions.
    function withdrawReserves(uint256 amount, address to) external onlyOwner nonReentrant {
        if (amount > effectiveReserves() || to == address(0)) revert InsufficientReserves();
        reserves -= amount;
        emit ReservesWithdrawn(to, amount);
        _sendEth(to, amount);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _payout(uint256 principal, uint256 entryLevel, uint256 exitLevel)
        private
        view
        returns (uint256 gross, uint256 fee)
    {
        gross = (principal * exitLevel) / entryLevel;
        uint256 cap = (principal * params.maxPayoutBps) / BPS;
        if (gross > cap) gross = cap;
        fee = (gross * params.feeBps) / BPS;
    }

    function _release(Position storage pos) private {
        pos.open = false;
        uint256 principal = pos.principal;
        uint256 indexId = pos.indexId;
        // The lock is recomputed from current params; cap it so a params change can't underflow.
        uint256 lock = _lockFor(principal, params.maxPayoutBps);
        lockedReserves = lock > lockedReserves ? 0 : lockedReserves - lock;
        walletPrincipal[indexId][pos.owner] -= principal;
        indexes[indexId].openInterest -= principal;
        totalOpenInterest -= principal;
    }

    function _lockFor(uint256 principal, uint32 maxPayoutBps) private pure returns (uint256) {
        return (principal * (maxPayoutBps - BPS) + BPS - 1) / BPS;
    }

    function _ownedOpenPosition(uint256 positionId) private view returns (Position storage pos) {
        if (positionId >= positions.length) revert InvalidIndex();
        pos = positions[positionId];
        if (pos.owner != msg.sender) revert NotPositionOwner();
        if (!pos.open) revert PositionClosedAlready();
    }

    function _read(AggregatorV3Interface feed) private view returns (int256 answer, uint256 updatedAt, bool ok) {
        try feed.latestRoundData() returns (uint80, int256 a, uint256, uint256 u, uint80) {
            answer = a;
            updatedAt = u;
            ok = a > 0 && u != 0 && u <= block.timestamp && block.timestamp - u <= params.maxPriceAge;
        } catch {
            ok = false;
        }
    }

    function _index(uint256 indexId) private view returns (IndexInfo storage) {
        if (indexId >= indexes.length) revert InvalidIndex();
        return indexes[indexId];
    }

    function _setParams(Params memory p) private {
        // maxPayoutBps is fixed once positions exist, so locks always match what was reserved.
        if (totalOpenInterest > 0 && p.maxPayoutBps != params.maxPayoutBps) revert InvalidParams();
        if (
            p.feeBps > MAX_FEE_BPS || p.maxPayoutBps < BPS || p.maxPayoutBps > 100_000 || p.maxPriceAge == 0
                || p.walletPrincipalLimit == 0
        ) revert InvalidParams();
        params = p;
        emit ParamsUpdated(p);
    }

    function _sendEth(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
