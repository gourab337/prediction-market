import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Market, UserPosition, Portfolio, WalletBalance } from '@/types/api';

// Wallet Store
interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: WalletBalance | null;
  connect: (address: string) => void;
  disconnect: () => void;
  setBalance: (balance: WalletBalance) => void;
}

export const useWalletStore = create<WalletState>()(
  devtools(
    (set) => ({
      isConnected: false,
      address: null,
      balance: null,
      connect: (address: string) => 
        set({ isConnected: true, address }, false, 'wallet/connect'),
      disconnect: () => 
        set({ isConnected: false, address: null, balance: null }, false, 'wallet/disconnect'),
      setBalance: (balance: WalletBalance) => 
        set({ balance }, false, 'wallet/setBalance'),
    }),
    { name: 'wallet-store' }
  )
);

// Markets Store
interface MarketsState {
  markets: Market[];
  selectedMarket: Market | null;
  isLoading: boolean;
  error: string | null;
  setMarkets: (markets: Market[]) => void;
  addMarket: (market: Market) => void;
  selectMarket: (market: Market | null) => void;
  updateMarket: (address: string, updates: Partial<Market>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketsStore = create<MarketsState>()(
  devtools(
    (set) => ({
      markets: [],
      selectedMarket: null,
      isLoading: false,
      error: null,
      setMarkets: (markets: Market[]) => 
        set({ markets, error: null }, false, 'markets/setMarkets'),
      addMarket: (market: Market) => 
        set((state) => ({ 
          markets: [...state.markets, market] 
        }), false, 'markets/addMarket'),
      selectMarket: (market: Market | null) => 
        set({ selectedMarket: market }, false, 'markets/selectMarket'),
      updateMarket: (address: string, updates: Partial<Market>) => 
        set((state) => ({
          markets: state.markets.map(market => 
            market.address === address ? { ...market, ...updates } : market
          ),
          selectedMarket: state.selectedMarket?.address === address 
            ? { ...state.selectedMarket, ...updates } 
            : state.selectedMarket
        }), false, 'markets/updateMarket'),
      setLoading: (loading: boolean) => 
        set({ isLoading: loading }, false, 'markets/setLoading'),
      setError: (error: string | null) => 
        set({ error }, false, 'markets/setError'),
    }),
    { name: 'markets-store' }
  )
);

// Portfolio Store
interface PortfolioState {
  portfolio: Portfolio | null;
  positions: Map<string, UserPosition>; // marketAddress -> position
  isLoading: boolean;
  error: string | null;
  setPortfolio: (portfolio: Portfolio) => void;
  setPosition: (marketAddress: string, position: UserPosition) => void;
  removePosition: (marketAddress: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    (set) => ({
      portfolio: null,
      positions: new Map(),
      isLoading: false,
      error: null,
      setPortfolio: (portfolio: Portfolio) => 
        set({ portfolio, error: null }, false, 'portfolio/setPortfolio'),
      setPosition: (marketAddress: string, position: UserPosition) => 
        set((state) => ({
          positions: new Map(state.positions).set(marketAddress, position)
        }), false, 'portfolio/setPosition'),
      removePosition: (marketAddress: string) => 
        set((state) => {
          const newPositions = new Map(state.positions);
          newPositions.delete(marketAddress);
          return { positions: newPositions };
        }, false, 'portfolio/removePosition'),
      setLoading: (loading: boolean) => 
        set({ isLoading: loading }, false, 'portfolio/setLoading'),
      setError: (error: string | null) => 
        set({ error }, false, 'portfolio/setError'),
      clear: () => 
        set({ 
          portfolio: null, 
          positions: new Map(), 
          error: null 
        }, false, 'portfolio/clear'),
    }),
    { name: 'portfolio-store' }
  )
);

// UI Store for general UI state
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    timestamp: number;
  }>;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: false,
      theme: 'light',
      notifications: [],
      setSidebarOpen: (open: boolean) => 
        set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),
      setTheme: (theme: 'light' | 'dark') => 
        set({ theme }, false, 'ui/setTheme'),
      addNotification: (notification) => 
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
            }
          ]
        }), false, 'ui/addNotification'),
      removeNotification: (id: string) => 
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }), false, 'ui/removeNotification'),
      clearNotifications: () => 
        set({ notifications: [] }, false, 'ui/clearNotifications'),
    }),
    { name: 'ui-store' }
  )
);