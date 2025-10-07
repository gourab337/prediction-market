import { AlertCircle, Plus, X, Zap, Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 backdrop-blur-md bg-glass-gradient border-pink-500/30 shadow-glass">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gold/20 border border-gold/30">
                <Plus className="h-5 w-5 text-gold" />
              </div>
              <h3 className="text-lg font-semibold text-white">Create Market</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-pink-500/20 cursor-pointer"
            >
              <X className="h-4 w-4 text-gray-300" />
            </Button>
          </div>

          {/* Coming Soon Content */}
          <div className="text-center mb-6">
            <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20 mb-4">
              <AlertCircle className="h-12 w-12 text-pink-400 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-white mb-2">Coming Soon!</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                The Create Market feature is currently under development. This will include a multi-step form for market creation and liquidity management.
              </p>
            </div>

            {/* Features Preview */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-glass-white/5 border border-glass-border/20">
                <Database className="h-5 w-5 text-gold" />
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-white">Market Configuration</div>
                  <div className="text-xs text-gray-400">Question, end date, resolution source</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-glass-white/5 border border-glass-border/20">
                <Zap className="h-5 w-5 text-gold" />
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-white">Initial Liquidity</div>
                  <div className="text-xs text-gray-400">Add funds to enable trading</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-glass-white/5 border border-glass-border/20">
                <Settings className="h-5 w-5 text-gold" />
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-white">Advanced Settings</div>
                  <div className="text-xs text-gray-400">Fees, trading limits, and more</div>
                </div>
              </div>
            </div>

            {/* Current Alternative */}
            <div className="p-4 rounded-lg bg-glass-white/5 border border-glass-border/20 mb-4">
              <p className="text-sm text-gray-300 mb-2">
                <strong className="text-white">For now:</strong> Markets can be created using the Postman collection provided with the backend API.
              </p>
              <p className="text-xs text-gray-400">
                This allows full control over market parameters while we build the frontend interface.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 backdrop-blur-sm border-glass-border/50 hover:border-gold/30 cursor-pointer"
            >
              Got it
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-gold cursor-pointer"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}