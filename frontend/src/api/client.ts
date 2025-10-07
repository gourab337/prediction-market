import axios from 'axios';
import type {
  Market,
  MarketPool,
  UserPosition,
  Portfolio,
  PortfolioSummary,
  WalletBalance,
  CreateMarketRequest,
  CreateMarketResponse,
  PlaceBetRequest,
  BetResponse,
  AddLiquidityRequest,
  LiquidityResponse,
  RemoveLiquidityRequest,
  SellSharesRequest,
  SellResponse,
  ResolveMarketRequest,
  SetupRequest,
  MarketsResponse,
} from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds to account for blockchain operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

// Market Management APIs
export const marketApi = {
  // Get all markets
  getMarkets: async (): Promise<Market[]> => {
    const response = await api.get<MarketsResponse>('/api/markets');
    return response.data.markets;
  },

  // Get specific market details
  getMarket: async (address: string): Promise<Market> => {
    const response = await api.get<Market>(`/api/markets/${address}`);
    return response.data;
  },

  // Create new market
  createMarket: async (data: CreateMarketRequest): Promise<CreateMarketResponse> => {
    const response = await api.post<CreateMarketResponse>('/api/markets', data);
    return response.data;
  },

  // Get market pool state
  getMarketPool: async (address: string): Promise<MarketPool> => {
    const response = await api.get<MarketPool>(`/api/markets/${address}/pool`);
    return response.data;
  },

  // Place a bet
  placeBet: async (address: string, data: PlaceBetRequest): Promise<BetResponse> => {
    const response = await api.post<BetResponse>(`/api/markets/${address}/bet`, data);
    return response.data;
  },

  // Add liquidity
  addLiquidity: async (address: string, data: AddLiquidityRequest): Promise<LiquidityResponse> => {
    const response = await api.post<LiquidityResponse>(`/api/markets/${address}/add-liquidity`, data);
    return response.data;
  },

  // Remove liquidity
  removeLiquidity: async (address: string, data: RemoveLiquidityRequest): Promise<{ usdcAmount: string; transactionHash: string }> => {
    const response = await api.post(`/api/markets/${address}/remove-liquidity`, data);
    return response.data;
  },

  // Sell shares
  sellShares: async (address: string, data: SellSharesRequest): Promise<SellResponse> => {
    const response = await api.post<SellResponse>(`/api/markets/${address}/sell-shares`, data);
    return response.data;
  },

  // Resolve market
  resolveMarket: async (address: string, data: ResolveMarketRequest): Promise<{ success: boolean }> => {
    const response = await api.post(`/api/markets/${address}/resolve`, data);
    return response.data;
  },

  // Get resolution info
  getResolution: async (address: string): Promise<unknown> => {
    const response = await api.get(`/api/markets/${address}/resolution`);
    return response.data;
  },
};

// Position Tracking APIs
export const positionApi = {
  // Get current user's portfolio
  getMyPortfolio: async (userAddress: string): Promise<Portfolio> => {
    const response = await api.get<Portfolio>('/api/positions/my-portfolio', {
      params: { userAddress }
    });
    return response.data;
  },

  // Get specific user's portfolio
  getUserPortfolio: async (userAddress: string): Promise<Portfolio> => {
    const response = await api.get<Portfolio>(`/api/positions/portfolio/${userAddress}`);
    return response.data;
  },

  // Get user's position in specific market
  getMyPosition: async (marketAddress: string, userAddress: string): Promise<UserPosition> => {
    const response = await api.get<UserPosition>(`/api/positions/${marketAddress}/my-position`, {
      params: { userAddress }
    });
    return response.data;
  },

  // Get portfolio summary for market
  getPortfolioSummary: async (marketAddress: string, userAddress: string): Promise<PortfolioSummary> => {
    const response = await api.get<PortfolioSummary>(`/api/positions/${marketAddress}/portfolio-summary`, {
      params: { userAddress }
    });
    return response.data;
  },

  // Get specific user's position in market
  getUserPosition: async (marketAddress: string, userAddress: string): Promise<UserPosition> => {
    const response = await api.get<UserPosition>(`/api/positions/${marketAddress}/${userAddress}`);
    return response.data;
  },
};

