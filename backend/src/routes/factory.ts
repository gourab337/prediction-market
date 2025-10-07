import { Router } from 'express';
import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG, wallet } from '../config';
import { MARKET_FACTORY_ABI } from '../abis';
import { HttpError } from '../middleware';

const router = Router();

// POST /api/factory/initialize
router.post('/initialize', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const factoryContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.marketFactoryAddress,
      MARKET_FACTORY_ABI,
      wallet
    );

    // Initialize the factory with the implementation address and USDC address
    const tx = await factoryContract.initialize(
      BLOCKCHAIN_CONFIG.marketImplAddress,
      BLOCKCHAIN_CONFIG.usdcAddress
    );
    await tx.wait();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;