'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import InvestigationsCards from './InvestigationsCards';
import InvestigationsTable from './InvestigationsTable';
import ArchiveInvestigationDialog from './ArchiveInvestigationDialog';
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
  const [archiveTarget, setArchiveTarget] = useState<InvestigationListItem | null>(null);

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

  const handleArchiveSuccess = () => {
    setArchiveTarget(null);
    onRefresh();
  };

  return (
    <>
      <InvestigationsCards
        investigations={investigations}
        policyId={policyId}
        onArchive={setArchiveTarget}
      />
      <InvestigationsTable
        investigations={investigations}
        policyId={policyId}
        onArchive={setArchiveTarget}
      />

      <ArchiveInvestigationDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        investigation={archiveTarget}
        onSuccess={handleArchiveSuccess}
      />
    </>
  );
}
