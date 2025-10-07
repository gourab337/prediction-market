import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const validateAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
  } else if (error.message === 'Wallet not configured') {
    res.status(400).json({ error: 'Wallet configuration required for this operation' });
  } else if (error.message === 'Not authorized to resolve market') {
    res.status(403).json({ error: 'Not authorized' });
  } else {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateAddressParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const address = req.params.address;
  if (!address || !validateAddress(address)) {
    throw new HttpError(400, 'Invalid Ethereum address');
  }
  next();
};

export const validateMarketAddressParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const marketAddress = req.params.marketAddress;
  if (!marketAddress || !validateAddress(marketAddress)) {
    throw new HttpError(400, 'Invalid market address');
  }
  next();
};