import { Router } from 'express';
import { ethers } from 'ethers';
import { MarketService } from '../services/MarketService';
import { BLOCKCHAIN_CONFIG, provider } from '../config';
import { validateAddressParam, validateAddress, HttpError } from '../middleware';
import { ERC20_ABI, MARKET_ABI, AMM_POOL_ABI } from '../abis';

const router = Router();
const marketService = MarketService.getInstance(BLOCKCHAIN_CONFIG.adminResolverAddress);

interface PrepareBetRequest {
  userAddress: string;
  outcome: 'YES' | 'NO';
  usdcAmount: string;
}

interface PrepareSellSharesRequest {
  userAddress: string;
  outcome: 'YES' | 'NO';
  shareAmount: string;
}

interface PrepareLiquidityRequest {
  userAddress: string;
  outcome: 'YES' | 'NO';
  usdcAmount: string;
}

interface PrepareRemoveLiquidityRequest {
  userAddress: string;
  outcome: 'YES' | 'NO';
  poolTokenAmount: string;
}

// Helper function to get contract addresses and validate market
async function getMarketContracts(marketAddress: string) {
  const market = new ethers.Contract(marketAddress, MARKET_ABI, provider);

  const [yesPoolAddress, noPoolAddress, usdcAddress] = await Promise.all([
    market.yesPool(),
    market.noPool(),
    market.usdc()
  ]);

  return { market, yesPoolAddress, noPoolAddress, usdcAddress };
}

