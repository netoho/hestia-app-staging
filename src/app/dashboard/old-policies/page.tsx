
'use client';

import { useState } from 'react';
import { PolicyInitiateDialog } from '@/components/dialogs/PolicyInitiateDialog';
import { PolicyTable } from '@/components/shared/PolicyTable';
import { t } from '@/lib/i18n';

export default function PoliciesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePolicyCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.pages.policies.title}</h1>
          <p className="text-muted-foreground">
            {t.pages.policies.subtitle}
          </p>
        </div>
        <PolicyInitiateDialog onPolicyCreated={handlePolicyCreated} />
      </div>

      <PolicyTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
