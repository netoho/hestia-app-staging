'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function SectionHeader({ title, onRefresh, isRefreshing }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 px-2"
          title="Actualizar sección"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}

export default SectionHeader;
