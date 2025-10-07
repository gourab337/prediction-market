import { Trophy, Star, Medal, Crown, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="backdrop-blur-md bg-glass-white/10 border-b border-glass-border/30 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gold">Leaderboard</h1>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-pink-500/20 border-pink-500/30 backdrop-blur-sm text-pink-300">
              Top Traders
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Coming Soon Card */}
        <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            {/* Icon Animation */}
            <div className="relative mb-8">
              <div className="absolute inset-0 animate-pulse">
                <Trophy className="h-24 w-24 text-gold/30 mx-auto" />
              </div>
              <Trophy className="h-24 w-24 text-gold mx-auto relative z-10" />
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-gold mb-4">Coming Soon</h2>
            
            {/* Description */}
            <p className="text-xl text-white mb-6">
              The leaderboard is currently under development
            </p>
            
            <p className="text-gray-300 mb-8 max-w-lg mx-auto">
              Soon you'll be able to see top traders, track performance rankings, 
              and compete with the best prediction market participants. Stay tuned for exciting updates!
            </p>

            {/* Feature Preview Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-gold/10 border border-gold/20">
                  <Crown className="h-6 w-6 text-gold" />
                </div>
                <span className="text-sm text-gray-300">Top Performers</span>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-gold/10 border border-gold/20">
                  <Medal className="h-6 w-6 text-gold" />
                </div>
                <span className="text-sm text-gray-300">Rankings</span>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-gold/10 border border-gold/20">
                  <TrendingUp className="h-6 w-6 text-gold" />
                </div>
                <span className="text-sm text-gray-300">Performance</span>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-full bg-gold/10 border border-gold/20">
                  <Users className="h-6 w-6 text-gold" />
                </div>
                <span className="text-sm text-gray-300">Community</span>
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="backdrop-blur-sm border-glass-border/50 hover:border-gold/30 hover:bg-gold/10"
                disabled
              >
                <Star className="h-4 w-4 mr-2" />
                Notify Me When Ready
              </Button>
              
              <p className="text-xs text-gray-400">
                Follow us for updates and announcements
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
            <CardContent className="p-6 text-center">
              <Crown className="h-12 w-12 text-gold mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Hall of Fame</h3>
              <p className="text-gray-300 text-sm">
                Celebrate the most successful traders and their winning streaks
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-gold mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Live Rankings</h3>
              <p className="text-gray-300 text-sm">
                Real-time leaderboards based on profits, accuracy, and volume
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-gold mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Social Features</h3>
              <p className="text-gray-300 text-sm">
                Follow top traders and learn from their strategies
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}