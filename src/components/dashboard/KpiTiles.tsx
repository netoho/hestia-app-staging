'use client';

import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import type { DashboardStatsOutput } from '@/lib/schemas/dashboard/output';

interface KpiTilesProps {
  data?: DashboardStatsOutput;
  isLoading: boolean;
  isError: boolean;
}

interface TileConfig {
  key: keyof DashboardStatsOutput;
  label: string;
  href: string;
  icon: React.ElementType;
  accent: string;
}

const TILES: TileConfig[] = [
  {
    key: 'active',
    label: t.pages.dashboard.kpis.active,
    href: '/dashboard/policies?status=ACTIVE',
    icon: CheckCircle2,
    accent: 'text-emerald-600',
  },
  {
    key: 'pendingApproval',
    label: t.pages.dashboard.kpis.pendingApproval,
    href: '/dashboard/policies?status=PENDING_APPROVAL',
    icon: AlertCircle,
    accent: 'text-amber-600',
  },
  {
    // The "En proceso" tile points at COLLECTING_INFO today (the only intermediate
    // status that exists). The aggregator's own count is broader (NOT IN
    // [ACTIVE, EXPIRED, CANCELLED, PENDING_APPROVAL]) so future intermediate
    // statuses contribute to the count automatically — the tile click-through
    // will need a multi-status URL filter when that day comes.
    key: 'inProcess',
    label: t.pages.dashboard.kpis.inProcess,
    href: '/dashboard/policies?status=COLLECTING_INFO',
    icon: Loader2,
    accent: 'text-sky-600',
  },
  {
    key: 'expired',
    label: t.pages.dashboard.kpis.expired,
    href: '/dashboard/policies?status=EXPIRED',
    icon: Clock,
    accent: 'text-slate-500',
  },
];

export function KpiTiles({ data, isLoading, isError }: KpiTilesProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {TILES.map((tile) => {
        const value = data?.[tile.key];
        const Icon = tile.icon;
        return (
          <Link
            key={tile.key}
            href={tile.href}
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{tile.label}</p>
                  <Icon className={`h-4 w-4 ${tile.accent}`} aria-hidden />
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : isError ? (
                  <span
                    className="text-3xl font-semibold text-muted-foreground"
                    title={t.pages.dashboard.kpis.errorTooltip}
                  >
                    —
                  </span>
                ) : (
                  <p className="text-3xl font-semibold tabular-nums">{value ?? 0}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
