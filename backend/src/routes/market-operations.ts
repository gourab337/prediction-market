import { Router } from 'express';
import { ethers } from 'ethers';
import { MarketService } from '../services/MarketService';
import { BLOCKCHAIN_CONFIG, wallet } from '../config';
import { validateAddressParam, validateAddress, HttpError } from '../middleware';
import { RESOLUTION_MODULE_ABI, ERC20_ABI, MARKET_ABI } from '../abis';

const router = Router();
const marketService = MarketService.getInstance(BLOCKCHAIN_CONFIG.adminResolverAddress);

interface BetRequest {
  outcome: 'YES' | 'NO';
  usdcAmount: string;
}

interface SellSharesRequest {
  outcome: 'YES' | 'NO';
  shareAmount: string;
}

interface LiquidityRequest {
  outcome: 'YES' | 'NO';
  usdcAmount: string;
}

interface RemoveLiquidityRequest {
  outcome: 'YES' | 'NO';
  poolTokenAmount: string;
}

// GET /api/markets/:address/resolution
router.get('/:address/resolution', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const resolution = await marketService.getMarketResolutionModule(address);
    res.json(resolution);
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/resolve
router.post('/:address/resolve', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const { finalWeights } = req.body;
    
    if (!Array.isArray(finalWeights)) {
      throw new HttpError(400, 'finalWeights must be an array');
    }

    await marketService.resolveMarket(address, finalWeights);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/resolution/propose - Optimistic Resolution
router.post('/:address/resolution/propose', validateAddressParam, async (req, res, next) => {
  try {
    if (!wallet) {
      throw new HttpError(400, 'Wallet not configured');
    }

    const { address } = req.params;
    const { outcome } = req.body;
    
    if (typeof outcome !== 'number' || (outcome !== 1 && outcome !== 2)) {
      throw new HttpError(400, 'outcome must be 1 (YES wins) or 2 (NO wins)');
    }

    // Get the resolution module address for this market
    const resolutionInfo = await marketService.getMarketResolutionModule(address);
    const resolutionModuleAddress = resolutionInfo.address;
    
    if (!resolutionModuleAddress || resolutionModuleAddress === ethers.ZeroAddress) {
      throw new HttpError(400, 'Market does not have a resolution module configured');
    }

    // Connect to resolution module
    const resolutionModule = new ethers.Contract(
      resolutionModuleAddress,
      RESOLUTION_MODULE_ABI,
      wallet
    );

    // Get bond amount and USDC address
    const bondAmount = await resolutionModule.BOND_AMOUNT();
    const usdcAddress = await resolutionModule.usdc();
    
    console.log(`Proposing outcome ${outcome} for market ${address}`);
    console.log(`Bond required: ${ethers.formatUnits(bondAmount, 6)} USDC`);

    // Check user's USDC balance
    const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, wallet);
    const userAddress = await wallet.getAddress();
    const userBalance = await usdc.balanceOf(userAddress);
    
    if (userBalance < bondAmount) {
      throw new HttpError(400, `Insufficient USDC balance. Required: ${ethers.formatUnits(bondAmount, 6)} USDC, Available: ${ethers.formatUnits(userBalance, 6)} USDC`);
    }

    // Check USDC allowance for resolution module
    const allowance = await usdc.allowance(userAddress, resolutionModuleAddress);
    if (allowance < bondAmount) {
      console.log('Insufficient allowance, approving USDC...');
      const approveTx = await usdc.approve(resolutionModuleAddress, bondAmount);
      await approveTx.wait();
      console.log('USDC approved for resolution module');
    }

    // Propose the outcome
    const tx = await resolutionModule.proposeOutcome(address, outcome);
    const receipt = await tx.wait();
    
    // Get the proposal ID from the event
    let proposalId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = resolutionModule.interface.parseLog(log);
        if (parsed && parsed.name === 'OutcomeProposed') {
          proposalId = parsed.args.proposalId.toString();
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed
      }
    }

    // Get challenge window duration
    const challengeWindow = await resolutionModule.CHALLENGE_WINDOW();
    const challengeEndTime = Math.floor(Date.now() / 1000) + Number(challengeWindow);

    res.json({
      success: true,
      proposalId: proposalId,
      outcome: outcome,
      outcomeText: outcome === 1 ? 'YES wins' : 'NO wins',
      bondAmount: ethers.formatUnits(bondAmount, 6),
      challengeWindow: Number(challengeWindow),
      challengeEndTime: challengeEndTime,
      challengeEndISO: new Date(challengeEndTime * 1000).toISOString(),
      transactionHash: receipt.hash,
      message: `Outcome proposed! Challenge window: ${Number(challengeWindow)} seconds`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/markets/:address/pool
router.get('/:address/pool', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const pool = await marketService.getAMMPool(address);
    res.json(pool);
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/bet
router.post('/:address/bet', validateAddressParam, async (req, res, next) => {
  try {
    res.status(410).json({
      error: 'This endpoint has been deprecated. Use /api/user-transactions/:address/prepare-bet to prepare transactions for frontend signing.',
      migration: 'Frontend should now handle betting transactions with user wallet'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/sell-shares
router.post('/:address/sell-shares', validateAddressParam, async (req, res, next) => {
  try {
    res.status(410).json({
      error: 'This endpoint has been deprecated. Use /api/user-transactions/:address/prepare-sell-shares to prepare transactions for frontend signing.',
      migration: 'Frontend should now handle sell shares transactions with user wallet'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/add-liquidity
router.post('/:address/add-liquidity', validateAddressParam, async (req, res, next) => {
  try {
    res.status(410).json({
      error: 'This endpoint has been deprecated. Use /api/user-transactions/:address/prepare-add-liquidity to prepare transactions for frontend signing.',
      migration: 'Frontend should now handle add liquidity transactions with user wallet'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/remove-liquidity
router.post('/:address/remove-liquidity', validateAddressParam, async (req, res, next) => {
  try {
    res.status(410).json({
      error: 'This endpoint has been deprecated. Use /api/user-transactions/:address/prepare-remove-liquidity to prepare transactions for frontend signing.',
      migration: 'Frontend should now handle remove liquidity transactions with user wallet'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/markets/:address/configure-resolution-module
router.post('/:address/configure-resolution-module', validateAddressParam, async (req, res, next) => {
  try {
    if (!wallet) {
      throw new HttpError(400, 'Wallet not configured');
    }

    const { address } = req.params;
    
    // Connect to the market contract
    const market = new ethers.Contract(address, MARKET_ABI, wallet);
    
    // Check current resolution module
    let resolutionModuleAddress = await market.resolutionModule();
    
    if (resolutionModuleAddress !== ethers.ZeroAddress) {
      return res.json({ 
        success: true, 
        message: 'Resolution module already configured',
        resolutionModuleAddress 
      });
    }
    
    // Set the default resolution module from environment
    const defaultResolutionModule = process.env.RESOLUTION_MODULE_ADDRESS || '0x8c7959fBC803fb0A18232Ad0c9F8314b9b8FB731';
    
    console.log(`Setting resolution module for market ${address} to ${defaultResolutionModule}`);
    
    // Set the resolution module (only owner can do this)
    const setModuleTx = await market.setResolutionModule(defaultResolutionModule);
    const receipt = await setModuleTx.wait();
    
    console.log(`Resolution module configured: ${receipt.hash}`);
    
    res.json({
      success: true,
      resolutionModuleAddress: defaultResolutionModule,
      transactionHash: receipt.hash
    });
  } catch (error) {
    next(error);
  }
});

export default router;