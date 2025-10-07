import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketApi, positionApi, setupApi } from '@/api/client';
import { useWalletStore, useMarketsStore, usePortfolioStore, useUIStore } from '@/store';
import type { CreateMarketRequest, PlaceBetRequest } from '@/types/api';

// Query Keys
export const queryKeys = {
  markets: ['markets'] as const,
  market: (address: string) => ['market', address] as const,
  marketPool: (address: string) => ['marketPool', address] as const,
  myPortfolio: ['myPortfolio'] as const,
  myPosition: (marketAddress: string) => ['myPosition', marketAddress] as const,
  balance: ['balance'] as const,
} as const;

// Markets Hooks
export function useMarkets() {
  const setMarkets = useMarketsStore((state) => state.setMarkets);
  const setLoading = useMarketsStore((state) => state.setLoading);
  const setError = useMarketsStore((state) => state.setError);

  return useQuery({
    queryKey: queryKeys.markets,
    queryFn: async () => {
      setLoading(true);
      try {
        const markets = await marketApi.getMarkets();
        setMarkets(markets);
        setError(null);
        return markets;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load markets';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useMarket(address: string) {
  const updateMarket = useMarketsStore((state) => state.updateMarket);

  return useQuery({
    queryKey: queryKeys.market(address),
    queryFn: async () => {
      const market = await marketApi.getMarket(address);
      updateMarket(address, market);
      return market;
    },
    enabled: !!address,
    staleTime: 30000,
  });
}

export function useMarketPool(address: string) {
  return useQuery({
    queryKey: queryKeys.marketPool(address),
    queryFn: () => marketApi.getMarketPool(address),
    enabled: !!address,
    staleTime: 10000, // 10 seconds for pool data (more frequent updates)
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Position Hooks
export function useMyPortfolio() {
  const { isConnected, address } = useWalletStore();
  const setPortfolio = usePortfolioStore((state) => state.setPortfolio);
  const setLoading = usePortfolioStore((state) => state.setLoading);
  const setError = usePortfolioStore((state) => state.setError);

  return useQuery({
    queryKey: queryKeys.myPortfolio,
    queryFn: async () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      setLoading(true);
      try {
        const portfolio = await positionApi.getMyPortfolio(address);
        setPortfolio(portfolio);
        setError(null);
        return portfolio;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load portfolio';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    enabled: isConnected && !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useMyPosition(marketAddress: string) {
  const { isConnected, address } = useWalletStore();
  const setPosition = usePortfolioStore((state) => state.setPosition);

  return useQuery({
    queryKey: queryKeys.myPosition(marketAddress),
    queryFn: async () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      const position = await positionApi.getMyPosition(marketAddress, address);
      setPosition(marketAddress, position);
      return position;
    },
    enabled: isConnected && !!marketAddress && !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Wallet Hooks
export function useBalance() {
  const { isConnected, address } = useWalletStore();
  const setBalance = useWalletStore((state) => state.setBalance);

  return useQuery({
    queryKey: queryKeys.balance,
    queryFn: async () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      const balance = await setupApi.getBalance(address);
      setBalance(balance);
      return balance;
    },
    enabled: isConnected && !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Mutation Hooks
export function useCreateMarket() {
  const queryClient = useQueryClient();
  const addMarket = useMarketsStore((state) => state.addMarket);
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: (data: CreateMarketRequest) => marketApi.createMarket(data),
    onSuccess: (data) => {
      addMarket(data.market);
      queryClient.invalidateQueries({ queryKey: queryKeys.markets });
      addNotification({
        type: 'success',
        title: 'Market Created',
        message: `Market "${data.market.description}" has been created successfully!`,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Market Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create market',
      });
    },
  });
}

export function usePlaceBet(marketAddress: string) {
  const queryClient = useQueryClient();
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: (data: PlaceBetRequest) => marketApi.placeBet(marketAddress, data),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.marketPool(marketAddress) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPosition(marketAddress) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPortfolio });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });

      addNotification({
        type: 'success',
        title: 'Bet Placed',
        message: `Successfully placed ${variables.usdcAmount} USDC on ${variables.outcome}. Received ${data.shareTokensReceived} shares.`,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Bet Failed',
        message: error instanceof Error ? error.message : 'Failed to place bet',
      });
    },
  });
}

export function useSellShares(marketAddress: string) {
  const queryClient = useQueryClient();
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: (data: { outcome: "YES" | "NO"; shareAmount: string }) => 
      marketApi.sellShares(marketAddress, data),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.marketPool(marketAddress) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPosition(marketAddress) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myPortfolio });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });

      addNotification({
        type: 'success',
        title: 'Shares Sold',
        message: `Successfully sold ${variables.shareAmount} ${variables.outcome} shares for ${data.usdcReceived} USDC.`,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Sell Failed',
        message: error instanceof Error ? error.message : 'Failed to sell shares',
      });
    },
  });
}

export function useMintUSDC() {
  const { address } = useWalletStore();
  const queryClient = useQueryClient();
  const addNotification = useUIStore((state) => state.addNotification);

  return useMutation({
    mutationFn: () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      return setupApi.mintUSDC(address);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      addNotification({
        type: 'success',
        title: 'USDC Minted',
        message: `Successfully minted ${data.amount} USDC to ${data.mintedTo}. New balance: ${data.balance}`,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Mint Failed',
        message: error instanceof Error ? error.message : 'Failed to mint USDC',
      });
    },
  });
}