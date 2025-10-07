import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Server Configuration
export const SERVER_CONFIG = {
  port: process.env.PORT || 3000
};

// Helper function to ensure addresses are checksummed
const validateAndChecksumAddress = (address: string | undefined): string => {
  if (!address) throw new Error('Address is required');
  try {
    return ethers.getAddress(address); // This returns the checksummed address
  } catch (error) {
    throw new Error(`Invalid address: ${address}`);
  }
};

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  rpcUrl: process.env.ABSTRACT_RPC_URL,
  chainId: Number(process.env.CHAIN_ID),
  marketFactoryAddress: validateAndChecksumAddress(process.env.MARKET_FACTORY_ADDRESS),
  marketImplAddress: validateAndChecksumAddress(process.env.MARKET_IMPL_ADDRESS),
  usdcAddress: validateAndChecksumAddress(process.env.USDC_ADDRESS),
  adminResolverAddress: validateAndChecksumAddress(process.env.ADMIN_RESOLVER_ADDRESS)
};

// Create provider and wallet
export const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.rpcUrl);
export const wallet = process.env.PRIVATE_KEY 
  ? new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  : null;