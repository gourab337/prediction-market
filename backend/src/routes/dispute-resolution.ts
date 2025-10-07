import { Router } from 'express';
import { ethers } from 'ethers';
import { provider, wallet } from '../config';
import { RESOLUTION_MODULE_ABI, ADMIN_RESOLVER_ABI } from '../abis';
import { HttpError } from '../middleware';

const router = Router();

// POST /api/dispute/:moduleAddress/challenge/:proposalId
router.post('/:moduleAddress/challenge/:proposalId', async (req, res, next) => {
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
    
    if (proposal.finalized) {
      throw new HttpError(400, 'Cannot dispute finalized proposal');
    }
    
    if (proposal.disputed) {
      throw new HttpError(400, 'Proposal already disputed');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (Number(proposal.challengeEnd) < currentTime) {
      throw new HttpError(400, 'Challenge window has expired');
    }

    // Get and approve bond amount for disputing
    const bondAmount = await resolutionModule.BOND_AMOUNT();
    const usdcAddress = await resolutionModule.usdc();
    
    const usdcContract = new ethers.Contract(
      usdcAddress,
      ['function approve(address spender, uint256 amount) returns (bool)',
       'function allowance(address owner, address spender) view returns (uint256)'],
      wallet
    );

    const allowance = await usdcContract.allowance(await wallet.getAddress(), moduleAddress);
    if (allowance < bondAmount) {
      console.log('Approving USDC for dispute bond...');
      const approveTx = await usdcContract.approve(moduleAddress, bondAmount);
      await approveTx.wait();
    }

    // Submit dispute
    const tx = await resolutionModule.dispute(proposalId);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: `Proposal ${proposalId} disputed successfully`,
      transactionHash: tx.hash,
      bondAmount: ethers.formatUnits(bondAmount, 6),
      proposalId,
      disputer: await wallet.getAddress()
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/dispute/:moduleAddress/admin-resolve/:proposalId
router.post('/:moduleAddress/admin-resolve/:proposalId', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const { moduleAddress, proposalId } = req.params;
    const { finalOutcome } = req.body;
    
    if (!ethers.isAddress(moduleAddress)) {
      throw new HttpError(400, 'Invalid module address');
    }

    if (typeof finalOutcome !== 'number' || finalOutcome < 1 || finalOutcome > 2) {
      throw new HttpError(400, 'finalOutcome must be 1 (YES) or 2 (NO)');
    }

    const resolutionModule = new ethers.Contract(
      moduleAddress,
      RESOLUTION_MODULE_ABI,
      wallet
    );

    // Check proposal status
    const proposal = await resolutionModule.proposals(proposalId);
    
    if (proposal.finalized) {
      throw new HttpError(400, 'Proposal already finalized');
    }
    
    if (!proposal.disputed) {
      throw new HttpError(400, 'Can only admin-resolve disputed proposals');
    }

    // Get admin resolver address
    const adminResolverAddress = await resolutionModule.adminResolver();
    const adminResolver = new ethers.Contract(
      adminResolverAddress,
      ADMIN_RESOLVER_ABI,
      wallet
    );

    // Check admin permissions
    const owner = await adminResolver.owner();
    const walletAddress = await wallet.getAddress();
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new HttpError(403, 'Not authorized - only admin can resolve disputes');
    }

    // Resolve dispute through admin resolver
    const tx = await adminResolver.resolveDispute(
      proposalId,
      finalOutcome,
      moduleAddress
    );
    await tx.wait();

    // Determine winner and distribute bonds
    const originalOutcome = Number(proposal.outcome);
    const winner = (finalOutcome === originalOutcome) ? proposal.proposer : proposal.disputer;
    const loser = (finalOutcome === originalOutcome) ? proposal.disputer : proposal.proposer;

    res.json({
      success: true,
      message: `Dispute resolved by admin`,
      proposalId,
      originalOutcome,
      finalOutcome,
      winner,
      loser,
      outcomeText: finalOutcome === 1 ? 'YES' : finalOutcome === 2 ? 'NO' : 'INVALID',
      resolution: finalOutcome === originalOutcome ? 'Original proposer was correct' : 'Disputer was correct'
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/dispute/:moduleAddress/distribute-bonds/:proposalId
router.post('/:moduleAddress/distribute-bonds/:proposalId', async (req, res, next) => {
  try {
    if (!wallet) {
      throw new Error('Wallet not configured');
    }

    const { moduleAddress, proposalId } = req.params;
    const { winner } = req.body;
    
    if (!ethers.isAddress(moduleAddress) || !ethers.isAddress(winner)) {
      throw new HttpError(400, 'Invalid addresses');
    }

    const resolutionModule = new ethers.Contract(
      moduleAddress,
      RESOLUTION_MODULE_ABI,
      wallet
    );

    // Distribute bonds to winner
    const tx = await resolutionModule.distributeBonds(proposalId, winner);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: `Bonds distributed to winner`,
      proposalId,
      winner,
      transactionHash: tx.hash
    });

  } catch (error) {
    next(error);
  }
});

export default router;