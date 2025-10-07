import { useState } from 'react';
import { TrendingUp, TrendingDown, X, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMetaMaskWallet } from '@/hooks/useMetaMaskWallet';
import { useMarketPool } from '@/hooks/api';
import { marketApi } from '@/api/client';
import type { Market, PlaceBetRequest } from '@/types/api';

interface PlaceBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  selectedOutcome: 'YES' | 'NO' | null;
}

export function PlaceBetModal({ isOpen, onClose, market, selectedOutcome }: PlaceBetModalProps) {
  const { isConnected } = useMetaMaskWallet();
  const { data: poolData, isLoading: poolLoading } = useMarketPool(market.address);
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get prices from pool data
  const yesPrice = poolData ? parseFloat(poolData.yesPool.price) : 0;
  const noPrice = poolData ? parseFloat(poolData.noPool.price) : 0;
  
  // Use the selected outcome passed from the button click
  const outcome = selectedOutcome || 'YES';
  const currentPrice = outcome === 'YES' ? yesPrice : noPrice;
  const OutcomeIcon = outcome === 'YES' ? TrendingUp : TrendingDown;

  const estimatedShares = usdcAmount && !isNaN(Number(usdcAmount)) && currentPrice > 0
    ? (Number(usdcAmount) / currentPrice).toFixed(2)
    : '0';

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!usdcAmount || isNaN(Number(usdcAmount)) || Number(usdcAmount) <= 0) {
      setError('Please enter a valid USDC amount');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const betRequest: PlaceBetRequest = {
        outcome,
        usdcAmount: usdcAmount
      };

      await marketApi.placeBet(market.address, betRequest);
      setSuccess(true);
      
      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setUsdcAmount('');
        setError(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUsdcAmount('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ pointerEvents: 'auto' }}
    >
      <Card className="w-full max-w-md mx-4 bg-glass-gradient border-pink-500/30 shadow-glass"
        style={{ position: 'relative', zIndex: 100 }}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${outcome === 'YES' ? 'bg-success/20 border border-success/30' : 'bg-destructive/20 border border-destructive/30'}`}>
                <OutcomeIcon className={`h-5 w-5 ${outcome === 'YES' ? 'text-success' : 'text-destructive'}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">Bet {outcome}</h3>
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
            <h4 className="text-sm font-medium text-white mb-2">{market.question || market.name}</h4>
            <div className="text-xs text-gray-400 font-mono">{market.address}</div>
          </div>

          {/* Outcome Display */}
          <div className="mb-6">
            <div className={`p-4 rounded-lg border ${outcome === 'YES' ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <OutcomeIcon className={`h-5 w-5 ${outcome === 'YES' ? 'text-success' : 'text-destructive'}`} />
                  <span className={`font-semibold ${outcome === 'YES' ? 'text-success' : 'text-destructive'}`}>
                    {outcome} Position
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">
                    ${poolLoading ? '--' : currentPrice.toFixed(3)} per share
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-3">USDC Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                placeholder="0.00"
                value={usdcAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsdcAmount(e.target.value)}
                className="pl-10 backdrop-blur-sm bg-glass-white/5 border-glass-border/30 text-white placeholder:text-gray-400 focus:border-gold/50"
                disabled={isLoading}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Shares Preview */}
          {usdcAmount && !isNaN(Number(usdcAmount)) && Number(usdcAmount) > 0 && (
            <div className={`mb-6 p-4 rounded-lg border ${outcome === 'YES' ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">You will receive:</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gold">{estimatedShares}</div>
                  <div className="text-xs text-gray-400">{outcome} shares</div>
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
                <p className="text-sm text-success">Transaction approved! Bet placed successfully 🎉</p>
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
              className={`flex-1 cursor-pointer ${
                outcome === 'YES'
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-destructive hover:bg-destructive/90 text-white'
              }`}
              disabled={isLoading || !usdcAmount || !isConnected || poolLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Transaction'
              )}
            </Button>
          </div>

          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="mt-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
              <p className="text-sm text-pink-300">Connect your wallet to place bets</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}