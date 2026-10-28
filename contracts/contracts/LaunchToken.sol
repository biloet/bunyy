// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title LaunchToken
/// @notice Fixed-supply ERC20 created by the Launchpad. The whole supply is minted to the
///         Launchpad, which sells it along a bonding curve.
/// @dev Until the curve graduates, tokens can only move to or from the Launchpad. This stops
///      anyone from seeding a DEX pair at a bad price before the Launchpad migrates liquidity.
///      The Launchpad also never needs an approval, so selling is a single transaction.
contract LaunchToken is ERC20 {
    address public immutable launchpad;
    bool public tradingOpen;

    error TransfersLocked();
    error OnlyLaunchpad();

    constructor(string memory name_, string memory symbol_, uint256 supply, address launchpad_)
        ERC20(name_, symbol_)
    {
        launchpad = launchpad_;
        _mint(launchpad_, supply);
    }

    /// @notice Called once by the Launchpad when liquidity has moved to the DEX.
    function openTrading() external {
        if (msg.sender != launchpad) revert OnlyLaunchpad();
        tradingOpen = true;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (!tradingOpen && from != address(0) && from != launchpad && to != launchpad) {
            revert TransfersLocked();
        }
        super._update(from, to, value);
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal override {
        if (spender == launchpad) return;
        super._spendAllowance(owner, spender, value);
    }
}
