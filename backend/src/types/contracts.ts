import { ethers } from 'ethers';

export interface Market {
  // Basic info
  name(): Promise<string>;
  symbol(): Promise<string>;
  getTotalSupply(): Promise<bigint>;
  
  // Token management
  getCollateralTokens(): Promise<string[]>;
  getCollateralWeights(): Promise<bigint[]>;
  getBalance(token: string): Promise<bigint>;
  getSpotPrice(tokenIn: string, tokenOut: string): Promise<bigint>;
  
  // Pool operations
  joinPool(poolAmountOut: bigint, maxAmountsIn: bigint[]): Promise<void>;
  exitPool(poolAmountIn: bigint, minAmountsOut: bigint[]): Promise<void>;
  swapExactAmountIn(
    tokenIn: string,
    tokenAmountIn: bigint,
    tokenOut: string,
    minAmountOut: bigint,
    maxPrice: bigint
  ): Promise<[bigint, bigint]>;
  swapExactAmountOut(
    tokenIn: string,
    maxAmountIn: bigint,
    tokenOut: string,
    tokenAmountOut: bigint,
    maxPrice: bigint
  ): Promise<[bigint, bigint]>;
  
  // Fee management
  getSwapFee(): Promise<bigint>;
  getControllerFee(): Promise<bigint>;
  
  // Resolution
  initialize(tokens: string[], weights: bigint[], swapFee: bigint, controllerFee: bigint): Promise<void>;
  getResolutionModule(): Promise<string>;
  setResolutionModule(resolutionModule: string): Promise<void>;
  
  // Token transfers
  transfer(to: string, amount: bigint): Promise<boolean>;
  transferFrom(from: string, to: string, amount: bigint): Promise<boolean>;
  approve(spender: string, amount: bigint): Promise<boolean>;
  allowance(owner: string, spender: string): Promise<bigint>;
  balanceOf(account: string): Promise<bigint>;
}

export interface MarketFactory {
  createMarket(
    description: string,
    endTime: number
  ): Promise<ethers.TransactionResponse>;
  getMarkets(offset: number, limit: number): Promise<string[]>;
  getMarketsCount(): Promise<bigint>;
  marketImplementation(): Promise<string>;
  usdc(): Promise<string>;
  owner(): Promise<string>;
}

export interface ERC20 {
  name(): Promise<string>;
  symbol(): Promise<string>;
  decimals(): Promise<number>;
  totalSupply(): Promise<bigint>;
  balanceOf(owner: string): Promise<bigint>;
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, value: bigint): Promise<boolean>;
  transfer(to: string, value: bigint): Promise<boolean>;
  transferFrom(from: string, to: string, value: bigint): Promise<boolean>;
}

export interface AMMPool {
  initialize(tokens: string[], weights: bigint[], swapFee: bigint): Promise<void>;
  getTokens(): Promise<string[]>;
  getWeights(): Promise<bigint[]>;
  getSwapFee(): Promise<bigint>;
  swapExactAmountIn(
    tokenIn: string,
    tokenAmountIn: bigint,
    tokenOut: string,
    minAmountOut: bigint,
    maxPrice: bigint
  ): Promise<[bigint, bigint]>; // [tokenAmountOut, spotPriceAfter]
  swapExactAmountOut(
    tokenIn: string,
    maxAmountIn: bigint,
    tokenOut: string,
    tokenAmountOut: bigint,
    maxPrice: bigint
  ): Promise<[bigint, bigint]>; // [tokenAmountIn, spotPriceAfter]
  joinPool(poolAmountOut: bigint, maxAmountsIn: bigint[]): Promise<void>;
  exitPool(poolAmountIn: bigint, minAmountsOut: bigint[]): Promise<void>;
  getSpotPrice(tokenIn: string, tokenOut: string): Promise<bigint>;
}

export interface ResolutionModule {
  initialize(market: string): Promise<void>;
  resolveMarket(finalWeights: bigint[]): Promise<void>;
  getMarket(): Promise<string>;
  getFinalWeights(): Promise<bigint[]>;
  isResolved(): Promise<boolean>;
}

export interface AdminResolver {
  resolveDispute(proposalId: bigint, finalOutcome: number, resolutionModule: string): Promise<void>;
  owner(): Promise<string>;
  transferOwnership(newOwner: string): Promise<void>;
}