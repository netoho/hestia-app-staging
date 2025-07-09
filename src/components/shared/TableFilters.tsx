'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface TableFiltersProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange: (value: string) => void;
  selectFilters?: {
    key: string;
    label: string;
    placeholder: string;
    options: FilterOption[];
    value?: string;
    onChange: (value: string) => void;
  }[];
  onClear?: () => void;
  className?: string;
  showClearButton?: boolean;
}

export function TableFilters({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  selectFilters = [],
  onClear,
  className,
  showClearButton = true,
}: TableFiltersProps) {
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchValue, onSearchChange]);

  // Update local state when external searchValue changes
  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  const hasActiveFilters = () => {
    if (localSearchValue.trim()) return true;
    return selectFilters.some(filter => filter.value && filter.value !== 'all');
  };

  const handleClear = () => {
    setLocalSearchValue('');
    selectFilters.forEach(filter => filter.onChange('all'));
    onClear?.();
  };

  return (
    <Card className={cn("mb-6", className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={localSearchValue}
              onChange={(e) => setLocalSearchValue(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {/* Select Filters */}
            {selectFilters.map((filter) => (
              <div key={filter.key} className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filter.value || ''}
                  onValueChange={filter.onChange}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={filter.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {filter.label}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Clear Button */}
            {showClearButton && hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="mt-4 flex flex-wrap gap-2">
            {localSearchValue.trim() && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                <Search className="h-3 w-3" />
                Search: "{localSearchValue}"
              </div>
            )}
            {selectFilters
              .filter(filter => filter.value && filter.value !== 'all')
              .map((filter) => {
                const selectedOption = filter.options.find(opt => opt.value === filter.value);
                return (
                  <div
                    key={filter.key}
                    className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                  >
                    <Filter className="h-3 w-3" />
                    {filter.label}: {selectedOption?.label}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}