// Setup & Configuration APIs
export const setupApi = {
  // Approve token spending
  approve: async (data: SetupRequest): Promise<{ success: boolean; allowance: string }> => {
    const response = await api.post('/api/setup', data);
    return response.data;
  },

  // Get wallet balances
  getBalance: async (userAddress?: string): Promise<WalletBalance> => {
    const params = userAddress ? { userAddress } : {};
    const response = await api.get<WalletBalance>('/api/setup/balance', { params });
    return response.data;
  },

  // Mint test USDC
  mintUSDC: async (userAddress?: string): Promise<{ success: boolean; balance: string; mintedTo: string; amount: string }> => {
    const data = userAddress ? { userAddress } : {};
    const response = await api.post('/api/setup/mint', data);
    return response.data;
  },
};

// Debug APIs (useful for development)
export const debugApi = {
  // Get factory info
  getFactory: async (): Promise<unknown> => {
    const response = await api.get('/api/debug/factory');
    return response.data;
  },

  // Get USDC info
  getUSDC: async (): Promise<unknown> => {
    const response = await api.get('/api/debug/usdc');
    return response.data;
  },

  // Get market debug info
  getMarketDebug: async (address: string): Promise<unknown> => {
    const response = await api.get(`/api/debug/market/${address}`);
    return response.data;
  },

  // Get balance debug
  getBalanceDebug: async (): Promise<unknown> => {
    const response = await api.get('/api/debug/balance');
    return response.data;
  },
};

// Events API
export const eventsApi = {
  // Get market events
  getMarketEvents: async (address: string): Promise<unknown> => {
    const response = await api.get(`/api/events/market/${address}`);
    return response.data;
  },
};

// Factory API
export const factoryApi = {
  // Initialize factory
  initialize: async (): Promise<{ success: boolean }> => {
    const response = await api.post('/api/factory/initialize');
    return response.data;
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<{ status: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// User Transaction APIs (for frontend wallet operations)
export const userTransactionApi = {
  // Prepare bet transaction data
  prepareBet: async (marketAddress: string, userAddress: string, outcome: 'YES' | 'NO', usdcAmount: string) => {
    const response = await api.post(`/api/user-transactions/${marketAddress}/prepare-bet`, {
      userAddress,
      outcome,
      usdcAmount
    });
    return response.data;
  },

  // Prepare sell shares transaction data
  prepareSellShares: async (marketAddress: string, userAddress: string, outcome: 'YES' | 'NO', shareAmount: string) => {
    const response = await api.post(`/api/user-transactions/${marketAddress}/prepare-sell-shares`, {
      userAddress,
      outcome,
      shareAmount
    });
    return response.data;
  },

  // Prepare add liquidity transaction data
  prepareAddLiquidity: async (marketAddress: string, userAddress: string, outcome: 'YES' | 'NO', usdcAmount: string) => {
    const response = await api.post(`/api/user-transactions/${marketAddress}/prepare-add-liquidity`, {
      userAddress,
      outcome,
      usdcAmount
    });
    return response.data;
  },

  // Prepare remove liquidity transaction data
  prepareRemoveLiquidity: async (marketAddress: string, userAddress: string, outcome: 'YES' | 'NO', poolTokenAmount: string) => {
    const response = await api.post(`/api/user-transactions/${marketAddress}/prepare-remove-liquidity`, {
      userAddress,
      outcome,
      poolTokenAmount
    });
    return response.data;
  },

  // Check USDC allowance
  checkAllowance: async (marketAddress: string, userAddress: string, spender: string, amount: string) => {
    const response = await api.get(`/api/user-transactions/${marketAddress}/check-allowance`, {
      params: { userAddress, spender, amount }
    });
    return response.data;
  },
};

export default api;