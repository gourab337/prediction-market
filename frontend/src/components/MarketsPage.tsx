import { useState, useMemo } from 'react';
import { AlertCircle, Plus, RefreshCw, TrendingUp, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchAndFilter } from '@/components/SearchAndFilter';
import { MarketCard } from '@/components/MarketCard';
import { CreateMarketModal } from '@/components/CreateMarketModal';
import { useMarkets } from '@/hooks/api';
import { useMarketsStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Market } from '@/types/api';

export function MarketsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch markets data
  const { data: markets, isLoading, error } = useMarkets();
  const { selectMarket } = useMarketsStore();

  const handleRefresh = () => {
    window.location.reload();
  };

  // Filter markets based on search and filters
  const filteredMarkets = useMemo(() => {
    if (!markets) return [];

    return markets.filter((market) => {
      // Search filter
      const marketText = `${market.question || market.description || market.name} ${market.name}`.toLowerCase();
      const matchesSearch = !searchTerm || marketText.includes(searchTerm.toLowerCase());

      // Category filter (simplified - in real app would need market categories)
      const matchesCategory = selectedCategory === 'all' || 
        marketText.includes(selectedCategory.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (selectedStatus !== 'all') {
        const now = Date.now();
        const endTime = market.endTime * 1000;
        
        switch (selectedStatus) {
          case 'active':
            matchesStatus = endTime > now;
            break;
          case 'expired':
            matchesStatus = endTime <= now;
            break;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [markets, searchTerm, selectedCategory, selectedStatus]);

  const handleMarketSelect = (market: Market) => {
    selectMarket(market);
    // TODO: Navigate to market detail page
    console.log('Selected market:', market);
  };

  const handleCreateMarket = () => {
    setIsCreateModalOpen(true);
  };

  const getActiveMarketsCount = () => {
    if (!markets) return 0;
    return markets.filter(m => m.endTime * 1000 > Date.now()).length;
  };

  const getExpiredMarketsCount = () => {
    if (!markets) return 0;
    return markets.filter(m => m.endTime * 1000 <= Date.now()).length;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <Card className="backdrop-blur-md bg-glass-gradient border-destructive/30 shadow-glass">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Failed to load markets</h3>
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
              <h1 className="text-3xl font-bold text-gold">Loaf Markets</h1>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-pink-500/20 border-pink-500/30 backdrop-blur-sm text-pink-300">
                Prediction Markets
              </span>
            </div>
            
            <div className="flex gap-2">
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
              <Button 
                onClick={handleCreateMarket} 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Market
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card 
            className={cn(
              "backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass transition-colors cursor-pointer hover:scale-[1.02]",
              selectedStatus === 'all' 
                ? "border-pink-500/50 bg-pink-500/10" 
                : "hover:border-primary/30"
            )}
            onClick={() => setSelectedStatus('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold">{markets?.length || 0}</div>
                  <div className="text-sm text-white">Total Markets</div>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass transition-colors cursor-pointer hover:scale-[1.02]",
              selectedStatus === 'active' 
                ? "border-pink-500/50 bg-pink-500/10" 
                : "hover:border-success/30"
            )}
            onClick={() => setSelectedStatus('active')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold">{getActiveMarketsCount()}</div>
                  <div className="text-sm text-white">Active Markets</div>
                </div>
                <Clock className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass transition-colors cursor-pointer hover:scale-[1.02]",
              selectedStatus === 'expired' 
                ? "border-pink-500/50 bg-pink-500/10" 
                : "hover:border-gold/30"
            )}
            onClick={() => setSelectedStatus('expired')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold">{getExpiredMarketsCount()}</div>
                  <div className="text-sm text-white">Expired</div>
                </div>
                <Check className="w-8 h-8 text-gold" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* Markets Grid */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="text-md text-pink-300 mb-4">Loading Markets...</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="backdrop-blur-md bg-glass-gradient border-pink-500/20 shadow-glass overflow-hidden">
                  <CardContent className="p-0">
                    <div className="animate-pulse">
                      {/* Hero image skeleton */}
                      <div className="h-48 bg-gradient-to-br from-pink-400/20 to-purple-500/20 relative">
                        <div className="absolute inset-0 bg-pink-300/10"></div>
                        {/* Percentage badge skeleton */}
                        <div className="absolute top-4 right-4">
                          <div className="h-8 w-16 bg-gold/30 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Content skeleton */}
                      <div className="p-6 space-y-4">
                        {/* Title skeleton */}
                        <div className="h-6 bg-pink-400/30 rounded w-4/5"></div>
                        
                        {/* Description skeleton */}
                        <div className="space-y-2">
                          <div className="h-4 bg-pink-300/20 rounded w-full"></div>
                          <div className="h-4 bg-pink-300/20 rounded w-3/4"></div>
                        </div>
                        
                        {/* Stats skeleton */}
                        <div className="flex justify-between items-center pt-4 border-t border-pink-500/20">
                          <div className="space-y-1">
                            <div className="h-3 bg-pink-300/20 rounded w-16"></div>
                            <div className="h-5 bg-gold/30 rounded w-20"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-3 bg-pink-300/20 rounded w-20"></div>
                            <div className="h-5 bg-gold/30 rounded w-24"></div>
                          </div>
                        </div>
                        
                        {/* Button skeletons */}
                        <div className="grid grid-cols-2 gap-3 pt-4">
                          <div className="h-10 bg-success/20 border border-success/30 rounded-lg"></div>
                          <div className="h-10 bg-destructive/20 border border-destructive/30 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">No markets found</h3>
              <p className="text-gray-300 mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? "Try adjusting your search or filters"
                  : "No markets available at the moment"}
              </p>
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' ? (
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  }}
                  variant="outline"
                  className="backdrop-blur-sm border-glass-border/50 hover:border-gold/30 cursor-pointer"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateMarket} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Market
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.address}
                market={market}
                onSelect={handleMarketSelect}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Market Modal */}
      <CreateMarketModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}