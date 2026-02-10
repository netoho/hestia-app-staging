'use client';

import InvestigationCard from './InvestigationCard';
import type { InvestigationListItem } from './types';

interface InvestigationsCardsProps {
  investigations: InvestigationListItem[];
  policyId: string;
  onArchive: (investigation: InvestigationListItem) => void;
}

export default function InvestigationsCards({
  investigations,
  policyId,
  onArchive,
}: InvestigationsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
      {investigations.map((inv) => (
        <InvestigationCard
          key={inv.id}
          investigation={inv}
          policyId={policyId}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
