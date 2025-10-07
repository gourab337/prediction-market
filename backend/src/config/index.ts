import { config } from 'dotenv';
import { ethers } from 'ethers';

// Load environment variables
config();

// Server configuration
export const PORT = process.env.PORT || 3000;

// Blockchain configuration
export const BLOCKCHAIN_CONFIG = {
  rpcUrl: process.env.ABSTRACT_RPC_URL || 'https://sepolia.abstract.com',
  chainId: Number(process.env.CHAIN_ID) || 11124,
  marketFactoryAddress: process.env.MARKET_FACTORY_ADDRESS as string,
  marketImplAddress: process.env.MARKET_IMPL_ADDRESS as string,
  usdcAddress: process.env.USDC_ADDRESS as string,
  adminResolverAddress: process.env.ADMIN_RESOLVER_ADDRESS as string,
};

// Initialize ethers provider
export const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.rpcUrl);

// Create wallet if private key is provided
export const wallet = process.env.PRIVATE_KEY 
  ? new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  : undefined;

// Nonce manager for avoiding transaction conflicts
let currentNonce: number | null = null;

export async function getNextNonce(): Promise<number> {
  if (!wallet) throw new Error('Wallet not configured');
  
  if (currentNonce === null) {
    currentNonce = await wallet.getNonce();
  } else {
    currentNonce++;
  }
  
  return currentNonce;
}

export function resetNonce(): void {
  currentNonce = null;
}