// POST /api/user-transactions/:address/prepare-bet
router.post('/:address/prepare-bet', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const { userAddress, outcome, usdcAmount } = req.body as PrepareBetRequest;

    // Validate inputs
    if (!userAddress || !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Valid userAddress is required');
    }
    if (!outcome || (outcome !== 'YES' && outcome !== 'NO')) {
      throw new HttpError(400, 'outcome must be "YES" or "NO"');
    }
    if (!usdcAmount || isNaN(Number(usdcAmount))) {
      throw new HttpError(400, 'Valid usdcAmount is required');
    }

    const { market, yesPoolAddress, noPoolAddress, usdcAddress } = await getMarketContracts(address);

    // Check if market is active
    const [resolved, endTime] = await Promise.all([
      market.resolved(),
      market.endTime()
    ]);

    if (resolved) {
      throw new HttpError(400, 'Cannot bet on resolved market');
    }
    if (Number(endTime) * 1000 < Date.now()) {
      throw new HttpError(400, 'Market has expired');
    }

    // Get current USDC allowance
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
    const allowance = await usdc.allowance(userAddress, address);

    const requiredAmount = ethers.parseUnits(usdcAmount, 6);
    const needsApproval = allowance < requiredAmount;

    // Prepare transaction data
    const transactions = [];

    // Add approval transaction if needed
    if (needsApproval) {
      const approvalData = usdc.interface.encodeFunctionData('approve', [address, requiredAmount]);
      transactions.push({
        type: 'approval',
        to: usdcAddress,
        data: approvalData,
        value: '0x0',
        description: `Approve ${usdcAmount} USDC for betting`
      });
    }

    // Prepare bet transaction
    const isYes = outcome === 'YES';
    const betData = market.interface.encodeFunctionData('bet', [isYes, requiredAmount]);
    transactions.push({
      type: 'bet',
      to: address,
      data: betData,
      value: '0x0',
      description: `Bet ${usdcAmount} USDC on ${outcome}`
    });

    res.json({
      success: true,
      marketAddress: address,
      userAddress,
      transactions,
      summary: {
        action: 'bet',
        outcome,
        amount: usdcAmount,
        currency: 'USDC',
        needsApproval
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/user-transactions/:address/prepare-sell-shares
router.post('/:address/prepare-sell-shares', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const { userAddress, outcome, shareAmount } = req.body as PrepareSellSharesRequest;

    // Validate inputs
    if (!userAddress || !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Valid userAddress is required');
    }
    if (!outcome || (outcome !== 'YES' && outcome !== 'NO')) {
      throw new HttpError(400, 'outcome must be "YES" or "NO"');
    }
    if (!shareAmount || isNaN(Number(shareAmount))) {
      throw new HttpError(400, 'Valid shareAmount is required');
    }

    const { market, yesPoolAddress, noPoolAddress } = await getMarketContracts(address);

    // Get the correct pool address
    const poolAddress = outcome === 'YES' ? yesPoolAddress : noPoolAddress;
    const pool = new ethers.Contract(poolAddress, AMM_POOL_ABI, provider);

    // Check user's share balance
    const userBalance = await pool.balanceOf(userAddress);
    const requiredAmount = ethers.parseUnits(shareAmount, 18);

    if (userBalance < requiredAmount) {
      throw new HttpError(400, `Insufficient share balance. Required: ${shareAmount}, Available: ${ethers.formatUnits(userBalance, 18)}`);
    }

    // Prepare sell transaction
    const sellData = pool.interface.encodeFunctionData('removeLiquidity', [requiredAmount]);
    const transactions = [{
      type: 'sell-shares',
      to: poolAddress,
      data: sellData,
      value: '0x0',
      description: `Sell ${shareAmount} ${outcome} shares`
    }];

    res.json({
      success: true,
      marketAddress: address,
      userAddress,
      transactions,
      summary: {
        action: 'sell-shares',
        outcome,
        amount: shareAmount,
        currency: 'SHARES'
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/user-transactions/:address/prepare-add-liquidity
router.post('/:address/prepare-add-liquidity', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const { userAddress, outcome, usdcAmount } = req.body as PrepareLiquidityRequest;

    // Validate inputs
    if (!userAddress || !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Valid userAddress is required');
    }
    if (!outcome || (outcome !== 'YES' && outcome !== 'NO')) {
      throw new HttpError(400, 'outcome must be "YES" or "NO"');
    }
    if (!usdcAmount || isNaN(Number(usdcAmount))) {
      throw new HttpError(400, 'Valid usdcAmount is required');
    }

    const { market, yesPoolAddress, noPoolAddress, usdcAddress } = await getMarketContracts(address);

    // Get the correct pool address
    const poolAddress = outcome === 'YES' ? yesPoolAddress : noPoolAddress;
    const pool = new ethers.Contract(poolAddress, AMM_POOL_ABI, provider);

    // Get current USDC allowance
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
    const allowance = await usdc.allowance(userAddress, poolAddress);

    const requiredAmount = ethers.parseUnits(usdcAmount, 6);
    const needsApproval = allowance < requiredAmount;

    // Prepare transaction data
    const transactions = [];

    // Add approval transaction if needed
    if (needsApproval) {
      const approvalData = usdc.interface.encodeFunctionData('approve', [poolAddress, requiredAmount]);
      transactions.push({
        type: 'approval',
        to: usdcAddress,
        data: approvalData,
        value: '0x0',
        description: `Approve ${usdcAmount} USDC for liquidity provision`
      });
    }

    // Prepare add liquidity transaction
    const addLiquidityData = pool.interface.encodeFunctionData('addLiquidity', [requiredAmount]);
    transactions.push({
      type: 'add-liquidity',
      to: poolAddress,
      data: addLiquidityData,
      value: '0x0',
      description: `Add ${usdcAmount} USDC liquidity to ${outcome} pool`
    });

    res.json({
      success: true,
      marketAddress: address,
      userAddress,
      transactions,
      summary: {
        action: 'add-liquidity',
        outcome,
        amount: usdcAmount,
        currency: 'USDC',
        needsApproval
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/user-transactions/:address/prepare-remove-liquidity
router.post('/:address/prepare-remove-liquidity', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const { userAddress, outcome, poolTokenAmount } = req.body as PrepareRemoveLiquidityRequest;

    // Validate inputs
    if (!userAddress || !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Valid userAddress is required');
    }
    if (!outcome || (outcome !== 'YES' && outcome !== 'NO')) {
      throw new HttpError(400, 'outcome must be "YES" or "NO"');
    }
    if (!poolTokenAmount || isNaN(Number(poolTokenAmount))) {
      throw new HttpError(400, 'Valid poolTokenAmount is required');
    }

    const { market, yesPoolAddress, noPoolAddress } = await getMarketContracts(address);

    // Get the correct pool address
    const poolAddress = outcome === 'YES' ? yesPoolAddress : noPoolAddress;
    const pool = new ethers.Contract(poolAddress, AMM_POOL_ABI, provider);

    // Check user's pool token balance
    const userBalance = await pool.balanceOf(userAddress);
    const requiredAmount = ethers.parseUnits(poolTokenAmount, 18);

    if (userBalance < requiredAmount) {
      throw new HttpError(400, `Insufficient pool token balance. Required: ${poolTokenAmount}, Available: ${ethers.formatUnits(userBalance, 18)}`);
    }

    // Prepare remove liquidity transaction
    const removeLiquidityData = pool.interface.encodeFunctionData('removeLiquidity', [requiredAmount]);
    const transactions = [{
      type: 'remove-liquidity',
      to: poolAddress,
      data: removeLiquidityData,
      value: '0x0',
      description: `Remove ${poolTokenAmount} pool tokens from ${outcome} pool`
    }];

    res.json({
      success: true,
      marketAddress: address,
      userAddress,
      transactions,
      summary: {
        action: 'remove-liquidity',
        outcome,
        amount: poolTokenAmount,
        currency: 'POOL_TOKENS'
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/user-transactions/:address/check-allowance
router.get('/:address/check-allowance', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const { userAddress, spender, amount } = req.query;

    if (!userAddress || !ethers.isAddress(userAddress as string)) {
      throw new HttpError(400, 'Valid userAddress query parameter is required');
    }
    if (!spender || !ethers.isAddress(spender as string)) {
      throw new HttpError(400, 'Valid spender query parameter is required');
    }
    if (!amount || isNaN(Number(amount))) {
      throw new HttpError(400, 'Valid amount query parameter is required');
    }

    const usdc = new ethers.Contract(BLOCKCHAIN_CONFIG.usdcAddress, ERC20_ABI, provider);
    const allowance = await usdc.allowance(userAddress as string, spender as string);
    const requiredAmount = ethers.parseUnits(amount as string, 6);

    res.json({
      userAddress: userAddress as string,
      spender: spender as string,
      requiredAmount: amount as string,
      currentAllowance: ethers.formatUnits(allowance, 6),
      hasEnoughAllowance: allowance >= requiredAmount,
      needsApproval: allowance < requiredAmount
    });

  } catch (error) {
    next(error);
  }
});

export default router;