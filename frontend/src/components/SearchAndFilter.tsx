import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  className?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Markets' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'sports', label: 'Sports' },
  { value: 'politics', label: 'Politics' },
  { value: 'economy', label: 'Economy' },
  { value: 'culture', label: 'Culture' },
  { value: 'tech', label: 'Tech & Science' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

export function SearchAndFilter({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  className
}: SearchAndFilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  const clearFilters = () => {
    onSearchChange('');
    onCategoryChange('all');
    onStatusChange('all');
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all';

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-0 rounded-lg bg-glass-white/20 backdrop-blur-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:bg-glass-white/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle and Clear */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 backdrop-blur-sm bg-glass-white/20 border-glass-border/30 hover:border-gold/30 hover:bg-gold/10"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-300 hover:text-gold hover:bg-gold/10 backdrop-blur-sm cursor-pointer"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter Options */}
      {showFilters && (
        <Card className="backdrop-blur-md bg-glass-gradient border-glass-border/50 shadow-glass">
          <CardContent className="p-4 space-y-4">
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gold">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Button
                    key={category.value}
                    variant={selectedCategory === category.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onCategoryChange(category.value)}
                    className={cn(
                      "text-xs backdrop-blur-sm transition-all duration-300",
                      selectedCategory === category.value
                        ? "bg-gold hover:bg-gold/90 text-black shadow-glow-gold"
                        : "bg-glass-white/20 border-glass-border/30 hover:border-gold/30 hover:bg-gold/10 text-foreground"
                    )}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gold">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <Button
                    key={status.value}
                    variant={selectedStatus === status.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onStatusChange(status.value)}
                    className={cn(
                      "text-xs backdrop-blur-sm transition-all duration-300",
                      selectedStatus === status.value
                        ? "bg-gold hover:bg-gold/90 text-black shadow-glow-gold"
                        : "bg-glass-white/20 border-glass-border/30 hover:border-gold/30 hover:bg-gold/10 text-foreground"
                    )}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}