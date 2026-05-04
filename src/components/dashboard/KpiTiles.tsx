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
  /** Tailwind classes for the icon chip — bg + foreground tint together. */
  chip: string;
}

const TILES: TileConfig[] = [
  {
    key: 'active',
    label: t.pages.dashboard.kpis.active,
    href: '/dashboard/policies?status=ACTIVE',
    icon: CheckCircle2,
    chip: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'pendingApproval',
    label: t.pages.dashboard.kpis.pendingApproval,
    href: '/dashboard/policies?status=PENDING_APPROVAL',
    icon: AlertCircle,
    chip: 'bg-amber-50 text-amber-600',
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
    chip: 'bg-sky-50 text-sky-600',
  },
  {
    key: 'expired',
    label: t.pages.dashboard.kpis.expired,
    href: '/dashboard/policies?status=EXPIRED',
    icon: Clock,
    chip: 'bg-slate-100 text-slate-600',
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
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                    {tile.label}
                  </p>
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tile.chip}`}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                {isLoading ? (
                  <Skeleton className="h-9 w-20" />
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
