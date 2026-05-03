'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { t } from '@/lib/i18n';

interface PendingApprovalBannerProps {
  count: number;
}

export function PendingApprovalBanner({ count }: PendingApprovalBannerProps) {
  if (count <= 0) return null;

  const template = count === 1
    ? t.pages.dashboard.banner.pendingSingular
    : t.pages.dashboard.banner.pendingPlural;
  const message = template.replace('{count}', String(count));

  return (
    <Link
      href="/dashboard/policies?status=PENDING_APPROVAL"
      className="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </Link>
  );
}
