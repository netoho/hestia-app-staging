
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { t } from '@/lib/i18n';

interface PolicyInitiateDialogProps {
  onPolicyCreated?: () => void;
}

export function PolicyInitiateDialog({ onPolicyCreated }: PolicyInitiateDialogProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard/policies/new');
  };

  return (
    <Button onClick={handleClick}>
      <Plus className="h-4 w-4 mr-2" />
      {t.pages.policies.initiateDialog.trigger}
    </Button>
  );
}
