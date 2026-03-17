'use client';

import { use } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { receipts as rt } from '@/lib/i18n/pages/receipts';
import { t } from '@/lib/i18n';
import ReceiptDashboard from '@/components/portal/receipts/ReceiptDashboard';

interface ReceiptsPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminReceiptsPage({ params }: ReceiptsPageProps) {
  const { id: policyId } = use(params);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const userLoading = sessionStatus === 'loading';
  const user = session?.user as any;

  const { data: policy, isLoading: policyLoading } = trpc.policy.getById.useQuery(
    { id: policyId },
    { enabled: !!policyId },
  );

  const { data: receiptData, isLoading: receiptsLoading } = trpc.receipt.listByPolicy.useQuery(
    { policyId },
    { enabled: !!policyId },
  );

  const utils = trpc.useUtils();

  // Auth check
  if (!userLoading && !user) redirect('/login');
  if (!userLoading && user && !['ADMIN', 'STAFF'].includes(user.role)) redirect('/dashboard');

  if (policyLoading || receiptsLoading) {
    return (
      <div className="container mx-auto w-full">
        <div className="flex justify-center items-center h-64" role="status" aria-label={t.misc.loading}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="container mx-auto w-full">
        <p className="text-center text-muted-foreground py-8">{rt.admin.policyNotFound}</p>
      </div>
    );
  }

  if (policy.status !== 'ACTIVE' && policy.status !== 'EXPIRED') {
    return (
      <div className="container mx-auto w-full space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/policies/${policyId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {rt.admin.backToPolicy}
        </Button>
        <p className="text-center text-muted-foreground py-8">{rt.admin.notApproved}</p>
      </div>
    );
  }

  if (!receiptData) return null;

  const tenantName = receiptData.tenant
    ? (receiptData.tenant as any).companyName || `${(receiptData.tenant as any).firstName || ''} ${(receiptData.tenant as any).paternalLastName || ''}`.trim()
    : '';

  // Transform listByPolicy data into PolicyData shape for ReceiptDashboard
  const policyData = {
    policyId: policyId,
    policyNumber: receiptData.policyNumber,
    tenantId: (receiptData.tenant as any)?.id || '',
    rentAmount: receiptData.rentAmount ?? null,
    contractLength: receiptData.contractLength ?? null,
    propertyAddress: (receiptData.propertyAddress as any)?.propertyAddressDetails ?? null,
    requiredReceiptTypes: receiptData.requiredTypes,
    receiptConfigs: receiptData.receiptConfigs || [],
    receipts: receiptData.receipts,
    activatedAt: receiptData.activatedAt ?? policy.activatedAt ?? null,
  };

  return (
    <div className="container mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/policies/${policyId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{rt.admin.title}</h1>
          <p className="text-sm text-muted-foreground">
            {rt.admin.policySubtitle(policy.policyNumber)}
            {tenantName && <span> — {tenantName}</span>}
          </p>
        </div>
      </div>

      <ReceiptDashboard
        mode="admin"
        tenantName={tenantName}
        policies={[policyData]}
        refetchData={() => {
          utils.receipt.listByPolicy.invalidate({ policyId });
          utils.receipt.getConfig.invalidate({ policyId });
        }}
      />
    </div>
  );
}
