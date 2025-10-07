import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Loaf Markets", function () {
  let factory: any;
  let market: any;
  let yesPool: any;
  let noPool: any;
  let resolution: any;
  let usdc: any;
  let adminResolver: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let endTime: number;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20 (USDC)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.deployed();
    await usdc.mint(user1.address, ethers.BigNumber.from("10000000000")); // 10000 USDC
    await usdc.mint(user2.address, ethers.BigNumber.from("10000000000"));

    // Deploy AdminResolver (normal contract)
    const Admin = await ethers.getContractFactory("AdminResolver");
    adminResolver = await Admin.deploy();
    await adminResolver.deployed();

    // Deploy Resolution Module
    const Resolution = await ethers.getContractFactory("ResolutionModuleUpgradeable");
    resolution = await Resolution.deploy();
    await resolution.deployed();
    await resolution.initialize(usdc.address, adminResolver.address);

    // Deploy Market implementation and Factory
    const Market = await ethers.getContractFactory("MarketUpgradeable");
    const marketImpl = await Market.deploy();
    await marketImpl.deployed();

    const Factory = await ethers.getContractFactory("MarketFactoryUpgradeable");
    factory = await Factory.deploy();
    await factory.deployed();
    await factory.initialize(marketImpl.address, usdc.address);

    // Create market
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    endTime = block.timestamp + 86400; // 24 hours from current block time
    await factory.createMarket("Will ETH hit $5000 by 2024?", endTime);
    const markets = await factory.getMarkets(0, 10);
    market = await ethers.getContractAt("MarketUpgradeable", markets[0]);
    await market.setResolutionModule(resolution.address);

    // Get pool references
    yesPool = await ethers.getContractAt("AMMPool", await market.yesPool());
    noPool = await ethers.getContractAt("AMMPool", await market.noPool());
  });

  describe("Market Creation and Setup", function () {
    it("should initialize with correct values", async function () {
      expect(await market.description()).to.equal("Will ETH hit $5000 by 2024?");
      expect(await market.endTime()).to.equal(endTime);
      expect(await market.resolutionModule()).to.equal(resolution.address);
    });

    it("should have properly set up AMM pools", async function () {
      expect(await market.yesPool()).to.equal(yesPool.address);
      expect(await market.noPool()).to.equal(noPool.address);
      expect(await yesPool.market()).to.equal(market.address);
      expect(await noPool.market()).to.equal(market.address);
    });
  });

  describe("Betting Functionality", function () {
    beforeEach(async function () {
      await usdc.connect(user1).approve(yesPool.address, ethers.BigNumber.from("1000000000"));
      await yesPool.connect(user1).addLiquidity(ethers.BigNumber.from("1000000000"));
    });

    it("should allow betting on YES outcome", async function () {
      await usdc.connect(user2).approve(market.address, ethers.BigNumber.from("100000000"));
      await market.connect(user2).bet(true, ethers.BigNumber.from("100000000"));
      expect(await yesPool.balanceOf(user2.address)).to.be.gt(0);
    });

    it("should prevent betting after market end", async function () {
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      await usdc.connect(user2).approve(market.address, ethers.BigNumber.from("100000000"));
      await expect(
        market.connect(user2).bet(true, ethers.BigNumber.from("100000000"))
      ).to.be.revertedWith("Market ended");
    });
  });

  describe("Resolution System", function () {
    beforeEach(async function () {
      await usdc.connect(user1).approve(yesPool.address, ethers.BigNumber.from("1000000000"));
      await yesPool.connect(user1).addLiquidity(ethers.BigNumber.from("1000000000"));
    });

    it("should handle resolution flow", async function () {
      await usdc.connect(user2).approve(market.address, ethers.BigNumber.from("100000000"));
      await market.connect(user2).bet(true, ethers.BigNumber.from("100000000"));

      await usdc.connect(user1).approve(resolution.address, ethers.BigNumber.from("1000000000"));
      await resolution.connect(user1).proposeOutcome(market.address, 1);

      await ethers.provider.send("evm_increaseTime", [7201]);
      await ethers.provider.send("evm_mine", []);
      await resolution.finalizeNoDispute(0);

      expect(await market.resolved()).to.be.true;
      expect(await market.outcome()).to.equal(1);
    });

    it("should handle disputes correctly", async function () {
      await usdc.connect(user1).approve(resolution.address, ethers.BigNumber.from("1000000000"));
      await resolution.connect(user1).proposeOutcome(market.address, 1);

      await usdc.connect(user2).approve(resolution.address, ethers.BigNumber.from("1000000000"));
      await resolution.connect(user2).dispute(0);

      await adminResolver.connect(owner).resolveDispute(0, 2, resolution.address);

      expect(await market.resolved()).to.be.true;
      expect(await market.outcome()).to.equal(2);
    });
  });

  describe("Pool Liquidity", function () {
    it("should handle liquidity operations correctly", async function () {
      await usdc.connect(user1).approve(yesPool.address, ethers.BigNumber.from("1000000000"));
      await yesPool.connect(user1).addLiquidity(ethers.BigNumber.from("1000000000"));

      const lpBalance = await yesPool.balanceOf(user1.address);
      expect(lpBalance).to.equal(ethers.BigNumber.from("1000000000"));

      await yesPool.connect(user1).removeLiquidity(lpBalance);
      expect(await yesPool.balanceOf(user1.address)).to.equal(0);
    });

    it("should calculate prices correctly", async function () {
      await usdc.connect(user1).approve(yesPool.address, ethers.BigNumber.from("1000000000"));
      await yesPool.connect(user1).addLiquidity(ethers.BigNumber.from("1000000000"));

      const price = await yesPool.getPrice();
      expect(price).to.not.equal(0);

      await usdc.connect(user1).approve(yesPool.address, ethers.BigNumber.from("1000000000"));
      await yesPool.connect(user1).addLiquidity(ethers.BigNumber.from("1000000000"));

      const newPrice = await yesPool.getPrice();
      expect(newPrice).to.equal(price);
    });

    it("should handle emergency functions", async function () {
      await yesPool.connect(owner).pause();
      expect(await yesPool.paused()).to.be.true;

      await expect(
        yesPool.connect(user1).addLiquidity(ethers.BigNumber.from("1000000000"))
      ).to.be.revertedWith("Pausable: paused");

      await yesPool.connect(owner).unpause();
      expect(await yesPool.paused()).to.be.false;
    });
  });
});