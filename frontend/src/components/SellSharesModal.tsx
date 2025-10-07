import { useState } from 'react';
import { TrendingUp, TrendingDown, X, Loader2, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMetaMaskWallet } from '@/hooks/useMetaMaskWallet';
import { userTransactionApi } from '@/api/client';
import type { PortfolioMarket, PreparedTransaction } from '@/types/api';

interface SellSharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: PortfolioMarket;
  outcome: 'YES' | 'NO';
  maxShares: number;
}

export function SellSharesModal({ isOpen, onClose, market, outcome, maxShares }: SellSharesModalProps) {
  const { isConnected, address: userAddress } = useMetaMaskWallet();
  const [shareAmount, setShareAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preparedTransactions, setPreparedTransactions] = useState<PreparedTransaction[]>([]);
  const [currentTxIndex, setCurrentTxIndex] = useState(0);

  const currentPrice = outcome === 'YES'
    ? market.positions.yesShares.currentPrice
    : market.positions.noShares.currentPrice;
  const OutcomeIcon = outcome === 'YES' ? TrendingUp : TrendingDown;

  const estimatedUSDC = shareAmount && !isNaN(Number(shareAmount)) && currentPrice > 0
    ? (Number(shareAmount) * currentPrice).toFixed(2)
    : '0';

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!shareAmount || isNaN(Number(shareAmount)) || Number(shareAmount) <= 0) {
      setError('Please enter a valid share amount');
      return;
    }
    if (Number(shareAmount) > maxShares) {
      setError('You cannot sell more shares than you own');
      return;
    }
    if (!isConnected || !userAddress) {
      setError('Please connect your wallet first');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Prepare transaction data from backend
      const response = await userTransactionApi.prepareSellShares(
        market.address,
        userAddress,
        outcome,
        shareAmount
      );

      setPreparedTransactions(response.transactions);
      setCurrentTxIndex(0);

      // Create signer
      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();

      // Execute transactions sequentially
      for (let i = 0; i < response.transactions.length; i++) {
        const tx = response.transactions[i];
        setCurrentTxIndex(i);

        console.log(`Sending ${tx.type} transaction to ${tx.to}...`);

        // Send transaction
        const txResponse = await signer.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });

        console.log(`${tx.type} transaction sent:`, txResponse.hash);

        // Wait for confirmation
        const receipt = await txResponse.wait();
        if (receipt) {
          console.log(`${tx.type} transaction confirmed:`, receipt.hash);
        } else {
          console.log(`${tx.type} transaction sent but receipt not available`);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setShareAmount('');
        setError(null);
        setPreparedTransactions([]);
        setCurrentTxIndex(0);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell shares');
      setPreparedTransactions([]);
      setCurrentTxIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShareAmount('');
    setError(null);
    setSuccess(false);
    setPreparedTransactions([]);
    setCurrentTxIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-glass-gradient border-pink-500/30 shadow-glass" style={{ position: 'relative', zIndex: 100 }}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${outcome === 'YES' ? 'bg-success/20 border border-success/30' : 'bg-destructive/20 border border-destructive/30'}`}>
                <OutcomeIcon className={`h-5 w-5 ${outcome === 'YES' ? 'text-success' : 'text-destructive'}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">Sell {outcome} Shares</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 cursor-pointer"
              disabled={isLoading}
            >
              <X className="h-4 w-4 text-gray-300" />
            </Button>
          </div>

          {/* Market Info */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-2">{market.name}</h4>
            <div className="text-xs text-gray-400 font-mono">{market.address}</div>
          </div>

          {/* Outcome Display */}
          <div className="mb-6">
            <div className={`p-4 rounded-lg border ${outcome === 'YES' ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <OutcomeIcon className={`h-5 w-5 ${outcome === 'YES' ? 'text-success' : 'text-destructive'}`} />
                  <span className={`font-semibold ${outcome === 'YES' ? 'text-success' : 'text-destructive'}`}>{outcome} Position</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">${currentPrice.toFixed(3)} per share</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-3">Shares to Sell</label>
            <div className="relative">
              <Input
                type="number"
                placeholder={`0 (max ${maxShares})`}
                value={shareAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShareAmount(e.target.value)}
                className="pl-4 backdrop-blur-sm bg-glass-white/5 border-glass-border/30 text-white placeholder:text-gray-400 focus:border-gold/50"
                disabled={isLoading}
                min="0"
                max={maxShares}
                step="0.01"
              />
            </div>
          </div>

          {/* USDC Preview */}
          {shareAmount && !isNaN(Number(shareAmount)) && Number(shareAmount) > 0 && (
            <div className={`mb-6 p-4 rounded-lg border ${outcome === 'YES' ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">You will receive:</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gold">${estimatedUSDC}</div>
                  <div className="text-xs text-gray-400">USDC</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/30">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <p className="text-sm text-success">Transaction approved! Shares sold successfully 🎉</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 backdrop-blur-sm border-glass-border/50 hover:border-gold/30 cursor-pointer"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              className={`flex-1 cursor-pointer ${outcome === 'YES' ? 'bg-success hover:bg-success/90 text-white' : 'bg-destructive hover:bg-destructive/90 text-white'}`}
              disabled={isLoading || !shareAmount || !isConnected}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {preparedTransactions.length > 0 
                    ? `Processing ${preparedTransactions[currentTxIndex]?.type || 'transaction'}...`
                    : 'Preparing Transaction...'
                  }
                </>
              ) : (
                'Approve Transaction'
              )}
            </Button>
          </div>

          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="mt-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
              <p className="text-sm text-pink-300">Connect your wallet to sell shares</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
