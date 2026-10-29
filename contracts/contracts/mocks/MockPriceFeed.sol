// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @notice Owner-updated price feed for testnets and local development, where no real oracle
///         exists for the asset. Do not use on mainnet.
contract MockPriceFeed is AggregatorV3Interface, Ownable {
    uint8 public immutable decimals;
    string public description;

    uint80 private round;
    int256 private answer;
    uint256 private updatedAt;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    constructor(string memory description_, uint8 decimals_, int256 initialAnswer) Ownable(msg.sender) {
        description = description_;
        decimals = decimals_;
        _set(initialAnswer, block.timestamp);
    }

    function setPrice(int256 newAnswer) external onlyOwner {
        _set(newAnswer, block.timestamp);
    }

    /// @dev Lets tests simulate a stale feed.
    function setPriceAt(int256 newAnswer, uint256 timestamp) external onlyOwner {
        _set(newAnswer, timestamp);
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (round, answer, updatedAt, updatedAt, round);
    }

    function _set(int256 newAnswer, uint256 timestamp) private {
        round++;
        answer = newAnswer;
        updatedAt = timestamp;
        emit AnswerUpdated(newAnswer, round, timestamp);
    }
}
