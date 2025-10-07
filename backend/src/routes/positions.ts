import { Router } from 'express';
import { ethers } from 'ethers';
import { provider, wallet, SERVER_CONFIG } from '../config';
import { MARKET_ABI, AMM_POOL_ABI, ERC20_ABI } from '../abis';
import { validateMarketAddressParam, HttpError } from '../middleware';

const router = Router();

// Helper function to get position data
async function getPositionForUser(marketAddress: string, userAddress: string) {
  const market = new ethers.Contract(marketAddress, MARKET_ABI, provider);

  // Get market info
  const [yesPoolAddress, noPoolAddress, resolved, outcome] = await Promise.all([
    market.yesPool(),
    market.noPool(),
    market.resolved(),
    market.outcome()
  ]);

  const yesPool = new ethers.Contract(yesPoolAddress, AMM_POOL_ABI, provider);
  const noPool = new ethers.Contract(noPoolAddress, AMM_POOL_ABI, provider);

  // Get user's share balances
  const [yesShares, noShares] = await Promise.all([
    yesPool.balanceOf(userAddress),
    noPool.balanceOf(userAddress)
  ]);

  // Get current pool prices for unrealized value calculation
  const [yesPrice, noPrice] = await Promise.all([
    yesPool.getPrice(),
    noPool.getPrice()
  ]);

  // Calculate position values
  const yesSharesFormatted = ethers.formatUnits(yesShares, 18);
  const noSharesFormatted = ethers.formatUnits(noShares, 18);
  
  // Calculate prices manually since AMM's getPrice() has a bug
  // Issue: Contract's getPrice() suffers from Solidity integer division precision loss
  // Workaround: Use floating-point arithmetic to calculate accurate prices
  // Get reserves and total supply to calculate proper prices
  const [yesReserveUSDC, yesTotalSupply, noReserveUSDC, noTotalSupply] = await Promise.all([
    yesPool.reserveUSDC(),
    yesPool.totalSupply(), 
    noPool.reserveUSDC(),
    noPool.totalSupply()
  ]);
  
  // Calculate actual price per share: USDC reserve / total shares
  const yesReserveFormatted = parseFloat(ethers.formatUnits(yesReserveUSDC, 6));
  const yesTotalSupplyFormatted = parseFloat(ethers.formatUnits(yesTotalSupply, 18));
  const noReserveFormatted = parseFloat(ethers.formatUnits(noReserveUSDC, 6));
  const noTotalSupplyFormatted = parseFloat(ethers.formatUnits(noTotalSupply, 18));
  
  const yesPriceFormatted = yesTotalSupplyFormatted > 0 ? yesReserveFormatted / yesTotalSupplyFormatted : 0;
  const noPriceFormatted = noTotalSupplyFormatted > 0 ? noReserveFormatted / noTotalSupplyFormatted : 0;

  // Calculate current market value of positions
  const yesPositionValue = parseFloat(yesSharesFormatted) * yesPriceFormatted;
  const noPositionValue = parseFloat(noSharesFormatted) * noPriceFormatted;
  const totalPositionValue = yesPositionValue + noPositionValue;

  // Calculate potential payouts if market resolves
  let potentialPayout: any = {
    ifYesWins: 0,
    ifNoWins: 0,
    ifInvalid: 0
  };

  if (resolved) {
    // Market is resolved - calculate actual payout
    const finalOutcome = Number(outcome);
    if (finalOutcome === 1) { // YES wins
      potentialPayout.actual = parseFloat(yesSharesFormatted);
      potentialPayout.actualOutcome = 'YES';
    } else if (finalOutcome === 0) { // NO wins
      potentialPayout.actual = parseFloat(noSharesFormatted);
      potentialPayout.actualOutcome = 'NO';
    } else { // Invalid - typically refund proportional to shares
      potentialPayout.actual = totalPositionValue;
      potentialPayout.actualOutcome = 'INVALID';
    }
  } else {
    // Market not resolved - show potential payouts
    potentialPayout.ifYesWins = parseFloat(yesSharesFormatted);
    potentialPayout.ifNoWins = parseFloat(noSharesFormatted);
    potentialPayout.ifInvalid = totalPositionValue; // Simplified - usually more complex
  }

  // Calculate implied probability based on current prices
  const totalPrice = yesPriceFormatted + noPriceFormatted;
  const yesImpliedProbability = totalPrice > 0 ? (yesPriceFormatted / totalPrice) * 100 : 50;
  const noImpliedProbability = 100 - yesImpliedProbability;

  return {
    market: {
      address: marketAddress,
      resolved,
      outcome: resolved ? Number(outcome) : null,
      outcomeText: resolved ? (Number(outcome) === 1 ? 'YES' : Number(outcome) === 0 ? 'NO' : 'INVALID') : 'PENDING'
    },
    user: userAddress,
    positions: {
      yesShares: {
        amount: yesSharesFormatted,
        currentPrice: yesPriceFormatted,
        currentValue: yesPositionValue.toFixed(6),
        impliedProbability: yesImpliedProbability.toFixed(2) + '%'
      },
      noShares: {
        amount: noSharesFormatted,
        currentPrice: noPriceFormatted,
        currentValue: noPositionValue.toFixed(6),
        impliedProbability: noImpliedProbability.toFixed(2) + '%'
      },
      total: {
        currentValue: totalPositionValue.toFixed(6),
        currency: 'USDC'
      }
    },
    payouts: potentialPayout,
    pools: {
      yesPool: yesPoolAddress,
      noPool: noPoolAddress
    }
  };
}

