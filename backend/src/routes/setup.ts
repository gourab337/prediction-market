import { Router } from 'express';
import { ethers } from 'ethers';
import { ERC20_ABI } from '../abis';
import { provider, wallet, BLOCKCHAIN_CONFIG } from '../config';
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

    const { userAddress } = req.body;
    
    // Validate userAddress if provided
    if (userAddress && !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid user address');
    }

    const usdcContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.usdcAddress,
      [...ERC20_ABI, 'function mint(address to, uint256 amount)'],
      wallet
    );

    // Mint to specified address or dev wallet
    const mintToAddress = userAddress || await wallet.getAddress();
    
    // Mint 1000 USDC (with 6 decimals)
    const mintAmount = ethers.parseUnits('1000', 6);
    const tx = await usdcContract.mint(mintToAddress, mintAmount);
    await tx.wait();

    const balance = await usdcContract.balanceOf(mintToAddress);

    res.json({
      success: true,
      balance: balance.toString(),
      mintedTo: mintToAddress,
      amount: ethers.formatUnits(mintAmount, 18)
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
    const { userAddress } = req.query;
    
    // Validate userAddress if provided
    if (userAddress && typeof userAddress !== 'string') {
      throw new HttpError(400, 'userAddress must be a string');
    }
    
    if (userAddress && !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid user address');
    }

    // Use provided address or dev wallet
    const address = userAddress || (wallet ? await wallet.getAddress() : null);
    
    if (!address) {
      throw new HttpError(400, 'No address available - wallet not configured and no userAddress provided');
    }
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    
    // Get USDC balance
    const usdcContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.usdcAddress,
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