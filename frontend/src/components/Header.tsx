import { useState } from 'react';
import { Wallet, Menu, X, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMetaMaskWallet } from '@/hooks/useMetaMaskWallet';

interface HeaderProps {
  className?: string;
  currentPage?: 'markets' | 'portfolio' | 'leaderboard';
  onNavigate?: (page: 'markets' | 'portfolio' | 'leaderboard') => void;
}

export function Header({ className, currentPage = 'markets', onNavigate }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const { 
    isConnected, 
    formattedAddress, 
    balance, 
    isLoading, 
    connect, 
    disconnect 
  } = useMetaMaskWallet();

  return (
    <header className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" style={{color: 'hsl(var(--primary))'}} />
          <span className="text-xl font-bold" style={{color: 'hsl(var(--primary))'}}>Loaf Markets</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => onNavigate?.('markets')}
            className={cn(
              "text-sm font-medium transition-colors px-3 py-2 rounded-lg cursor-pointer",
              currentPage === 'markets'
                ? "bg-pink-500/20 border border-pink-500/30 text-pink-300"
                : "text-gray-300 hover:text-[hsl(45_100%_60%)]"
            )}
          >
            Markets
          </button>
          <button 
            onClick={() => onNavigate?.('portfolio')}
            className={cn(
              "text-sm font-medium transition-colors px-3 py-2 rounded-lg cursor-pointer",
              currentPage === 'portfolio'
                ? "bg-pink-500/20 border border-pink-500/30 text-pink-300"
                : "text-gray-300 hover:text-[hsl(45_100%_60%)]"
            )}
          >
            Portfolio
          </button>
          <button 
            onClick={() => onNavigate?.('leaderboard')}
            className={cn(
              "text-sm font-medium transition-colors px-3 py-2 rounded-lg cursor-pointer",
              currentPage === 'leaderboard'
                ? "bg-pink-500/20 border border-pink-500/30 text-pink-300"
                : "text-gray-300 hover:text-[hsl(45_100%_60%)]"
            )}
          >
            Leaderboard
          </button>
        </nav>

        {/* Wallet Section */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium" style={{color: 'hsl(var(--primary))'}}>{balance} ETH</div>
                <div className="text-xs" style={{color: 'hsl(var(--primary))'}}>{formattedAddress}</div>
              </div>
              <Button 
                variant="outline" 
                onClick={disconnect} 
                disabled={isLoading}
                className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={connect} 
              className="gap-2 cursor-pointer hover:bg-primary/90 transition-colors" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 space-y-3">
            <button 
              onClick={() => {
                onNavigate?.('markets');
                setIsMenuOpen(false);
              }}
              className={cn(
                "block text-sm font-medium transition-colors px-3 py-2 rounded-lg w-full text-left cursor-pointer",
                currentPage === 'markets'
                  ? "bg-pink-500/20 border border-pink-500/30 text-pink-300"
                  : "text-gray-300 hover:text-[hsl(45_100%_60%)]"
              )}
            >
              Markets
            </button>
            <button 
              onClick={() => {
                onNavigate?.('portfolio');
                setIsMenuOpen(false);
              }}
              className={cn(
                "block text-sm font-medium transition-colors px-3 py-2 rounded-lg w-full text-left cursor-pointer",
                currentPage === 'portfolio'
                  ? "bg-pink-500/20 border border-pink-500/30 text-pink-300"
                  : "text-gray-300 hover:text-[hsl(45_100%_60%)]"
              )}
            >
              Portfolio
            </button>
            <button 
              onClick={() => {
                onNavigate?.('leaderboard');
                setIsMenuOpen(false);
              }}
              className={cn(
                "block text-sm font-medium transition-colors px-3 py-2 rounded-lg w-full text-left cursor-pointer",
                currentPage === 'leaderboard'
                  ? "bg-pink-500/20 border border-pink-500/30 text-pink-300"
                  : "text-gray-300 hover:text-[hsl(45_100%_60%)]"
              )}
            >
              Leaderboard
            </button>
            
            {isConnected && (
              <div className="pt-3 border-t space-y-1">
                <div className="text-sm font-medium" style={{color: 'hsl(var(--primary))'}}>{balance} ETH</div>
                <div className="text-xs" style={{color: 'hsl(var(--primary))'}}>{formattedAddress}</div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}