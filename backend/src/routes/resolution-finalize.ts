import { Router } from 'express';
import { ethers } from 'ethers';
import { provider, wallet } from '../config';
import { RESOLUTION_MODULE_ABI } from '../abis';
import { validateAddressParam, HttpError } from '../middleware';

const router = Router();

// POST /api/resolution/:moduleAddress/finalize/:proposalId
router.post('/:moduleAddress/finalize/:proposalId', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const { moduleAddress, proposalId } = req.params;
    
    if (!ethers.isAddress(moduleAddress)) {
      throw new HttpError(400, 'Invalid module address');
    }
    
    const resolutionModule = new ethers.Contract(
      moduleAddress,
      RESOLUTION_MODULE_ABI,
      wallet
    );

    // Check proposal status
    const proposal = await resolutionModule.proposals(proposalId);
    console.log('Proposal details:', {
      outcome: proposal.outcome.toString(),
      disputed: proposal.disputed,
      finalized: proposal.finalized,
      challengeEnd: proposal.challengeEnd.toString(),
      currentTime: Math.floor(Date.now() / 1000)
    });

    if (proposal.finalized) {
      return res.json({ 
        success: true, 
        message: 'Proposal already finalized',
        outcome: proposal.outcome.toString()
      });
    }

    if (proposal.disputed) {
      throw new HttpError(400, 'Cannot finalize disputed proposal - admin resolution required');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (Number(proposal.challengeEnd) > currentTime) {
      throw new HttpError(400, `Challenge window still active. Ends at ${new Date(Number(proposal.challengeEnd) * 1000).toISOString()}`);
    }

    // Finalize the proposal
    const tx = await resolutionModule.finalizeNoDispute(proposalId);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: `Proposal ${proposalId} finalized successfully`,
      outcome: proposal.outcome.toString(),
      transactionHash: tx.hash,
      outcomeText: proposal.outcome.toString() === '1' ? 'YES' : proposal.outcome.toString() === '0' ? 'NO' : 'INVALID'
    });

  } catch (error) {
    next(error);
  }
});

export default router;