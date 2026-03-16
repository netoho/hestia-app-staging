'use client';

import { useParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { brandInfo } from '@/lib/config/brand';
import { trpc } from '@/lib/trpc/client';
import { receipts as rt } from '@/lib/i18n/pages/receipts';
import ReceiptDashboard from '@/components/portal/receipts/ReceiptDashboard';

export default function ReceiptPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading, error, refetch } = trpc.receipt.getPortalData.useQuery(
    { token },
    { retry: false },
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">{rt.portal.validating}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-md w-full mx-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error?.message || rt.portal.tokenExpired}. Por favor, contacte a {brandInfo.supportEmail}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <ReceiptDashboard
      mode="portal"
      token={token}
      tenantName={data.tenantName}
      policies={data.policies}
      refetchData={refetch}
    />
  );
}