// GET /api/positions/my-portfolio (user's complete portfolio)
router.get('/my-portfolio', async (req, res, next) => {
  try {
    // Get user address from query parameter (required for multi-user support)
    const { userAddress } = req.query;
    
    if (!userAddress || typeof userAddress !== 'string') {
      throw new HttpError(400, 'userAddress query parameter is required');
    }

    if (!ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid user address');
    }
    
    // Get all markets and aggregate positions across them
    try {
      // Get all markets by calling the markets endpoint directly
      const response = await fetch(`${SERVER_CONFIG.backendUrl}/api/markets`);
      const marketsData: any = await response.json();
      const allMarkets = marketsData.markets;
      
      let totalValueAcrossMarkets = 0;
      const marketsWithPositions = [];
      
      // Check positions in each market
      for (const market of allMarkets) {
        try {
          const positionData = await getPositionForUser(market.address, userAddress as string);
          const marketValue = parseFloat(positionData.positions.total.currentValue);
          
          // Only include markets where user has positions (value > 0)
          if (marketValue > 0) {
            totalValueAcrossMarkets += marketValue;
            marketsWithPositions.push({
              address: market.address,
              name: market.name || market.question,
              value: positionData.positions.total.currentValue,
              positions: positionData.positions
            });
          }
        } catch (marketError: any) {
          // Skip markets where user has no position
          console.log(`No position in market ${market.address}:`, marketError.message);
        }
      }
      
      if (marketsWithPositions.length === 0) {
        res.json({
          user: userAddress,
          totalValue: "0.00",
          markets: [],
          message: "No active positions found"
        });
      } else {
        res.json({
          user: userAddress,
          totalValue: totalValueAcrossMarkets.toFixed(6),
          markets: marketsWithPositions,
          message: `Portfolio tracking across ${marketsWithPositions.length} market(s)`
        });
      }
    } catch (error: any) {
      console.error('Portfolio aggregation error:', error);
      res.json({
        user: userAddress,
        totalValue: "0.00",
        markets: [],
        message: "Error aggregating portfolio: " + error.message
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/positions/portfolio/:userAddress (specific user's portfolio)
router.get('/portfolio/:userAddress', async (req, res, next) => {
  try {
    const { userAddress } = req.params;

    if (!ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid user address');
    }

    // For now, calculate portfolio based on the current market
    try {
      const marketAddress = '0x62003B9CA0C4bb79FdD1CfD951CF5e15D8830641'; // Current demo market
      const positionData = await getPositionForUser(marketAddress, userAddress);
      const totalValue = positionData.positions.total.currentValue;
      
      res.json({
        user: userAddress,
        totalValue: totalValue,
        markets: [marketAddress],
        message: "Portfolio tracking - showing current demo market position"
      });
    } catch (error) {
      // If no position or market doesn't exist, return empty portfolio
      res.json({
        user: userAddress,
        totalValue: "0.00", 
        markets: [],
        message: "No active positions found"
      });
    }

  } catch (error) {
    next(error);
  }
});

// GET /api/positions/:marketAddress/my-position (MUST come before /:userAddress)
router.get('/:marketAddress/my-position', validateMarketAddressParam, async (req, res, next) => {
  try {
    const { marketAddress } = req.params;
    const { userAddress } = req.query;
    
    if (!userAddress || typeof userAddress !== 'string') {
      throw new HttpError(400, 'userAddress query parameter is required');
    }

    if (!ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid user address');
    }

    // Call the helper function
    const positionResponse = await getPositionForUser(marketAddress, userAddress as string);
    res.json(positionResponse);

  } catch (error) {
    next(error);
  }
});

// GET /api/positions/:marketAddress/portfolio-summary
router.get('/:marketAddress/portfolio-summary', validateMarketAddressParam, async (req, res, next) => {
  try {
    const { marketAddress } = req.params;
    const { userAddress } = req.query;
    
    if (!userAddress || typeof userAddress !== 'string') {
      throw new HttpError(400, 'userAddress query parameter is required');
    }

    if (!ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid user address');
    }

    const market = new ethers.Contract(marketAddress, MARKET_ABI, provider);
    
    // Get market info
    const [description, yesPoolAddress, noPoolAddress, resolved, outcome, endTime] = await Promise.all([
      market.description(),
      market.yesPool(),
      market.noPool(),
      market.resolved(),
      market.outcome(),
      market.endTime()
    ]);

    const yesPool = new ethers.Contract(yesPoolAddress, AMM_POOL_ABI, provider);
    const noPool = new ethers.Contract(noPoolAddress, AMM_POOL_ABI, provider);

    // Get positions and prices
    const [yesShares, noShares, yesPrice, noPrice] = await Promise.all([
      yesPool.balanceOf(userAddress),
      noPool.balanceOf(userAddress),
      yesPool.getPrice(),
      noPool.getPrice()
    ]);

    const hasPosition = yesShares > 0 || noShares > 0;

    if (!hasPosition) {
      return res.json({
        market: {
          address: marketAddress,
          description,
          resolved,
          hasPosition: false
        },
        message: 'No positions in this market'
      });
    }

    // Calculate summary  
    const yesSharesFormatted = parseFloat(ethers.formatUnits(yesShares, 18));
    const noSharesFormatted = parseFloat(ethers.formatUnits(noShares, 18));
    
    // Get reserves to calculate proper prices (AMM getPrice() has a bug)
    const [yesReserveUSDC, yesTotalSupply, noReserveUSDC, noTotalSupply] = await Promise.all([
      yesPool.reserveUSDC(),
      yesPool.totalSupply(),
      noPool.reserveUSDC(), 
      noPool.totalSupply()
    ]);
    
    const yesReserveFormatted = parseFloat(ethers.formatUnits(yesReserveUSDC, 6));
    const yesTotalSupplyFormatted = parseFloat(ethers.formatUnits(yesTotalSupply, 18));
    const noReserveFormatted = parseFloat(ethers.formatUnits(noReserveUSDC, 6));
    const noTotalSupplyFormatted = parseFloat(ethers.formatUnits(noTotalSupply, 18));
    
    const yesPriceFormatted = yesTotalSupplyFormatted > 0 ? yesReserveFormatted / yesTotalSupplyFormatted : 0;
    const noPriceFormatted = noTotalSupplyFormatted > 0 ? noReserveFormatted / noTotalSupplyFormatted : 0;

    const totalValue = (yesSharesFormatted * yesPriceFormatted) + (noSharesFormatted * noPriceFormatted);
    
    let primaryPosition = 'NEUTRAL';
    if (yesSharesFormatted > noSharesFormatted) {
      primaryPosition = 'YES';
    } else if (noSharesFormatted > yesSharesFormatted) {
      primaryPosition = 'NO';
    }

    const marketEndDate = new Date(Number(endTime) * 1000);
    const isActive = !resolved && Date.now() < marketEndDate.getTime();

    res.json({
      market: {
        address: marketAddress,
        description,
        resolved,
        outcome: resolved ? Number(outcome) : null,
        endTime: marketEndDate.toISOString(),
        isActive,
        hasPosition: true
      },
      summary: {
        primaryPosition,
        totalValue: totalValue.toFixed(6),
        yesShares: yesSharesFormatted.toFixed(6),
        noShares: noSharesFormatted.toFixed(6),
        currency: 'USDC'
      },
      status: resolved ? 'RESOLVED' : isActive ? 'ACTIVE' : 'EXPIRED'
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/positions/:marketAddress/:userAddress (generic route - MUST come last)
router.get('/:marketAddress/:userAddress', async (req, res, next) => {
  try {
    const { marketAddress, userAddress } = req.params;
    
    if (!ethers.isAddress(marketAddress) || !ethers.isAddress(userAddress)) {
      throw new HttpError(400, 'Invalid addresses');
    }

    const positionResponse = await getPositionForUser(marketAddress, userAddress);
    res.json(positionResponse);

  } catch (error) {
    next(error);
  }
});

export default router;