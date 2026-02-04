'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import InvestigationsCards from './InvestigationsCards';
import InvestigationsTable from './InvestigationsTable';
import DeleteInvestigationDialog from './DeleteInvestigationDialog';
import type { InvestigationListItem } from './types';

interface InvestigationsListProps {
  investigations: InvestigationListItem[];
  policyId: string;
  loading: boolean;
  onRefresh: () => void;
}

export default function InvestigationsList({
  investigations,
  policyId,
  loading,
  onRefresh,
}: InvestigationsListProps) {
  const [deleteTarget, setDeleteTarget] = useState<InvestigationListItem | null>(null);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Empty state
  if (investigations.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No hay investigaciones"
        description="Crea una nueva investigación para comenzar"
      />
    );
  }

  const handleDeleteSuccess = () => {
    setDeleteTarget(null);
    onRefresh();
  };

  return (
    <>
      <InvestigationsCards
        investigations={investigations}
        policyId={policyId}
        onDelete={setDeleteTarget}
      />
      <InvestigationsTable
        investigations={investigations}
        policyId={policyId}
        onDelete={setDeleteTarget}
      />

      <DeleteInvestigationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        investigation={deleteTarget}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
