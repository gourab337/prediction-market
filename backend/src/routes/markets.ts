import { Router } from 'express';
import { ethers } from 'ethers';
import { MarketService } from '../services/MarketService';
import { BLOCKCHAIN_CONFIG, wallet } from '../config';
import { validateAddressParam, validateAddress, HttpError } from '../middleware';
import { ERC20_ABI } from '../abis';

const router = Router();
const marketService = MarketService.getInstance(BLOCKCHAIN_CONFIG.adminResolverAddress);

interface CreateMarketRequest {
  question: string;
  endTime: string;
}

// Get all markets
router.get('/', async (req, res, next) => {
  try {
    const markets = await marketService.getAllMarkets();
    res.json({ markets });
  } catch (error) {
    next(error);
  }
});

// Get market by address
router.get('/:address', validateAddressParam, async (req, res, next) => {
  try {
    const { address } = req.params;
    const market = await marketService.getMarket(address);
    res.json(market);
  } catch (error) {
    next(error);
  }
});

// Create market
router.post('/', async (req, res, next) => {
  try {
    const params = req.body as CreateMarketRequest;
    
    // Validate required fields
    if (!params.question) {
      throw new HttpError(400, 'Question is required');
    }
    
    if (!params.endTime) {
      throw new HttpError(400, 'End time is required');
    }

    // Validate endTime is in the future
    const endTimeTimestamp = new Date(params.endTime).getTime();
    if (endTimeTimestamp <= Date.now()) {
      throw new HttpError(400, 'End time must be in the future');
    }

    const market = await marketService.createMarket(params);
    res.json({ success: true, market });
  } catch (error) {
    next(error);
  }
});export default router;