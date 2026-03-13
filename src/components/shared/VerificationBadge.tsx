import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Eye, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';

interface VerificationBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

const VERIFICATION_CONFIG: Record<VerificationStatus, {
  label: string;
  variant: 'muted' | 'success' | 'destructive' | 'warning';
  icon: typeof Clock;
}> = {
  PENDING: { label: 'Pendiente', variant: 'muted', icon: Clock },
  APPROVED: { label: 'Aprobado', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Rechazado', variant: 'destructive', icon: XCircle },
  IN_REVIEW: { label: 'En Revisión', variant: 'warning', icon: Eye },
};

export function VerificationBadge({ status, size = 'md', className }: VerificationBadgeProps) {
  const config = VERIFICATION_CONFIG[status as VerificationStatus] || VERIFICATION_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center gap-1',
        size === 'sm' && 'text-xs px-2 py-0.5',
        className
      )}
    >
      <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
      {config.label}
    </Badge>
  );
}

export default VerificationBadge;
