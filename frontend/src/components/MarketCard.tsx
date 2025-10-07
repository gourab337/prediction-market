import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DollarSign, Clock } from 'lucide-react';
import { PlaceBetModal } from '@/components/PlaceBetModal';
import type { Market } from '@/types/api';
import { useMarketPool } from '@/hooks/api';

interface MarketCardProps {
  market: Market;
  onSelect?: (market: Market) => void;
}

export function MarketCard({ market, onSelect }: MarketCardProps) {
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO' | null>(null);
  const { data: poolData, isLoading: poolLoading } = useMarketPool(market.address);
  
  // Calculate percentages from pool data
  const yesPercentage = poolData ? 
    (parseFloat(poolData.yesPool.price) / (parseFloat(poolData.yesPool.price) + parseFloat(poolData.noPool.price)) * 100) : 50;
  const noPercentage = 100 - yesPercentage;

  // Calculate total volume
  const totalVolume = poolData ? 
    parseFloat(poolData.yesPool.reserveUSDC) + parseFloat(poolData.noPool.reserveUSDC) : 0;

  const isExpired = market.endTime ? Date.now() > market.endTime * 1000 : false;
  const isResolved = market.resolved ?? false;

  // Mock participant count (would come from API in real app)
  const participantCount = Math.floor(Math.random() * 200) + 20;

  const handleBetClick = (outcome: 'YES' | 'NO') => {
  setSelectedOutcome(outcome);
  setIsBetModalOpen(true);
  };

  const handleCloseBetModal = () => {
    setIsBetModalOpen(false);
    setSelectedOutcome(null);
  };

  return (
    <>
      <Card className={cn(
        "group relative cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-gray-900/95 border-gray-700/50 hover:border-gray-600/50",
        isExpired && "border-red-500/30"
      )} onClick={() => {
        onSelect?.(market);
      }}>
        {/* Hero Image Section */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src="https://assets-au-01.kc-usercontent.com/1c344202-e9c0-02e1-35fd-d94199aa6f2b/0c33902e-48ed-4527-aae0-af79ee4e1d75/AS_2025_NRLGF_New_1920x1080.jpg?w=3840&q=100&auto=format"
            alt="Market hero"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
          {/* Currency Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-blue-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
              <DollarSign className="w-2.5 h-2.5 text-blue-900" />
            </div>
            <span className="text-white text-sm font-medium">USDC</span>
          </div>
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isExpired && (
              <span className="text-xs font-medium text-red-300 bg-red-500/20 border border-red-500/30 px-2 py-1 rounded-full backdrop-blur-sm">
                EXPIRED
              </span>
            )}
            {!isExpired && !isResolved && (
              <span className="text-xs font-medium text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-full backdrop-blur-sm">
                LIVE
              </span>
            )}
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          {/* Market Question */}
          <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2">
            {market.question || market.description || market.name}
          </h3>
          {/* Percentage Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {poolLoading ? '--' : `${yesPercentage.toFixed(0)}%`}
              </span>
              <span className="text-2xl font-bold text-white">
                {poolLoading ? '--' : `${noPercentage.toFixed(0)}%`}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="relative w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${yesPercentage}%` }}
              />
              <div 
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-pink-500 to-pink-400 transition-all duration-500 rounded-full"
                style={{ width: `${noPercentage}%` }}
              />
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 border-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleBetClick('YES');
              }}
              disabled={isExpired}
            >
              YES
            </Button>
            <Button 
              className="flex-1 h-12 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl transition-all duration-300 border-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleBetClick('NO');
              }}
              disabled={isExpired}
            >
              NO
            </Button>
          </div>
          {/* Bottom Stats */}
          <div className="flex items-center justify-between text-sm text-gray-400 pt-2">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full border border-gray-700" />
                <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-full border border-gray-700" />
              </div>
              <span className="ml-1 font-medium">+{participantCount}</span>
            </div>
            <div className="flex items-center gap-1 text-blue-400 font-medium">
              <DollarSign className="w-4 h-4" />
              <span>${poolLoading ? '--' : totalVolume.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{market.endTime ? new Date(market.endTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Betting Modal rendered outside the Card to avoid parent style interference */}
      <PlaceBetModal
        isOpen={isBetModalOpen}
        onClose={handleCloseBetModal}
        market={market}
        selectedOutcome={selectedOutcome}
      />
    </>
  );
}