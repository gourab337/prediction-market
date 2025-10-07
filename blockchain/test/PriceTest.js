const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AMMPool Price Calculation", function () {
  let usdc, ammPool, deployer, user;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);

    // Deploy AMMPool
    const AMMPool = await ethers.getContractFactory("AMMPool");
    ammPool = await AMMPool.deploy(usdc.address, deployer.address, true);

    // Mint USDC to deployer and user
    await usdc.mint(deployer.address, ethers.utils.parseUnits("1000000", 6));
    await usdc.mint(user.address, ethers.utils.parseUnits("1000000", 6));
  });

  it("should return 0 price when no liquidity", async function () {
    const price = await ammPool.getPrice();
    expect(price).to.equal(0);
  });

  it("should calculate correct price after adding liquidity", async function () {
    // Add $10 USDC liquidity
    const liquidityAmount = ethers.utils.parseUnits("10", 6); // 10 USDC
    await usdc.approve(ammPool.address, liquidityAmount);
    await ammPool.addLiquidity(liquidityAmount);

    // Check price (should be ~$1.00 per share initially)
    const price = await ammPool.getPrice();
    console.log("Price after $10 liquidity:", ethers.utils.formatUnits(price, 6));
    
    // Price should be 1 USDC (1,000,000 with 6 decimals)
    expect(price).to.equal(ethers.utils.parseUnits("1", 6));
  });

  it("should show realistic price changes after swaps", async function () {
    // Add $10 USDC liquidity
    const liquidityAmount = ethers.utils.parseUnits("10", 6);
    await usdc.approve(ammPool.address, liquidityAmount);
    await ammPool.addLiquidity(liquidityAmount);

    console.log("Initial price:", ethers.utils.formatUnits(await ammPool.getPrice(), 6));

    // Simulate a $5 bet (swap)
    const betAmount = ethers.utils.parseUnits("5", 6);
    await usdc.connect(user).approve(ammPool.address, betAmount);
    await usdc.connect(user).transfer(ammPool.address, betAmount);
    await ammPool.swapIn(betAmount, user.address);

    const priceAfterBet = await ammPool.getPrice();
    console.log("Price after $5 bet:", ethers.utils.formatUnits(priceAfterBet, 6));

    // Price should have changed and be non-zero
    expect(priceAfterBet).to.be.gt(0);
    expect(priceAfterBet).to.not.equal(ethers.utils.parseUnits("1", 6));

    // Get reserve info
    const [usdcReserve, sharesReserve, totalShares, currentPrice] = await ammPool.getReserveInfo();
    console.log("USDC Reserve:", ethers.utils.formatUnits(usdcReserve, 6));
    console.log("Total Shares:", ethers.utils.formatUnits(totalShares, 18));
    console.log("Current Price:", ethers.utils.formatUnits(currentPrice, 6));
  });
});