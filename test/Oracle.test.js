const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Oracle Contract", function () {
  let governanceToken, oracle, owner, addr1, addr2;
  let ownerAddress, addr1Address, addr2Address;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    addr1Address = await addr1.getAddress();
    addr2Address = await addr2.getAddress();
  });

  beforeEach(async function () {
    // Deploy Mock Governance Token
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    governanceToken = await MockTokenFactory.deploy();
    await governanceToken.waitForDeployment();

    // Mint tokens for test accounts
    await governanceToken.mint(ownerAddress, ethers.parseEther("1000"));
    await governanceToken.mint(addr1Address, ethers.parseEther("1000"));
    await governanceToken.mint(addr2Address, ethers.parseEther("1000"));

    // Deploy Oracle contract
    const OracleFactory = await ethers.getContractFactory("Oracle");
    oracle = await OracleFactory.deploy(await governanceToken.getAddress(), ownerAddress);
    await oracle.waitForDeployment();

    // Approve staking for test accounts
    await governanceToken.connect(addr1).approve(await oracle.getAddress(), ethers.parseEther("500"));
    await governanceToken.connect(addr2).approve(await oracle.getAddress(), ethers.parseEther("500"));
  });

  it("Should allow users to stake tokens", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    expect(await oracle.stakes(addr1Address)).to.equal(ethers.parseEther("100"));
    expect(await oracle.totalStaked()).to.equal(ethers.parseEther("100"));
  });

  it("Should allow users to vote and calculate the average price", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr2).stake(ethers.parseEther("200"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    // Expected average price: ((100 * 200) + (200 * 300)) / 300 = 266.6666...
    const averagePrice = await oracle.getAveragePrice();
    expect(averagePrice).to.equal(ethers.parseEther("266.666666666666666666"));
  });

  it("Should allow users to unstake tokens and update voting weight", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr1).unstake(ethers.parseEther("50"));

    expect(await oracle.stakes(addr1Address)).to.equal(ethers.parseEther("50"));
    expect(await oracle.totalStaked()).to.equal(ethers.parseEther("50"));
  });

  it("Should revert if unstaking more than staked amount", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await expect(
      oracle.connect(addr1).unstake(ethers.parseEther("200"))
    ).to.be.revertedWith("Insufficient stake to unstake");
  });

  it("Should prevent voting without staking", async function () {
    await expect(oracle.connect(addr1).vote(ethers.parseEther("200"))).to.be.revertedWith(
      "Must stake tokens to vote"
    );
  });

  it("Should revert if stake amount is zero", async function () {
    await expect(oracle.connect(addr1).stake(ethers.parseEther("0"))).to.be.revertedWith(
      "Stake amount must be greater than zero"
    );
  });

  it("Should update totalPrice correctly when users vote multiple times", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200")); // 100 * 200 = 20000

    await oracle.connect(addr1).vote(ethers.parseEther("300")); // 100 * 300 = 30000

    // Total price should now be updated
    expect(await oracle.getAveragePrice()).to.equal(ethers.parseEther("300"));
  });

  it("Should handle edge cases where all users unstake", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr2).stake(ethers.parseEther("200"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    await oracle.connect(addr1).unstake(ethers.parseEther("100"));
    await oracle.connect(addr2).unstake(ethers.parseEther("200"));

    await expect(oracle.getAveragePrice()).to.be.revertedWith("No staked tokens");
  });

  it("Should return the count after stake and voters", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr2).stake(ethers.parseEther("200"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    expect(await oracle.getVoteCount()).to.equal("2");
  });

  it("Should return the count after unstake", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr2).stake(ethers.parseEther("200"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    await oracle.connect(addr2).unstake(ethers.parseEther("200"));

    expect(await oracle.getVoteCount()).to.equal("1");
  });


  it("Should allow only the owner to perform owner-specific functions", async function () {
    // Example test if you add admin-only functionality in your contract.
    // Replace with real owner-only logic if implemented in the contract.
    await expect(oracle.connect(addr1).transferOwnership(addr1Address)).to.be.revertedWithCustomError(
      oracle,
      "OwnableUnauthorizedAccount"
    );
  });

  it("Should return staked tokens by voter", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr2).stake(ethers.parseEther("200"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    expect(await oracle.getStakedVoter(addr1)).to.equal(ethers.parseEther("100"));
  });

  it("Should return voted price by voter", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));
    await oracle.connect(addr1).vote(ethers.parseEther("200"));

    await oracle.connect(addr2).stake(ethers.parseEther("200"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    expect(await oracle.getPriceVoter(addr1)).to.equal(ethers.parseEther("200"));
  });

  it("Should return Toal Staked", async function () {
    await oracle.connect(addr1).stake(ethers.parseEther("100"));

    await oracle.connect(addr2).stake(ethers.parseEther("250"));
    await oracle.connect(addr2).vote(ethers.parseEther("300"));

    expect(await oracle.getTotalStaked()).to.equal(ethers.parseEther("350"));
  });

  it("should calculate TWAP correctly", async function () {
    // Stake tokens and vote on a price
    await oracle.connect(addr1).stake(ethers.parseEther("500"));
    await oracle.connect(addr1).vote(ethers.parseEther("3000"));

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [200]); // Increase time by 1 hour
    await ethers.provider.send("evm_mine"); // Mine a new block

    // Stake and vote again
    await oracle.connect(addr1).vote(ethers.parseEther("3200"));

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [50]); // Increase time by 1 hour
    await ethers.provider.send("evm_mine"); // Mine a new block

    await oracle.connect(addr1).vote(ethers.parseEther("3150"));

    // Check TWAP
    const twap = await oracle.getTWAP();
    expect(twap).to.be.closeTo(ethers.parseEther("3040"), ethers.parseEther("1")); // ~350
  });

  it("should reset TWAP", async function () {
    // Stake tokens and vote on a price
    await oracle.connect(addr1).stake(ethers.parseEther("500"));
    await oracle.connect(addr1).vote(ethers.parseEther("3300"));

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [200]); // Increase time by 1 hour
    await ethers.provider.send("evm_mine"); // Mine a new block

    // Stake and vote again
    await oracle.connect(addr1).vote(ethers.parseEther("3200"));


    // reset TWAP
    await oracle.resetTWAP();


    await oracle.connect(addr1).vote(ethers.parseEther("3000"));

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [200]); // Increase time by 1 hour
    await ethers.provider.send("evm_mine"); // Mine a new block

    // Stake and vote again
    await oracle.connect(addr1).vote(ethers.parseEther("3200"));


    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [50]); // Increase time by 1 hour
    await ethers.provider.send("evm_mine"); // Mine a new block

    await oracle.connect(addr1).vote(ethers.parseEther("3150"));

    // Check TWAP
    const twap = await oracle.getTWAP();
    expect(twap).to.be.closeTo(ethers.parseEther("3040"), ethers.parseEther("2")); // ~350
  });
});
