// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Oracle is Ownable {
    IERC20 public immutable governanceToken;

    mapping(address => uint256) public stakes; // User stakes
    mapping(address => uint256) public votes; // User votes
    uint256 public totalStaked; // Total staked tokens
    uint256 public totalPrice; // Sum of price * stake
    uint256 public voteCount; // Number of active voters
    uint256 public averagePrice; // Current average price

    // TWAP variables
    uint256 public cumulativePriceTime; // Accumulated price * time
    uint256 public lastUpdatedTimestamp; // Last TWAP update time
    uint256 public cumulativeTime; // Total elapsed time

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event PriceVoted(address indexed user, uint256 price);
    event TWAPReset(uint256 timestamp);

    constructor(
        address _governanceToken,
        address initialOwner
    ) Ownable(initialOwner) {
        require(
            _governanceToken != address(0),
            "Invalid governance token address"
        );
        governanceToken = IERC20(_governanceToken);
    }

    /**
     * @dev Stake governance tokens to participate in voting.
     * @param amount The amount of tokens to stake.
     */
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

    /**
     * @dev Unstake governance tokens. Reduces voting weight and updates state.
     * @param amount The amount of tokens to unstake.
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "Unstake amount must be greater than zero");
        require(stakes[msg.sender] >= amount, "Insufficient stake to unstake");

        uint256 userStake = stakes[msg.sender];
        uint256 userVote = votes[msg.sender];

        totalStaked -= amount;
        stakes[msg.sender] -= amount;

        if (stakes[msg.sender] == 0) {
            voteCount--;
            totalPrice -= userVote * userStake;
        } else {
            totalPrice -= userVote * amount;
        }

        governanceToken.transfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Submit a price vote, updating the TWAP calculations.
     * @param price The price to vote for.
     */
    function vote(uint256 price) external {
        require(stakes[msg.sender] > 0, "Must stake tokens to vote");

        uint256 userStake = stakes[msg.sender];
        uint256 currentTimestamp = block.timestamp;

        // Calculate time since last update
        if (lastUpdatedTimestamp > 0) {
            uint256 timeElapsed = currentTimestamp - lastUpdatedTimestamp;
            cumulativePriceTime += averagePrice * timeElapsed;
            cumulativeTime += timeElapsed;
        }

        // Update average price and user vote
        totalPrice =
            totalPrice +
            (price * userStake) -
            (votes[msg.sender] * userStake);
        averagePrice = totalStaked > 0 ? totalPrice / totalStaked : 0;
        votes[msg.sender] = price;

        lastUpdatedTimestamp = currentTimestamp;

        emit PriceVoted(msg.sender, price);
    }

    /**
     * @dev Retrieve the current Time-Weighted Average Price (TWAP).
     * @return The TWAP value.
     */
    function getTWAP() external view returns (uint256) {
        require(cumulativeTime > 0, "TWAP not available yet");
        return cumulativePriceTime / cumulativeTime;
    }

    /**
     * @dev Reset TWAP data. Only callable by the contract owner.
     */
    function resetTWAP() external onlyOwner {
        cumulativePriceTime = 0;
        cumulativeTime = 0;
        lastUpdatedTimestamp = block.timestamp;

        emit TWAPReset(block.timestamp);
    }

    // Read-only functions
    function getAveragePrice() external view returns (uint256) {
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

    function getLastUpdateTime() public view returns (uint256) {
        return lastUpdatedTimestamp;
    }
}
