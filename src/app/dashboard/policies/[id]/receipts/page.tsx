'use client';

import { use, useCallback } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { receipts as rt } from '@/lib/i18n/pages/receipts';
import { t } from '@/lib/i18n';
import MonthReceiptCard from '@/components/portal/receipts/MonthReceiptCard';
import ReceiptHistoryList from '@/components/portal/receipts/ReceiptHistoryList';

interface ReceiptsPageProps {
  params: Promise<{ id: string }>;
}

function generateMonthRange(activatedAt: string | Date | null): { year: number; month: number }[] {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  let sy = cy, sm = cm;
  if (activatedAt) {
    const d = new Date(activatedAt);
    sy = d.getFullYear();
    sm = d.getMonth() + 1;
  }

  const months: { year: number; month: number }[] = [];
  let y = sy, m = sm;
  while (y < cy || (y === cy && m <= cm)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
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

  const handleDownload = useCallback(async (receiptId: string) => {
    const result = await utils.receipt.getDownloadUrlAdmin.fetch({ receiptId });
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  }, [utils]);

  // Auth check
  if (!userLoading && !user) redirect('/login');
  if (!userLoading && user && !['ADMIN', 'STAFF', 'BROKER'].includes(user.role)) redirect('/dashboard');

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
        <p className="text-center text-muted-foreground py-8">Protección no encontrada</p>
      </div>
    );
  }

  if (policy.status !== 'APPROVED') {
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

  const requiredTypes = receiptData?.requiredTypes || [];
  const receipts = receiptData?.receipts || [];

  // Month range from activatedAt
  const allMonths = generateMonthRange(policy.activatedAt ?? null);
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  const currentMonthEntry = allMonths.find(m => m.year === cy && m.month === cm);
  const pastMonths = allMonths.filter(m => !(m.year === cy && m.month === cm)).reverse();

  const currentMonthReceipts = receipts.filter(
    (r: any) => r.year === cy && r.month === cm,
  );

  const tenantName = receiptData?.tenant
    ? (receiptData.tenant as any).companyName || `${(receiptData.tenant as any).firstName || ''} ${(receiptData.tenant as any).paternalLastName || ''}`.trim()
    : '';

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
            Protección #{policy.policyNumber}
            {tenantName && <span> — {tenantName}</span>}
          </p>
        </div>
      </div>

      {/* Summary */}
      {receipts.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="px-3 py-1.5 rounded-full bg-green-100 text-green-700">
            {rt.admin.summary.uploaded}: {receipts.filter((r: any) => r.status === 'UPLOADED').length}
          </div>
          <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
            {rt.admin.summary.notApplicable}: {receipts.filter((r: any) => r.status === 'NOT_APPLICABLE').length}
          </div>
        </div>
      )}

      {/* Current month */}
      {currentMonthEntry && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{rt.portal.currentMonth}</h2>
          <MonthReceiptCard
            year={cy}
            month={cm}
            requiredTypes={requiredTypes}
            receipts={currentMonthReceipts}
            readOnly
            onDownload={handleDownload}
          />
        </div>
      )}

      {/* Past months */}
      {pastMonths.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{rt.portal.pastMonths}</h2>
          <ReceiptHistoryList
            months={pastMonths}
            requiredTypes={requiredTypes}
            receipts={receipts}
            readOnly
            onDownload={handleDownload}
          />
        </div>
      )}

      {receipts.length === 0 && !currentMonthEntry && (
        <p className="text-center text-muted-foreground py-8">{rt.portal.noReceipts}</p>
      )}
    </div>
  );
}
