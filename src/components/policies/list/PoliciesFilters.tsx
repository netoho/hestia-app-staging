'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PolicyStatus } from '@/lib/enums';

interface PoliciesFiltersProps {
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

/**
 * Filter controls for policies list
 * Includes search input (with debounce) and status dropdown
 */
export default function PoliciesFilters({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: PoliciesFiltersProps) {
  // Local state for immediate input update (UX)
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Sync local state when prop changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Debounce: only trigger onSearchChange after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, onSearchChange]);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl">Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar protección, dirección, actor o email..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={PolicyStatus.DRAFT}>Borrador</SelectItem>
              <SelectItem value={PolicyStatus.COLLECTING_INFO}>Recopilando Info</SelectItem>
              <SelectItem value={PolicyStatus.UNDER_INVESTIGATION}>En Investigación</SelectItem>
              <SelectItem value={PolicyStatus.APPROVED}>Aprobado</SelectItem>
              <SelectItem value={PolicyStatus.ACTIVE}>Activa</SelectItem>
              <SelectItem value={PolicyStatus.EXPIRED}>Expirada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
