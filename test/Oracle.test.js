const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Oracle Contract", function () {
  let governanceToken, oracle, owner, addr1, addr2;
  let ownerAddress, addr1Address, addr2Address;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    ownerAddress = owner.getAddress();
    addr1Address = addr1.getAddress();
    addr2Address = addr2.getAddress();
  });

  beforeEach(async function () {
    // Deploy Mock Governance Token
    const MockToken = await ethers.getContractFactory("MockToken");
    governanceToken = await MockToken.deploy();
    await governanceToken.waitForDeployment();

    // Mint tokens for test accounts
    await governanceToken.mint(ownerAddress, ethers.parseEther("1000"));
    await governanceToken.mint(addr1Address, ethers.parseEther("1000"));
    await governanceToken.mint(addr2Address, ethers.parseEther("1000"));

    // Deploy Oracle contract
    const Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.deploy(governanceToken.getAddress(), ownerAddress);
    await oracle.waitForDeployment();

    // Approve staking for test accounts
    await governanceToken.connect(addr1).approve(oracle.getAddress(), ethers.parseEther("500"));
    await governanceToken.connect(addr2).approve(oracle.getAddress(), ethers.parseEther("500"));
  });

  // Helper Functions
  const stakeTokens = async (signer, amount) => {
    await oracle.connect(signer).stake(ethers.parseEther(amount.toString()));
  };

  const votePrice = async (signer, price) => {
    await oracle.connect(signer).vote(ethers.parseEther(price.toString()));
  };

  const increaseTime = async (seconds) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  };

  it("Should allow users to stake tokens", async function () {
    await stakeTokens(addr1, 100);
    expect(await oracle.stakes(addr1Address)).to.equal(ethers.parseEther("100"));
    expect(await oracle.totalStaked()).to.equal(ethers.parseEther("100"));
  });

  it("Should allow users to vote and calculate the average price", async function () {
    await stakeTokens(addr1, 100);
    await votePrice(addr1, 200);

    await stakeTokens(addr2, 200);
    await votePrice(addr2, 300);

    const averagePrice = await oracle.getAveragePrice();
    expect(averagePrice).to.equal(ethers.parseEther("266.666666666666666666"));
  });

  it("Should handle unstaking and update voting weight correctly", async function () {
    await stakeTokens(addr1, 100);
    await votePrice(addr1, 200);

    await oracle.connect(addr1).unstake(ethers.parseEther("50"));

    expect(await oracle.stakes(addr1Address)).to.equal(ethers.parseEther("50"));
    expect(await oracle.totalStaked()).to.equal(ethers.parseEther("50"));
  });

  it("Should revert if unstaking more than staked amount", async function () {
    await stakeTokens(addr1, 100);
    await expect(oracle.connect(addr1).unstake(ethers.parseEther("200"))).to.be.revertedWith(
      "Insufficient stake to unstake"
    );
  });

  it("Should prevent voting without staking", async function () {
    await expect(votePrice(addr1, 200)).to.be.revertedWith("Must stake tokens to vote");
  });

  it("Should revert if stake amount is zero", async function () {
    await expect(oracle.connect(addr1).stake(ethers.parseEther("0"))).to.be.revertedWith(
      "Stake amount must be greater than zero"
    );
  });

  it("Should update totalPrice correctly when users vote multiple times", async function () {
    await stakeTokens(addr1, 100);
    await votePrice(addr1, 200);
    await votePrice(addr1, 300);

    expect(await oracle.getAveragePrice()).to.equal(ethers.parseEther("300"));
  });

  it("Should return accurate vote count after staking and unstaking", async function () {
    await stakeTokens(addr1, 100);
    await votePrice(addr1, 200);

    await stakeTokens(addr2, 200);
    await votePrice(addr2, 300);

    expect(await oracle.getVoteCount()).to.equal(2);

    await oracle.connect(addr2).unstake(ethers.parseEther("200"));
    expect(await oracle.getVoteCount()).to.equal(1);
  });

  it("Should allow only the owner to reset TWAP", async function () {
    await expect(oracle.connect(addr1).resetTWAP()).to.be.revertedWithCustomError(
      oracle,
      "OwnableUnauthorizedAccount"
    );
    await expect(oracle.resetTWAP()).to.not.be.reverted;
  });

  it("Should calculate TWAP correctly", async function () {
    await stakeTokens(addr1, 500);
    await votePrice(addr1, 3000);

    await increaseTime(200); // Simulate time passage
    await votePrice(addr1, 3200);

    await increaseTime(50); // More time passage
    await votePrice(addr1, 3150);

    const twap = await oracle.getTWAP();
    expect(twap).to.be.closeTo(ethers.parseEther("3040"), ethers.parseEther("1"));
  });

  it("Should reset TWAP correctly", async function () {
    await stakeTokens(addr1, 500);
    await votePrice(addr1, 3300);

    await increaseTime(200);
    await votePrice(addr1, 3200);

    await oracle.resetTWAP(); // Reset TWAP
    
    await votePrice(addr1, 3000);
    await increaseTime(200);
    await votePrice(addr1, 3200);
    await increaseTime(50);
    await votePrice(addr1, 3150);
    const twap = await oracle.getTWAP();
    expect(twap).to.be.closeTo(ethers.parseEther("3040"), ethers.parseEther("2"));
  });

  it("Should accurately track staked tokens and vote prices by voter", async function () {
    await stakeTokens(addr1, 100);
    await votePrice(addr1, 200);

    await stakeTokens(addr2, 200);
    await votePrice(addr2, 300);

    expect(await oracle.getStakedVoter(addr1.address)).to.equal(ethers.parseEther("100"));
    expect(await oracle.getPriceVoter(addr1.address)).to.equal(ethers.parseEther("200"));
  });

  it("Should return correct total staked tokens", async function () {
    await stakeTokens(addr1, 100);
    await stakeTokens(addr2, 250);

    expect(await oracle.getTotalStaked()).to.equal(ethers.parseEther("350"));
  });

  it("Should return accurate last update timestamp", async function () {
    await stakeTokens(addr1, 100);
    await votePrice(addr1, 200);

    const block = await ethers.provider.getBlock("latest");
    const lastUpdateTime = await oracle.getLastUpdateTime();

    expect(lastUpdateTime).to.equal(block.timestamp);
  });
});
