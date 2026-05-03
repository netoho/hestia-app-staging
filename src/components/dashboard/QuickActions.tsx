'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ListChecks, Users, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { ReportModal } from './ReportModal';

interface QuickActionsProps {
  role?: string | null;
}

export function QuickActions({ role }: QuickActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';
  const isBroker = role === 'BROKER';

  return (
    <>
      <section aria-label={t.pages.dashboard.quickActions.title} className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.pages.dashboard.quickActions.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="default">
            <Link href="/dashboard/policies/new">
              <Plus />
              {t.pages.dashboard.quickActions.newPolicy}
            </Link>
          </Button>

          {(isAdmin || isStaff) && (
            <Button asChild variant="outline">
              <Link href="/dashboard/policies?status=PENDING_APPROVAL">
                <ListChecks />
                {t.pages.dashboard.quickActions.reviewPending}
              </Link>
            </Button>
          )}

          {isAdmin && (
            <Button asChild variant="outline">
              <Link href="/dashboard/users">
                <Users />
                {t.pages.dashboard.quickActions.manageUsers}
              </Link>
            </Button>
          )}

          {(isAdmin || isStaff) && (
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileDown />
              {t.pages.dashboard.quickActions.viewReports}
            </Button>
          )}

          {/*
            Broker only gets "Nueva protección" — covered above.
            Tiles already provide the click-through to their own filtered policy list.
          */}
          {isBroker ? null : null}
        </div>
      </section>

      {(isAdmin || isStaff) && (
        <ReportModal open={reportOpen} onOpenChange={setReportOpen} />
      )}
    </>
  );
}
