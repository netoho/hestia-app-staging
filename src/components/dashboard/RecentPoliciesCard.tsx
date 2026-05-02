'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { t } from '@/lib/i18n';
import { POLICY_STATUS_CONFIG } from '@/lib/config/policyStatus';
import { formatDateTime } from '@/lib/utils/formatting';
import type { DashboardRecentPoliciesOutput } from '@/lib/schemas/dashboard/output';

interface RecentPoliciesCardProps {
  data?: DashboardRecentPoliciesOutput;
  isLoading: boolean;
  isError: boolean;
  isBroker: boolean;
}

type RecentPolicy = DashboardRecentPoliciesOutput['policies'][number];

function tenantDisplay(tenant: RecentPolicy['tenant']): string {
  if (!tenant) return t.pages.dashboard.recent.noTenant;
  if (tenant.companyName) return tenant.companyName;
  const parts = [tenant.firstName, tenant.paternalLastName, tenant.maternalLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : t.pages.dashboard.recent.noTenant;
}

function formatRent(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RecentPoliciesCard({ data, isLoading, isError, isBroker }: RecentPoliciesCardProps) {
  const router = useRouter();
  const policies = data?.policies ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{t.pages.dashboard.recent.title}</CardTitle>
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href="/dashboard/policies">{t.pages.dashboard.recent.viewAll}</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 pb-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-6 pb-6 text-sm text-muted-foreground">
            {t.pages.dashboard.kpis.errorTooltip}
          </div>
        ) : policies.length === 0 ? (
          <div className="px-6 pb-6 flex flex-col items-center text-center gap-3">
            <p className="text-sm text-muted-foreground">
              {isBroker ? t.pages.dashboard.recent.emptyBroker : t.pages.dashboard.recent.empty}
            </p>
            <Button asChild>
              <Link href="/dashboard/policies/new">
                <Plus />
                {t.pages.dashboard.recent.createFirst}
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pages.dashboard.recent.columns.policyNumber}</TableHead>
                <TableHead>{t.pages.dashboard.recent.columns.tenant}</TableHead>
                <TableHead className="text-right">{t.pages.dashboard.recent.columns.rent}</TableHead>
                <TableHead>{t.pages.dashboard.recent.columns.status}</TableHead>
                <TableHead>{t.pages.dashboard.recent.columns.updated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => {
                const statusConfig = POLICY_STATUS_CONFIG[p.status];
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/policies/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.policyNumber}</TableCell>
                    <TableCell>{tenantDisplay(p.tenant)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRent(p.rentAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.updatedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
