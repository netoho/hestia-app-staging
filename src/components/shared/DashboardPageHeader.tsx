import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  /** Optional CTA / actions slot, right-aligned next to the title. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Dashboard-internal page header.
 *
 * Sans, left-aligned, sized for ops density — distinct from the marketing-facing
 * `PageTitle` (serif, large, centered) which is reserved for public pages.
 */
export function DashboardPageHeader({
  title,
  subtitle,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="shrink-0 flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
