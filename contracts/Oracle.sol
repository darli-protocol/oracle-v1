// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Oracle is Ownable {
    IERC20 public immutable governanceToken;
    //address public immutable governanceToken;
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public votes;
    uint256 public totalStaked;
    uint256 public totalPrice;
    uint256 public voteCount;
    uint256 public averagePrice;

    // TWAP variables
    uint256 public cumulativePriceTime; // Accumulated price * time
    uint256 public lastUpdatedTimestamp; // Last update time
    uint256 public cumulativeTime; // Total accumulated time

    event Staked(address indexed user, uint256 amount);
    event PriceVoted(address indexed user, uint256 price);
    event Unstaked(address indexed user, uint256 amount);
    event TWAPReset(uint256 timestamp);

    constructor(
        address _governanceToken,
        address initialOwner
    ) Ownable(initialOwner) {
        governanceToken = IERC20(_governanceToken);
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Stake amount must be greater than zero");
        governanceToken.transferFrom(msg.sender, address(this), amount);

        if (stakes[msg.sender] == 0) {
            voteCount++;
        }

        stakes[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient stake to unstake");

        totalStaked -= amount;
        stakes[msg.sender] -= amount;

        if (stakes[msg.sender] == 0) {
            voteCount--;
            totalPrice -= votes[msg.sender] * stakes[msg.sender];
            delete votes[msg.sender];
            delete stakes[msg.sender];
        } else {
            totalPrice -= votes[msg.sender] * amount;
        }

        governanceToken.transfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function vote(uint256 price) external {
        require(stakes[msg.sender] > 0, "Must stake tokens to vote");

        uint256 weight = stakes[msg.sender];

        uint256 currentTimestamp = block.timestamp;
        uint256 timeElapsed;
        if (lastUpdatedTimestamp > 0) {
            timeElapsed = currentTimestamp - lastUpdatedTimestamp;
        }

        // Update cumulative values for TWAP
        cumulativePriceTime += averagePrice * timeElapsed; // Use previous average price
        cumulativeTime += timeElapsed;
        lastUpdatedTimestamp = currentTimestamp;

        totalPrice =
            totalPrice +
            (price * weight) -
            (votes[msg.sender] * weight);
        averagePrice = totalPrice / totalStaked;
        votes[msg.sender] = price;

        emit PriceVoted(msg.sender, price);
    }

    function getAveragePrice() external view returns (uint256) {
        require(totalStaked > 0, "No staked tokens");
        return averagePrice;
    }

    function getVoteCount() external view returns (uint256) {
        return voteCount;
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function getStakedVoter(address voter) external view returns (uint256) {
        return stakes[voter];
    }

    function getPriceVoter(address voter) external view returns (uint256) {
        return votes[voter];
    }

    function getTWAP() public view returns (uint256) {
        require(cumulativeTime > 0, "No Elapsed time");
        return cumulativePriceTime / cumulativeTime;
    }

    function getLastUpdateTime() public view returns (uint256) {
        return lastUpdatedTimestamp;
    }

    function resetTWAP() public onlyOwner {
        cumulativePriceTime = 0;
        cumulativeTime = 0;
        lastUpdatedTimestamp = block.timestamp;

        emit TWAPReset(block.timestamp);
    }
}
