// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LaunchToken} from "./LaunchToken.sol";
import {IUniswapV2Factory, IUniswapV2Pair, IWETH} from "./interfaces/IUniswapV2.sol";

/// @title Launchpad
/// @notice pump.fun-style token launchpad. Anyone can create a token; it trades against ETH on a
///         constant-product bonding curve with virtual reserves. When the curve's sale supply is
///         sold out the curve "graduates": the raised ETH and the remaining tokens are added as
///         liquidity to a Uniswap V2-compatible DEX and the LP tokens are burned.
contract Launchpad is Ownable, ReentrancyGuard {
    struct Params {
        uint256 totalSupply; // tokens minted per launch
        uint256 saleSupply; // tokens sold on the curve; the rest is reserved for DEX liquidity
        uint256 virtualEth; // initial virtual ETH reserve
        uint256 virtualToken; // initial virtual token reserve (must be > saleSupply)
        uint16 tradeFeeBps; // fee on every buy/sell, in basis points
        uint256 creationFee; // flat ETH fee for creating a token
        uint256 migrationFee; // ETH taken from the raised amount at graduation
    }

    struct Curve {
        address creator;
        uint256 virtualEth;
        uint256 virtualToken;
        uint256 realEth; // ETH actually held for this curve
        uint256 realToken; // curve tokens still for sale
        uint256 reserveToken; // tokens reserved for DEX liquidity
        bool complete; // sale supply sold out, trading on the curve stopped
        bool migrated; // liquidity moved to the DEX
        uint64 createdAt;
        string imageURI;
        string description;
    }

    uint16 public constant MAX_FEE_BPS = 500; // 5%
    uint256 private constant BPS = 10_000;
    address private constant DEAD = 0x000000000000000000000000000000000000dEaD;

    Params public params;
    address public feeRecipient;
    IUniswapV2Factory public dexFactory;
    IWETH public weth;

    mapping(address => Curve) private curves;
    address[] public allTokens;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string imageURI,
        string description,
        uint256 timestamp
    );
    event Trade(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 fee,
        uint256 virtualEth,
        uint256 virtualToken,
        uint256 realEth,
        uint256 timestamp
    );
    event CurveCompleted(address indexed token, uint256 realEth, uint256 timestamp);
    event Migrated(address indexed token, address indexed pair, uint256 ethLiquidity, uint256 tokenLiquidity);
    event ParamsUpdated(Params params);
    event FeeRecipientUpdated(address feeRecipient);
    event DexUpdated(address factory, address weth);

    error UnknownToken();
    error CurveComplete();
    error CurveNotComplete();
    error AlreadyMigrated();
    error DexNotConfigured();
    error InsufficientPayment();
    error ZeroAmount();
    error Slippage();
    error InvalidParams();
    error InvalidMetadata();
    error EthTransferFailed();
    error OnlySelf();

    constructor(Params memory initialParams, address initialFeeRecipient, address factory, address weth_)
        Ownable(msg.sender)
    {
        _setParams(initialParams);
        feeRecipient = initialFeeRecipient == address(0) ? msg.sender : initialFeeRecipient;
        dexFactory = IUniswapV2Factory(factory);
        weth = IWETH(weth_);
    }

    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------

    /// @notice Create a new token. Any ETH sent beyond the creation fee buys tokens for the creator.
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageURI,
        string calldata description,
        uint256 minTokensOut
    ) external payable nonReentrant returns (address token) {
        uint256 nameLen = bytes(name).length;
        uint256 symbolLen = bytes(symbol).length;
        if (nameLen == 0 || nameLen > 32 || symbolLen == 0 || symbolLen > 10) revert InvalidMetadata();
        if (bytes(imageURI).length > 512 || bytes(description).length > 1000) revert InvalidMetadata();

        Params memory p = params;
        if (msg.value < p.creationFee) revert InsufficientPayment();

        token = address(new LaunchToken(name, symbol, p.totalSupply, address(this)));

        Curve storage c = curves[token];
        c.creator = msg.sender;
        c.virtualEth = p.virtualEth;
        c.virtualToken = p.virtualToken;
        c.realToken = p.saleSupply;
        c.reserveToken = p.totalSupply - p.saleSupply;
        c.createdAt = uint64(block.timestamp);
        c.imageURI = imageURI;
        c.description = description;
        allTokens.push(token);

        emit TokenCreated(token, msg.sender, name, symbol, imageURI, description, block.timestamp);

        if (p.creationFee > 0) _sendEth(feeRecipient, p.creationFee);

        uint256 buyValue = msg.value - p.creationFee;
        if (buyValue > 0) {
            _buy(token, msg.sender, buyValue, minTokensOut);
        }
    }

    // ------------------------------------------------------------------
    // Trade
    // ------------------------------------------------------------------

    /// @notice Buy tokens with ETH. If the purchase sells out the curve, unused ETH is refunded.
    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _buy(token, msg.sender, msg.value, minTokensOut);
    }

    /// @notice Sell tokens back to the curve for ETH. No approval needed.
    function sell(address token, uint256 tokenAmount, uint256 minEthOut) external nonReentrant {
        Curve storage c = _curve(token);
        if (c.complete) revert CurveComplete();
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 ethOut = (c.virtualEth * tokenAmount) / (c.virtualToken + tokenAmount);
        if (ethOut > c.realEth) ethOut = c.realEth;
        uint256 fee = (ethOut * params.tradeFeeBps) / BPS;
        uint256 net = ethOut - fee;
        if (net < minEthOut || net == 0) revert Slippage();

        c.virtualEth -= ethOut;
        c.virtualToken += tokenAmount;
        c.realEth -= ethOut;
        c.realToken += tokenAmount;

        LaunchToken(token).transferFrom(msg.sender, address(this), tokenAmount);

        emit Trade(
            token, msg.sender, false, net, tokenAmount, fee, c.virtualEth, c.virtualToken, c.realEth, block.timestamp
        );

        if (fee > 0) _sendEth(feeRecipient, fee);
        _sendEth(msg.sender, net);
    }

    function _buy(address token, address buyer, uint256 value, uint256 minTokensOut) private {
        Curve storage c = _curve(token);
        if (c.complete) revert CurveComplete();

        uint16 feeBps = params.tradeFeeBps;
        // Split `value` into curve input and fee so that fee = ethIn * feeBps / BPS.
        uint256 ethIn = (value * BPS) / (BPS + feeBps);
        uint256 tokensOut = (c.virtualToken * ethIn) / (c.virtualEth + ethIn);

        if (tokensOut >= c.realToken) {
            // Sells out the curve: buy exactly what is left and refund the rest.
            tokensOut = c.realToken;
            ethIn = _ceilDiv(c.virtualEth * tokensOut, c.virtualToken - tokensOut);
        }
        if (tokensOut == 0 || tokensOut < minTokensOut) revert Slippage();

        uint256 fee = (ethIn * feeBps) / BPS;
        uint256 cost = ethIn + fee;
        if (cost > value) revert InsufficientPayment();

        c.virtualEth += ethIn;
        c.virtualToken -= tokensOut;
        c.realEth += ethIn;
        c.realToken -= tokensOut;

        LaunchToken(token).transfer(buyer, tokensOut);

        emit Trade(token, buyer, true, ethIn, tokensOut, fee, c.virtualEth, c.virtualToken, c.realEth, block.timestamp);

        if (fee > 0) _sendEth(feeRecipient, fee);
        if (value > cost) _sendEth(buyer, value - cost);

        if (c.realToken == 0) {
            c.complete = true;
            emit CurveCompleted(token, c.realEth, block.timestamp);
            if (address(dexFactory) != address(0) && address(weth) != address(0)) {
                // A failed migration must not undo the buy; anyone can retry via migrate().
                try this.migrateFromSelf(token) {} catch {}
            }
        }
    }

    // ------------------------------------------------------------------
    // Graduation
    // ------------------------------------------------------------------

    /// @notice Move a completed curve's liquidity to the DEX. Callable by anyone.
    function migrate(address token) external nonReentrant {
        _migrate(token);
    }

    /// @dev External entry used with try/catch during the buy that completes the curve.
    function migrateFromSelf(address token) external {
        if (msg.sender != address(this)) revert OnlySelf();
        _migrate(token);
    }

    function _migrate(address token) private {
        Curve storage c = _curve(token);
        if (!c.complete) revert CurveNotComplete();
        if (c.migrated) revert AlreadyMigrated();
        if (address(dexFactory) == address(0) || address(weth) == address(0)) revert DexNotConfigured();

        uint256 fee = params.migrationFee;
        if (fee > c.realEth) fee = c.realEth;
        uint256 ethLiquidity = c.realEth - fee;

        // Seed the pool at the curve's final price; burn any reserve tokens left over.
        uint256 tokenLiquidity = (ethLiquidity * c.virtualToken) / c.virtualEth;
        if (tokenLiquidity > c.reserveToken) tokenLiquidity = c.reserveToken;
        uint256 burnAmount = c.reserveToken - tokenLiquidity;

        c.migrated = true;
        c.realEth = 0;
        c.reserveToken = 0;

        LaunchToken(token).openTrading();

        address pair = dexFactory.getPair(token, address(weth));
        if (pair == address(0)) pair = dexFactory.createPair(token, address(weth));

        // Transfer directly and mint instead of using the router, so ETH or WETH donated to the
        // pair beforehand cannot make the migration revert.
        weth.deposit{value: ethLiquidity}();
        weth.transfer(pair, ethLiquidity);
        LaunchToken(token).transfer(pair, tokenLiquidity);
        IUniswapV2Pair(pair).mint(DEAD);

        if (burnAmount > 0) LaunchToken(token).transfer(DEAD, burnAmount);
        if (fee > 0) _sendEth(feeRecipient, fee);

        emit Migrated(token, pair, ethLiquidity, tokenLiquidity);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    /// @notice Newest-first page of token addresses.
    function getTokens(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 total = allTokens.length;
        if (offset >= total) return new address[](0);
        uint256 n = total - offset;
        if (n > limit) n = limit;
        page = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            page[i] = allTokens[total - 1 - offset - i];
        }
    }

    function getCurve(address token) external view returns (Curve memory) {
        return _curve(token);
    }

    /// @notice Price of one whole token (1e18 units) in wei.
    function currentPrice(address token) external view returns (uint256) {
        Curve storage c = _curve(token);
        return (c.virtualEth * 1e18) / c.virtualToken;
    }

    /// @notice Share of the sale supply already sold, in basis points.
    function progressBps(address token) external view returns (uint256) {
        Curve storage c = _curve(token);
        uint256 sale = params.saleSupply;
        uint256 sold = sale > c.realToken ? sale - c.realToken : 0;
        return (sold * BPS) / sale;
    }

    /// @notice Quote a buy for `value` wei (fee included).
    /// @return tokensOut Tokens received.
    /// @return cost ETH actually spent including fee (less than `value` if the curve sells out).
    /// @return fee Fee portion of `cost`.
    function quoteBuy(address token, uint256 value)
        external
        view
        returns (uint256 tokensOut, uint256 cost, uint256 fee)
    {
        Curve storage c = _curve(token);
        if (c.complete || value == 0) return (0, 0, 0);
        uint16 feeBps = params.tradeFeeBps;
        uint256 ethIn = (value * BPS) / (BPS + feeBps);
        tokensOut = (c.virtualToken * ethIn) / (c.virtualEth + ethIn);
        if (tokensOut >= c.realToken) {
            tokensOut = c.realToken;
            ethIn = _ceilDiv(c.virtualEth * tokensOut, c.virtualToken - tokensOut);
        }
        fee = (ethIn * feeBps) / BPS;
        cost = ethIn + fee;
    }

    /// @notice Quote a sell of `tokenAmount`.
    /// @return ethOut ETH received after fee.
    /// @return fee Fee charged.
    function quoteSell(address token, uint256 tokenAmount) external view returns (uint256 ethOut, uint256 fee) {
        Curve storage c = _curve(token);
        if (c.complete || tokenAmount == 0) return (0, 0);
        uint256 gross = (c.virtualEth * tokenAmount) / (c.virtualToken + tokenAmount);
        if (gross > c.realEth) gross = c.realEth;
        fee = (gross * params.tradeFeeBps) / BPS;
        ethOut = gross - fee;
    }

    // ------------------------------------------------------------------
    // Admin (affects new launches only; never touches curve funds)
    // ------------------------------------------------------------------

    function setParams(Params calldata newParams) external onlyOwner {
        _setParams(newParams);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidParams();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function setDex(address factory, address weth_) external onlyOwner {
        dexFactory = IUniswapV2Factory(factory);
        weth = IWETH(weth_);
        emit DexUpdated(factory, weth_);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _setParams(Params memory p) private {
        if (
            p.totalSupply == 0 || p.saleSupply == 0 || p.saleSupply >= p.totalSupply || p.virtualEth == 0
                || p.virtualToken <= p.saleSupply || p.tradeFeeBps > MAX_FEE_BPS
        ) revert InvalidParams();
        params = p;
        emit ParamsUpdated(p);
    }

    function _curve(address token) private view returns (Curve storage c) {
        c = curves[token];
        if (c.creator == address(0)) revert UnknownToken();
    }

    function _sendEth(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }

    function _ceilDiv(uint256 a, uint256 b) private pure returns (uint256) {
        return a == 0 ? 0 : (a - 1) / b + 1;
    }
}
