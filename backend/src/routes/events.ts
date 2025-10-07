import { Router } from 'express';
import { ethers } from 'ethers';
import { provider } from '../config';
import { BLOCKCHAIN_CONFIG } from '../config';

const router = Router();

router.get('/market/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // Get transaction logs for this contract
    const filter = {
      address,
      fromBlock: 0,
      toBlock: 'latest'
    };

    const logs = await provider.getLogs(filter);
    
    // Also get factory events that might contain market data
    const factoryFilter = {
      address: BLOCKCHAIN_CONFIG.marketFactoryAddress,
      fromBlock: 0,
      toBlock: 'latest'
    };

    const factoryLogs = await provider.getLogs(factoryFilter);
    
    // Try to decode events with various interfaces
    const interfaces = [
      new ethers.Interface([
        'event MarketCreated(address indexed market, string description, uint256 endTime)',
        'event Created(address indexed market, string question, uint256 endTime)',
        'event MarketDeployed(address market, string question, uint256 endTime)'
      ]),
      new ethers.Interface([
        'event Initialized(uint8 version)',
        'event Upgraded(address indexed implementation)'
      ])
    ];

    const decodedLogs = [];
    const marketRelatedLogs = [];

    for (const log of [...logs, ...factoryLogs]) {
      for (const iface of interfaces) {
        try {
          const decoded = iface.parseLog(log);
          if (decoded) {
            const logData = {
              address: log.address,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              eventName: decoded.name,
              args: decoded.args.map((arg: any) => {
                if (typeof arg === 'bigint') {
                  return arg.toString();
                } else if (typeof arg === 'string') {
                  return arg;
                } else if (arg && typeof arg === 'object' && arg._isBigNumber) {
                  return arg.toString();
                } else {
                  return arg;
                }
              })
            };
            
            decodedLogs.push(logData);
            
            // Check if this log relates to our market
            if (decoded.args.market === address || log.address === address) {
              marketRelatedLogs.push(logData);
            }
          }
        } catch (e) {
          // Ignore decode errors
        }
      }
    }

    res.json({
      market: address,
      totalLogs: logs.length,
      factoryLogs: factoryLogs.length,
      decodedLogs,
      marketRelatedLogs
    });

  } catch (error: any) {
    console.error('Events error:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

export default router;