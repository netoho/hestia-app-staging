import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Ban
} from 'lucide-react';
import { PolicyStatusType } from '@/lib/prisma-types';
import { getApprovedSubStatus } from '@/lib/utils/policy';
import { t } from '@/lib/i18n';

// Icon mapping for each status
const STATUS_ICONS: Record<PolicyStatusType, React.ElementType> = {
  COLLECTING_INFO: Clock,
  PENDING_APPROVAL: FileCheck,
  APPROVED: CheckCircle,
  CANCELLED: Ban
};

// Enhanced color mapping with tailwind classes
const STATUS_COLORS: Record<PolicyStatusType, {
  bg: string;
  text: string;
  border: string;
  icon: string;
}> = {
  COLLECTING_INFO: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-500'
  },
  PENDING_APPROVAL: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-500'
  },
  APPROVED: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-500'
  },
  CANCELLED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-500'
  }
};

// Sub-status colors for APPROVED policies
const SUB_STATUS_COLORS: Record<string, {
  bg: string;
  text: string;
  border: string;
}> = {
  active: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  expired: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  pending_activation: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
};

interface PolicyStatusBadgeProps {
  status: PolicyStatusType;
  activatedAt?: Date | null;
  expiresAt?: Date | null;
  showIcon?: boolean;
  showSubStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PolicyStatusBadge({
  status,
  activatedAt,
  expiresAt,
  showIcon = true,
  showSubStatus = true,
  size = 'md',
  className
}: PolicyStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const colors = STATUS_COLORS[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const subStatus = showSubStatus && status === 'APPROVED'
    ? getApprovedSubStatus({ status, activatedAt: activatedAt ?? null, expiresAt: expiresAt ?? null })
    : null;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium',
          colors.bg,
          colors.text,
          colors.border,
          sizeClasses[size],
          className
        )}
      >
        {showIcon && Icon && (
          <Icon className={cn(iconSizes[size], colors.icon)} />
        )}
        <span>{getStatusDisplayText(status)}</span>
      </div>
      {subStatus && (
        <div
          className={cn(
            'inline-flex items-center rounded-full border font-medium',
            SUB_STATUS_COLORS[subStatus].bg,
            SUB_STATUS_COLORS[subStatus].text,
            SUB_STATUS_COLORS[subStatus].border,
            sizeClasses[size],
          )}
        >
          <span>{t.policySubStatus[subStatus]}</span>
        </div>
      )}
    </div>
  );
}

interface PolicyProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  status: PolicyStatusType;
  showStepText?: boolean;
  className?: string;
}

export function PolicyProgressIndicator({
  currentStep,
  totalSteps = 3,
  status,
  showStepText = true,
  className
}: PolicyProgressIndicatorProps) {
  if (status === 'CANCELLED') {
    return null;
  }

  const progressPercentage = (currentStep / totalSteps) * 100;
  const isInProgress = status === 'PENDING_APPROVAL';

  return (
    <div className={cn('space-y-1', className)}>
      <Progress
        value={progressPercentage}
        className="h-2"
        indicatorClassName={cn(
          isInProgress && 'animate-pulse',
          status === 'PENDING_APPROVAL' && 'bg-emerald-500',
        )}
      />
      {showStepText && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.pages.policies.stepOf(currentStep, totalSteps)}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      )}
    </div>
  );
}

interface PaymentStatusBadgeProps {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  amount?: number;
  showIcon?: boolean;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  amount,
  showIcon = true,
  className
}: PaymentStatusBadgeProps) {
  const config = {
    PENDING: {
      icon: Clock,
      colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      iconColor: 'text-yellow-500'
    },
    PROCESSING: {
      icon: Loader2,
      colors: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-500',
      animate: true
    },
    COMPLETED: {
      icon: CheckCircle,
      colors: 'bg-green-50 text-green-700 border-green-200',
      iconColor: 'text-green-500'
    },
    FAILED: {
      icon: XCircle,
      colors: 'bg-red-50 text-red-700 border-red-200',
      iconColor: 'text-red-500'
    },
    REFUNDED: {
      icon: RefreshCw,
      colors: 'bg-purple-50 text-purple-700 border-purple-200',
      iconColor: 'text-purple-500'
    }
  };

  const { icon: Icon, colors, iconColor, animate } = config[status];

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium',
          colors,
          className
        )}
      >
        {showIcon && (
          <Icon className={cn('h-3.5 w-3.5', iconColor, animate && 'animate-spin')} />
        )}
        <span>{getPaymentStatusText(status)}</span>
      </div>
      {amount !== undefined && amount > 0 && (
        <div className="text-xs text-muted-foreground ml-1">
          {formatCurrency(amount)}
        </div>
      )}
    </div>
  );
}

// Helper functions
function getStatusDisplayText(status: PolicyStatusType): string {
  return t.policyStatusFull[status] || status;
}

function getPaymentStatusText(status: string): string {
  return t.paymentStatusFull[status] || status;
}
