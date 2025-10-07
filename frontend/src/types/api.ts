// API Response Types based on your backend documentation

export interface Market {
  address: string;
  id: number;
  name: string;
  question: string;
  description?: string; // Keep as optional for backward compatibility
  endTime: number;
  endTimeISO?: string;
  resolved?: boolean;
  created?: boolean;
  blockNumber?: number;
  transactionHash?: string;
  outcome?: number | null;
  yesPool?: string;
  noPool?: string;
  isActive?: boolean;
  hasPosition?: boolean;
}

export interface PoolInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  reserveUSDC: string;
  price: string;
}

export interface MarketPool {
  yesPool: PoolInfo;
  noPool: PoolInfo;
  marketInfo: Market;
}

export interface Position {
  amount: string;
  currentPrice: number;
  currentValue: string;
  impliedProbability: string;
}

export interface UserPosition {
  market: {
    address: string;
    resolved: boolean;
    outcome: number | null;
    outcomeText: string;
  };
  user: string;
  positions: {
    yesShares: Position;
    noShares: Position;
    total: {
      currentValue: string;
      currency: string;
    };
  };
  payouts: {
    ifYesWins: number;
    ifNoWins: number;
    ifInvalid: number;
  };
  pools: {
    yesPool: string;
    noPool: string;
  };
}

export interface PortfolioPosition {
  amount: string;
  currentPrice: number;
  currentValue: string;
  impliedProbability: string;
}

export interface MarketPositions {
  yesShares: PortfolioPosition;
  noShares: PortfolioPosition;
  total: {
    currentValue: string;
    currency: string;
  };
}

export interface PortfolioMarket {
  address: string;
  name: string;
  value: string;
  positions: MarketPositions;
}

export interface Portfolio {
  user: string;
  totalValue: string;
  markets: PortfolioMarket[];
  message?: string;
}

export interface PortfolioSummary {
  market: Market;
  summary: {
    primaryPosition: "YES" | "NO";
    totalValue: string;
    yesShares: string;
    noShares: string;
    currency: string;
  };
  status: string;
}

export interface WalletBalance {
  address: string;
  ethBalance: string;
  usdcBalance: string;
  ethBalanceWei: string;
  usdcBalanceRaw: string;
}

// Request Types
export interface CreateMarketRequest {
  question: string;
  endTime: string; // ISO string
}

export interface PlaceBetRequest {
  outcome: "YES" | "NO";
  usdcAmount: string;
}

export interface AddLiquidityRequest {
  outcome: "YES" | "NO";
  usdcAmount: string;
}

export interface RemoveLiquidityRequest {
  outcome: "YES" | "NO";
  poolTokenAmount: string;
}

export interface SellSharesRequest {
  outcome: "YES" | "NO";
  shareAmount: string;
}

export interface ResolveMarketRequest {
  finalWeights: [string, string]; // [yes, no] weights
}

export interface SetupRequest {
  token: string;
  spender: string;
  amount: string;
}

// Response Types
export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

export interface CreateMarketResponse {
  success: boolean;
  market: Market;
}

export interface TransactionResponse {
  transactionHash: string;
  success?: boolean;
}

export interface BetResponse extends TransactionResponse {
  shareTokensReceived: string;
  betType: string;
}

export interface LiquidityResponse extends TransactionResponse {
  lpTokensReceived: string;
  poolAddress: string;
}

export interface SellResponse extends TransactionResponse {
  usdcReceived: string;
}

export interface MarketsResponse {
  markets: Market[];
}

// User Transaction Types (for frontend wallet operations)
export interface PreparedTransaction {
  type: 'approval' | 'bet' | 'sell-shares' | 'add-liquidity' | 'remove-liquidity';
  to: string;
  data: string;
  value: string;
  description: string;
}

export interface PrepareBetResponse {
  success: boolean;
  marketAddress: string;
  userAddress: string;
  transactions: PreparedTransaction[];
  summary: {
    action: 'bet';
    outcome: 'YES' | 'NO';
    amount: string;
    currency: 'USDC';
    needsApproval: boolean;
  };
}

export interface PrepareSellSharesResponse {
  success: boolean;
  marketAddress: string;
  userAddress: string;
  transactions: PreparedTransaction[];
  summary: {
    action: 'sell-shares';
    outcome: 'YES' | 'NO';
    amount: string;
    currency: 'SHARES';
  };
}

export interface PrepareLiquidityResponse {
  success: boolean;
  marketAddress: string;
  userAddress: string;
  transactions: PreparedTransaction[];
  summary: {
    action: 'add-liquidity' | 'remove-liquidity';
    outcome: 'YES' | 'NO';
    amount: string;
    currency: 'USDC' | 'POOL_TOKENS';
    needsApproval?: boolean;
  };
}

export interface AllowanceCheckResponse {
  userAddress: string;
  spender: string;
  requiredAmount: string;
  currentAllowance: string;
  hasEnoughAllowance: boolean;
  needsApproval: boolean;
}