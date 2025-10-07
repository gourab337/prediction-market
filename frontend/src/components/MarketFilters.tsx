import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarketFiltersProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string | null) => void;
  selectedCategory: string | null;
}

const categories = [
  { id: null, label: 'All Markets', count: 0 },
  { id: 'crypto', label: 'Crypto', count: 0 },
  { id: 'sports', label: 'Sports', count: 0 },
  { id: 'politics', label: 'Politics', count: 0 },
  { id: 'economy', label: 'Economy', count: 0 },
  { id: 'culture', label: 'Culture', count: 0 },
  { id: 'gaming', label: 'Gaming', count: 0 },
  { id: 'tech', label: 'Tech & Science', count: 0 },
];

export function MarketFilters({ onSearch, onCategoryChange, selectedCategory }: MarketFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id || 'all'}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "transition-all duration-200",
              selectedCategory === category.id 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {category.label}
            {category.count > 0 && (
              <span className="ml-1 text-xs opacity-70">
                ({category.count})
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}