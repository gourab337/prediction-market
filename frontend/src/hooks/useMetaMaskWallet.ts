import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '@/store';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (data: unknown) => void) => void;
  removeListener: (event: string, callback: (data: unknown) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function useMetaMaskWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get wallet store actions
  const { connect: connectWalletStore, disconnect: disconnectWalletStore } = useWalletStore();

  const formattedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const fetchBalance = useCallback(async (account: string) => {
    try {
      setIsLoading(true);
      const ethereum = window.ethereum;
      if (ethereum) {
        // BrowserProvider expects an ethereum-like object
        const provider = new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider);
        const balanceWei = await provider.getBalance(account);
        const balanceEth = ethers.formatEther(balanceWei);
        setBalance(parseFloat(balanceEth).toFixed(4));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0.00');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connect = async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      setIsLoading(true);
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        // Sync with wallet store
        connectWalletStore(accounts[0]);
        await fetchBalance(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress('');
    setBalance('0.00');
    // Sync with wallet store
    disconnectWalletStore();
  }, [disconnectWalletStore]);

  // Check if already connected
  useEffect(() => {
    const checkConnection = async () => {
      const ethereum = window.ethereum;
      if (ethereum) {
        try {
          const accounts = await ethereum.request({
            method: 'eth_accounts',
          }) as string[];
          
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
            // Sync with wallet store
            connectWalletStore(accounts[0]);
            await fetchBalance(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();
  }, [fetchBalance, connectWalletStore]);

  // Listen for account changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          // Sync with wallet store
          connectWalletStore(accounts[0]);
          fetchBalance(accounts[0]);
        } else {
          disconnect();
        }
      };

      ethereum.on('accountsChanged', handleAccountsChanged as (data: unknown) => void);
      
      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged as (data: unknown) => void);
      };
    }
  }, [fetchBalance, connectWalletStore, disconnect]);

  return {
    isConnected,
    address,
    formattedAddress,
    balance,
    isLoading,
    connect,
    disconnect,
  };
}