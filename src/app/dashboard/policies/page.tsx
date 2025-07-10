
'use client';

import { useState } from 'react';
import { PolicyInitiateDialog } from '@/components/dialogs/PolicyInitiateDialog';
import { PolicyTable } from '@/components/shared/PolicyTable';

export default function PoliciesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePolicyCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy Applications</h1>
          <p className="text-muted-foreground">
            Manage tenant policy applications and track their progress.
          </p>
        </div>
        <PolicyInitiateDialog onPolicyCreated={handlePolicyCreated} />
      </div>

      <PolicyTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
