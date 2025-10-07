import { AlertCircle, Clock, Wallet, RefreshCw, Activity, Coins } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMetaMaskWallet } from '@/hooks/useMetaMaskWallet';
import type { PortfolioMarket } from '@/types/api';
import { useMyPortfolio, useBalance, useMintUSDC } from '@/hooks/api';
import { SellSharesModal } from './SellSharesModal';

export function PortfolioPage() {
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellMarket, setSellMarket] = useState<PortfolioMarket | null>(null);
  const [sellOutcome, setSellOutcome] = useState<'YES' | 'NO' | null>(null);
  const [maxShares, setMaxShares] = useState(0);
  const { isConnected, formattedAddress } = useMetaMaskWallet();
  
  // Fetch portfolio data from API
  const { data: portfolio, isLoading, error } = useMyPortfolio();
  const { data: balance } = useBalance();
  const mintUSDC = useMintUSDC();

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 text-gold mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Connect Your Wallet</h3>
              <p className="text-gray-300 mb-4">
                Please connect your wallet to view your portfolio
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <Card className="backdrop-blur-md bg-glass-gradient border-destructive/30 shadow-glass">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Failed to load portfolio</h3>
              <p className="text-gray-300 mb-4">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                className="backdrop-blur-sm border-glass-border/50 hover:border-gold/30 cursor-pointer"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="backdrop-blur-md bg-glass-white/10 border-b border-glass-border/30 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gold">Portfolio</h1>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-pink-500/20 border-pink-500/30 backdrop-blur-sm text-pink-300">
                {formattedAddress}
              </span>
            </div>
            
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="backdrop-blur-sm border-glass-border/50 hover:border-gold/30 cursor-pointer"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="backdrop-blur-md bg-glass-gradient border-pink-500/30 shadow-glass hover:border-pink-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold">
                    {portfolio?.totalValue ? `$${parseFloat(portfolio.totalValue).toFixed(2)}` : '$0.00'}
                  </div>
                  <div className="text-sm text-pink-300">Total Portfolio Value</div>
                </div>
                <Activity className="w-8 h-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-glass-gradient border-pink-500/30 shadow-glass hover:border-pink-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold">
                    {balance?.usdcBalance ? `$${parseFloat(balance.usdcBalance).toFixed(2)}` : '$0.00'}
                  </div>
                  <div className="text-sm text-pink-300">USDC Balance</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => mintUSDC.mutate()}
                    disabled={mintUSDC.isPending || !isConnected}
                    size="sm"
                    className="backdrop-blur-sm bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 hover:text-pink-200 cursor-pointer"
                  >
                    {mintUSDC.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Coins className="h-4 w-4" />
                    )}
                  </Button>
                  <Wallet className="w-8 h-8 text-pink-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-glass-gradient border-pink-500/30 shadow-glass hover:border-pink-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold">
                    {portfolio?.markets?.length || 0}
                  </div>
                  <div className="text-sm text-pink-300">Active Markets</div>
                </div>
                <Clock className="w-8 h-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positions */}
        <Card className="backdrop-blur-md bg-glass-gradient border-pink-500/30 shadow-glass">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-pink-300 mb-4">Your Positions</h3>

            {isLoading ? (
              <div className="space-y-4">
                <div className="text-md text-pink-300 mb-4">Loading Portfolio...</div>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="backdrop-blur-md bg-glass-gradient border-pink-500/20 shadow-glass">
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-4">
                        {/* Market header skeleton */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="h-5 bg-pink-400/30 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-pink-300/20 rounded w-1/2"></div>
                          </div>
                          <div className="text-right">
                            <div className="h-6 bg-gold/30 rounded w-20 mb-1"></div>
                            <div className="h-3 bg-pink-300/20 rounded w-16"></div>
                          </div>
                        </div>
                        {/* Position cards skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                            <div className="h-4 bg-success/20 rounded w-24 mb-2"></div>
                            <div className="h-6 bg-success/30 rounded w-20 mb-1"></div>
                            <div className="h-3 bg-success/20 rounded w-32"></div>
                          </div>
                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                            <div className="h-4 bg-destructive/20 rounded w-24 mb-2"></div>
                            <div className="h-6 bg-destructive/30 rounded w-20 mb-1"></div>
                            <div className="h-3 bg-destructive/20 rounded w-32"></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : portfolio?.markets?.length === 0 || !portfolio?.markets ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2 text-white">No Positions Found</h4>
                <p className="text-gray-300 mb-4">
                  You haven't placed any bets yet. Start by exploring the markets!
                </p>
                <Button 
                  variant="outline"
                  className="backdrop-blur-sm border-glass-border/50 hover:border-gold/30 cursor-pointer"
                >
                  Browse Markets
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {portfolio?.message && (
                  <Card className="backdrop-blur-md bg-glass-white/10 border-glass-border/30 mb-4">
                    <CardContent className="p-4">
                      <p className="text-gray-300">{portfolio.message}</p>
                    </CardContent>
                  </Card>
                )}
                
                <div className="space-y-4">
                  {portfolio?.markets?.map((market) => (
                    <Card key={market.address} className="backdrop-blur-md bg-glass-gradient border-pink-500/20 shadow-glass hover:border-pink-500/40 transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                          {/* Market Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                              <h5 className="font-medium text-white mb-2">{market.name}</h5>
                              <div className="text-sm text-pink-300/70 mb-2 font-mono">
                                {market.address}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gold">${parseFloat(market.value).toFixed(2)}</div>
                              <div className="text-sm text-pink-300">Total Value</div>
                            </div>
                          </div>
                          
                          {/* Position Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* YES Position */}
                            {parseFloat(market.positions.yesShares.amount) > 0 && (
                              <div
                                className="p-4 rounded-lg bg-success/10 border border-success/30 hover:bg-success/15 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSellMarket(market);
                                  setSellOutcome('YES');
                                  setMaxShares(parseFloat(market.positions.yesShares.amount));
                                  setSellModalOpen(true);
                                }}
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-bold text-success bg-success/20 px-2 py-1 rounded">YES Position</span>
                                  <span className="text-xs text-success/80 font-medium">{market.positions.yesShares.impliedProbability}</span>
                                </div>
                                <div className="text-xl font-bold text-white mb-2">${parseFloat(market.positions.yesShares.currentValue).toFixed(2)}</div>
                                <div className="text-sm text-green-200">
                                  {parseFloat(market.positions.yesShares.amount).toFixed(2)} shares @ ${market.positions.yesShares.currentPrice.toFixed(3)}
                                </div>
                              </div>
                            )}
                            
                            {/* NO Position */}
                            {parseFloat(market.positions.noShares.amount) > 0 && (
                              <div
                                className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 hover:bg-destructive/15 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSellMarket(market);
                                  setSellOutcome('NO');
                                  setMaxShares(parseFloat(market.positions.noShares.amount));
                                  setSellModalOpen(true);
                                }}
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-bold text-destructive bg-destructive/20 px-2 py-1 rounded">NO Position</span>
                                  <span className="text-xs text-destructive/80 font-medium">{market.positions.noShares.impliedProbability}</span>
                                </div>
                                <div className="text-xl font-bold text-white mb-2">${parseFloat(market.positions.noShares.currentValue).toFixed(2)}</div>
                                <div className="text-sm text-red-200">
                                  {parseFloat(market.positions.noShares.amount).toFixed(2)} shares @ ${market.positions.noShares.currentPrice.toFixed(3)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    {/* Sell Shares Modal */}
    {sellModalOpen && sellMarket && sellOutcome && (
      <SellSharesModal
        isOpen={sellModalOpen}
        onClose={() => {
          setSellModalOpen(false);
          setSellMarket(null);
          setSellOutcome(null);
        }}
        market={sellMarket}
        outcome={sellOutcome}
        maxShares={maxShares}
      />
    )}
  </div>
  );
}