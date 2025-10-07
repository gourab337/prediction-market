import { Router } from 'express';
import { ethers } from 'ethers';
import { provider, wallet } from '../config';
import { BLOCKCHAIN_CONFIG } from '../config';

const router = Router();

// Simple ERC20 ABI for testing
const SIMPLE_ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

router.get('/factory', async (req, res, next) => {
  try {
    const factoryAddress = BLOCKCHAIN_CONFIG.marketFactoryAddress;
    
    const result: any = {
      address: factoryAddress,
      functions: {}
    };

    // Test factory functions
    const testFunctions = [
      { name: 'owner', signature: 'owner() view returns (address)' },
      { name: 'usdc', signature: 'usdc() view returns (address)' },
      { name: 'marketImplementation', signature: 'marketImplementation() view returns (address)' },
      { name: 'getMarketsCount', signature: 'getMarketsCount() view returns (uint256)', alias: 'marketsCount' },
      { name: 'getAllMarkets', signature: 'getAllMarkets() view returns (address[])', alias: 'allMarkets' }
    ];

    for (const func of testFunctions) {
      try {
        const contract = new ethers.Contract(factoryAddress, [func.signature], provider);
        const value = await contract.getFunction(func.name)();
        const displayName = func.alias || func.name;
        
        if (Array.isArray(value)) {
          result.functions[displayName] = {
            success: true,
            value: value.map(v => v.toString()),
            count: value.length
          };
        } else {
          result.functions[displayName] = {
            success: true,
            value: value.toString()
          };
        }
      } catch (error: any) {
        const displayName = func.alias || func.name;
        result.functions[displayName] = {
          success: false,
          error: error.message.includes('execution reverted') ? 'Function not implemented' : error.message.split('\n')[0]
        };
      }
    }

    // Try to get markets with pagination
    try {
      const contract = new ethers.Contract(factoryAddress, [
        'function getMarkets(uint256 offset, uint256 limit) view returns (address[])'
      ], provider);
      const markets = await contract.getFunction('getMarkets')(0, 10);
      result.functions.paginatedMarkets = {
        success: true,
        value: markets.map((m: any) => m.toString()),
        count: markets.length
      };
    } catch (error: any) {
      result.functions.paginatedMarkets = {
        success: false,
        error: error.message.split('\n')[0]
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error('Debug factory error:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

router.get('/usdc', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const usdcAddress = BLOCKCHAIN_CONFIG.usdcAddress;
    const walletAddress = await wallet.getAddress();
    const factoryAddress = BLOCKCHAIN_CONFIG.marketFactoryAddress;

    console.log('Testing USDC contract:', usdcAddress);
    console.log('Wallet address:', walletAddress);
    console.log('Factory address:', factoryAddress);

    // Test contract deployment
    const code = await provider.getCode(usdcAddress);
    console.log('Contract code length:', code.length);

    const contract = new ethers.Contract(usdcAddress, SIMPLE_ERC20_ABI, provider);

    // Test basic functions
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const totalSupply = await contract.totalSupply();
    const balance = await contract.balanceOf(walletAddress);

    console.log('Basic info:', { name, symbol, decimals: decimals.toString() });

    // Test allowance with explicit error handling
    let allowance = 'error';
    try {
      const allowanceResult = await contract.allowance(walletAddress, factoryAddress);
      allowance = allowanceResult.toString();
    } catch (error: any) {
      console.error('Allowance error:', error);
      allowance = `Error: ${error.message}`;
    }

    res.json({
      contract: usdcAddress,
      wallet: walletAddress,
      factory: factoryAddress,
      deployed: code !== '0x',
      codeLength: code.length,
      name,
      symbol,
      decimals: decimals.toString(),
      totalSupply: totalSupply.toString(),
      balance: balance.toString(),
      allowance
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

router.get('/market/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    console.log('Testing market contract at:', address);

    // Test if contract exists
    const code = await provider.getCode(address);
    if (code === '0x') {
      return res.json({ 
        address,
        deployed: false,
        error: 'No contract at this address'
      });
    }

    const result: any = {
      address,
      deployed: true,
      codeLength: code.length,
      functions: {}
    };

    // Test functions from actual MarketUpgradeable.sol
    const testFunctions = [
      // Basic info from MarketUpgradeable
      { name: 'description', signature: 'description() view returns (string)' },
      { name: 'endTime', signature: 'endTime() view returns (uint256)' },
      { name: 'resolved', signature: 'resolved() view returns (bool)' },
      { name: 'outcome', signature: 'outcome() view returns (uint8)' },
      { name: 'yesPool', signature: 'yesPool() view returns (address)' },
      { name: 'noPool', signature: 'noPool() view returns (address)' },
      { name: 'usdc', signature: 'usdc() view returns (address)' },
      { name: 'resolutionModule', signature: 'resolutionModule() view returns (address)' },
      
      // Admin functions
      { name: 'owner', signature: 'owner() view returns (address)' },
      { name: 'paused', signature: 'paused() view returns (bool)' },
      
      // Proxy functions
      { name: 'proxiableUUID', signature: 'proxiableUUID() view returns (bytes32)' }
    ];

    for (const func of testFunctions) {
      try {
        const contract = new ethers.Contract(address, [func.signature], provider);
        const result_value = await contract.getFunction(func.name)();
        result.functions[func.name] = {
          success: true,
          value: result_value.toString(),
          type: typeof result_value
        };
      } catch (error: any) {
        result.functions[func.name] = {
          success: false,
          error: error.message.includes('execution reverted') ? 'Function not implemented' : error.message.split('\n')[0]
        };
      }
    }

    // Try to get some basic info about the contract
    try {
      // Test if it's a proxy by checking for common proxy functions
      const proxyContract = new ethers.Contract(address, [
        'function proxiableUUID() view returns (bytes32)',
        'function implementation() view returns (address)'
      ], provider);
      
      try {
        const uuid = await proxyContract.proxiableUUID();
        result.proxy = { uuid: uuid.toString() };
      } catch (e) {
        result.proxy = { error: 'Not a UUPS proxy' };
      }
    } catch (error) {
      result.proxy = { error: 'No proxy functions' };
    }

    res.json(result);
  } catch (error: any) {
    console.error('Debug market error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
    });
  }
});

router.get('/balance', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const address = await wallet.getAddress();
    const ethBalance = await provider.getBalance(address);
    
    // Try to get USDC balance
    let usdcBalance = 'unknown';
    try {
      const usdcContract = new ethers.Contract(
        BLOCKCHAIN_CONFIG.usdcAddress,
        SIMPLE_ERC20_ABI,
        provider
      );
      const balance = await usdcContract.balanceOf(address);
      usdcBalance = ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error: any) {
      usdcBalance = `Error: ${error.message}`;
    }

    res.json({
      address,
      ethBalance: ethers.formatEther(ethBalance),
      usdcBalance
    });
  } catch (error) {
    next(error);
  }
});

export default router;