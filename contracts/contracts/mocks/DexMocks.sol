// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Test-only stand-ins for WETH and a Uniswap V2 factory/pair.
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }
}

contract MockPair is ERC20 {
    address public immutable token0;
    address public immutable token1;
    uint256 public reserve0;
    uint256 public reserve1;

    constructor(address a, address b) ERC20("Mock LP", "MLP") {
        (token0, token1) = a < b ? (a, b) : (b, a);
    }

    function mint(address to) external returns (uint256 liquidity) {
        uint256 b0 = IERC20(token0).balanceOf(address(this));
        uint256 b1 = IERC20(token1).balanceOf(address(this));
        liquidity = _sqrt((b0 - reserve0) * (b1 - reserve1));
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        reserve0 = b0;
        reserve1 = b1;
        _mint(to, liquidity);
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

contract MockFactory {
    mapping(address => mapping(address => address)) public getPair;

    function createPair(address a, address b) external returns (address pair) {
        require(getPair[a][b] == address(0), "PAIR_EXISTS");
        pair = address(new MockPair(a, b));
        getPair[a][b] = pair;
        getPair[b][a] = pair;
    }
}

/// @dev Rejects ETH, used to make migration fail in tests.
contract RejectingReceiver {
    receive() external payable {
        revert("no");
    }
}
