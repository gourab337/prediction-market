import { Router } from 'express';
import { ethers } from 'ethers';
import { provider, wallet } from '../config';
import { RESOLUTION_MODULE_ABI } from '../abis';

const router = Router();

// GET /api/resolution-test/:address - Test resolution module functions
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const resolutionModule = new ethers.Contract(
      address,
      RESOLUTION_MODULE_ABI,
      provider
    );

    const result: any = {
      address,
      functions: {}
    };

    // Test the key functions from the ABI
    const testFunctions = [
      { name: 'proposalCount', func: async () => await resolutionModule.proposalCount() },
      { name: 'BOND_AMOUNT', func: async () => await resolutionModule.BOND_AMOUNT() },
      { name: 'CHALLENGE_WINDOW', func: async () => await resolutionModule.CHALLENGE_WINDOW() },
      { name: 'usdc', func: async () => await resolutionModule.usdc() },
      { name: 'adminResolver', func: async () => await resolutionModule.adminResolver() }
    ];

    for (const test of testFunctions) {
      try {
        const value = await test.func();
        result.functions[test.name] = {
          success: true,
          value: value.toString(),
          formatted: test.name === 'BOND_AMOUNT' ? `${ethers.formatUnits(value, 6)} USDC` : 
                     test.name === 'CHALLENGE_WINDOW' ? `${value.toString()} seconds (${Math.floor(Number(value) / 3600)} hours)` :
                     value.toString()
        };
      } catch (error: any) {
        result.functions[test.name] = {
          success: false,
          error: error.message.split('\n')[0]
        };
      }
    }

    // Try to get a proposal if any exist
    try {
      const proposalCount = await resolutionModule.proposalCount();
      if (proposalCount > 0) {
        const latestProposal = await resolutionModule.proposals(proposalCount - BigInt(1));
        result.latestProposal = {
          id: (proposalCount - BigInt(1)).toString(),
          marketId: latestProposal.marketId?.toString(),
          outcome: latestProposal.outcome?.toString(),
          proposer: latestProposal.proposer,
          disputer: latestProposal.disputer,
          bond: latestProposal.bond?.toString(),
          bondFormatted: `${ethers.formatUnits(latestProposal.bond || 0, 6)} USDC`,
          challengeEnd: latestProposal.challengeEnd?.toString(),
          challengeEndDate: new Date(Number(latestProposal.challengeEnd || 0) * 1000).toISOString(),
          disputed: latestProposal.disputed,
          finalized: latestProposal.finalized,
          currentTime: Math.floor(Date.now() / 1000),
          canFinalize: Number(latestProposal.challengeEnd || 0) < Math.floor(Date.now() / 1000) && !latestProposal.disputed && !latestProposal.finalized
        };
      }
    } catch (error) {
      result.proposalError = 'Could not fetch proposals';
    }

    res.json(result);
  } catch (error: any) {
    console.error('Resolution test error:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

export default router;