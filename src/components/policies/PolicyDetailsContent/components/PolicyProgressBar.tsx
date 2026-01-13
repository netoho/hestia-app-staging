'use client';

import { Users, FileText, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  label: string;
  current: number;
  total: number;
  icon: React.ElementType;
  onClick?: () => void;
}

function ProgressIndicator({ label, current, total, icon: Icon, onClick }: ProgressIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isComplete = current === total && total > 0;
  const hasData = total > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
        onClick && 'hover:bg-gray-100 cursor-pointer',
        !onClick && 'cursor-default'
      )}
    >
      <Icon className={cn('h-4 w-4', isComplete ? 'text-green-600' : 'text-gray-500')} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', isComplete ? 'text-green-600' : 'text-gray-900')}>
        {hasData ? `${current}/${total}` : '—'}
      </span>
      {hasData && (
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </button>
  );
}

interface PolicyProgressBarProps {
  completedActors: number;
  totalActors: number;
  documentsUploaded: number;
  documentsRequired: number;
  completedPayments: number;
  totalPayments: number;
  onActorsClick?: () => void;
  onDocumentsClick?: () => void;
  onPaymentsClick?: () => void;
}

export function PolicyProgressBar({
  completedActors,
  totalActors,
  documentsUploaded,
  documentsRequired,
  completedPayments,
  totalPayments,
  onActorsClick,
  onDocumentsClick,
  onPaymentsClick,
}: PolicyProgressBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-gray-50 rounded-lg p-2">
      <ProgressIndicator
        label="Actores"
        current={completedActors}
        total={totalActors}
        icon={Users}
        onClick={onActorsClick}
      />
      <div className="hidden sm:block w-px h-6 bg-gray-300" />
      <ProgressIndicator
        label="Documentos"
        current={documentsUploaded}
        total={documentsRequired}
        icon={FileText}
        onClick={onDocumentsClick}
      />
      <div className="hidden sm:block w-px h-6 bg-gray-300" />
      <ProgressIndicator
        label="Pagos"
        current={completedPayments}
        total={totalPayments}
        icon={CreditCard}
        onClick={onPaymentsClick}
      />
    </div>
  );
}

export default PolicyProgressBar;
