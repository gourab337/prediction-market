import { Router } from 'express';
import { ethers } from 'ethers';
import { ERC20_ABI } from '../abis';
import { provider, wallet } from '../config';
import { validateAddress, HttpError } from '../middleware';

const router = Router();

interface ApprovalRequest {
  token: string;
  spender: string;
  amount: string;
}

// POST /api/setup/mint - Mint test USDC
router.post('/mint', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const usdcContract = new ethers.Contract(
      '0x17dded11695B2F3cD4d821789785462274764e24',
      [...ERC20_ABI, 'function mint(address to, uint256 amount)'],
      wallet
    );

    // Mint 1000 USDC (with 18 decimals)
    const mintAmount = ethers.parseUnits('1000', 18);
    const tx = await usdcContract.mint(await wallet.getAddress(), mintAmount);
    await tx.wait();

    const balance = await usdcContract.balanceOf(await wallet.getAddress());

    res.json({
      success: true,
      balance: balance.toString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/setup - Approve token spending
router.post('/', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const params = req.body as ApprovalRequest;
    
    // Validate request body
    if (!params.token || !params.spender || !params.amount) {
      throw new HttpError(400, 'Missing required parameters');
    }
    
    // Validate addresses
    if (!validateAddress(params.token) || !validateAddress(params.spender)) {
      throw new HttpError(400, 'Invalid address');
    }

    // Create token contract instance
    const tokenContract = new ethers.Contract(
      params.token,
      ERC20_ABI,
      wallet
    );

    // Approve spending
    const tx = await tokenContract.approve(params.spender, BigInt(params.amount));
    await tx.wait();

    // Get new allowance
    const allowance = await tokenContract.allowance(await wallet.getAddress(), params.spender);

    res.json({
      success: true,
      allowance: allowance.toString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/setup/balance - Check ETH and token balances
router.get('/balance', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const address = await wallet.getAddress();
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    
    // Get USDC balance
    const usdcContract = new ethers.Contract(
      '0x6890c9b14cE89fe6c8141b151B496CE9C8B94eDe',
      ERC20_ABI,
      provider
    );
    const usdcBalance = await usdcContract.balanceOf(address);

    res.json({
      address,
      ethBalance: ethers.formatEther(ethBalance),
      usdcBalance: ethers.formatUnits(usdcBalance, 6),
      ethBalanceWei: ethBalance.toString(),
      usdcBalanceRaw: usdcBalance.toString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;