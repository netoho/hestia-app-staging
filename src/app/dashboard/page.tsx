'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc/client';
import { t } from '@/lib/i18n';
import { Greeting } from '@/components/dashboard/Greeting';
import { KpiTiles } from '@/components/dashboard/KpiTiles';
import { PendingApprovalBanner } from '@/components/dashboard/PendingApprovalBanner';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentPoliciesCard } from '@/components/dashboard/RecentPoliciesCard';

export default function DashboardPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const statsQuery = trpc.dashboard.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const recentQuery = trpc.dashboard.getRecentPolicies.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center" role="status" aria-label={t.misc.loading}>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t.misc.loading}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const firstName = user?.name?.split(' ')[0] ?? null;
  const role = user?.role ?? null;
  const isBroker = role === 'BROKER';
  const pendingCount = statsQuery.data?.pendingApproval ?? 0;

  return (
    <div className="space-y-6">
      <Greeting firstName={firstName} role={role} />

      {!statsQuery.isLoading && !statsQuery.isError && (
        <PendingApprovalBanner count={pendingCount} />
      )}

      <KpiTiles
        data={statsQuery.data}
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
      />

      <QuickActions role={role} />

      <RecentPoliciesCard
        data={recentQuery.data}
        isLoading={recentQuery.isLoading}
        isError={recentQuery.isError}
        isBroker={isBroker}
      />
    </div>
  );
}
