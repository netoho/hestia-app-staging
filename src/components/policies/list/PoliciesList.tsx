'use client';

import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import PoliciesCards from './PoliciesCards';
import PoliciesTable from './PoliciesTable';
import { PolicyListItem } from './types';

interface PoliciesListProps {
  policies: PolicyListItem[];
  loading: boolean;
}

/**
 * Main list component that handles loading, empty state, and view switching
 */
export default function PoliciesList({ policies, loading }: PoliciesListProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="Cargando">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Empty state
  if (policies.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No se encontraron protecciones"
        description="Cree una nueva protección para comenzar"
      />
    );
  }

  // Render both mobile and desktop views
  return (
    <>
      <PoliciesCards policies={policies} />
      <PoliciesTable policies={policies} />
    </>
  );
}
