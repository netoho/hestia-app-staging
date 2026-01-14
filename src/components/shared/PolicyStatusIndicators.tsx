import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  FileSearch,
  FileCheck,
  FileX,
  FileSignature,
  FileBadge,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  RefreshCw,
  Ban
} from 'lucide-react';
import { PolicyStatusType } from '@/lib/prisma-types';

// Icon mapping for each status
const STATUS_ICONS: Record<PolicyStatusType, React.ElementType> = {
  DRAFT: FileText,
  COLLECTING_INFO: Clock,
  UNDER_INVESTIGATION: FileSearch,
  INVESTIGATION_REJECTED: FileX,
  PENDING_APPROVAL: FileCheck,
  CONTRACT_PENDING: FileSignature,
  CONTRACT_UPLOADED: FileBadge,
  CONTRACT_SIGNED: FileCheck,
  ACTIVE: CheckCircle,
  EXPIRED: AlertCircle,
  CANCELLED: Ban
};

// Enhanced color mapping with tailwind classes
const STATUS_COLORS: Record<PolicyStatusType, {
  bg: string;
  text: string;
  border: string;
  icon: string;
}> = {
  DRAFT: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: 'text-gray-500'
  },
  COLLECTING_INFO: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-500'
  },
  UNDER_INVESTIGATION: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: 'text-yellow-600'
  },
  INVESTIGATION_REJECTED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-500'
  },
  PENDING_APPROVAL: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-500'
  },
  CONTRACT_PENDING: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: 'text-orange-500'
  },
  CONTRACT_UPLOADED: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: 'text-purple-500'
  },
  CONTRACT_SIGNED: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: 'text-indigo-500'
  },
  ACTIVE: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-500'
  },
  EXPIRED: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: 'text-gray-500'
  },
  CANCELLED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-500'
  }
};

interface PolicyStatusBadgeProps {
  status: PolicyStatusType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PolicyStatusBadge({ 
  status, 
  showIcon = true, 
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

  return (
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
  totalSteps = 7,
  status,
  showStepText = true,
  className
}: PolicyProgressIndicatorProps) {
  // Don't show progress for certain statuses
  const hideProgressStatuses: PolicyStatusType[] = [
    'ACTIVE',
    'EXPIRED',
    'CANCELLED',
    'INVESTIGATION_REJECTED'
  ];

  if (hideProgressStatuses.includes(status)) {
    return null;
  }

  const progressPercentage = (currentStep / totalSteps) * 100;
  const isInProgress = status.includes('IN_PROGRESS') || status.includes('PENDING');

  return (
    <div className={cn('space-y-1', className)}>
      <Progress 
        value={progressPercentage} 
        className="h-2"
        indicatorClassName={cn(
          isInProgress && 'animate-pulse',
          status === 'PENDING_APPROVAL' && 'bg-emerald-500',
          status === 'CONTRACT_SIGNED' && 'bg-indigo-500'
        )}
      />
      {showStepText && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {currentStep} of {totalSteps}</span>
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
  const displayMap: Record<PolicyStatusType, string> = {
    DRAFT: 'Borrador',
    COLLECTING_INFO: 'Recolectando Información',
    UNDER_INVESTIGATION: 'En Investigación',
    INVESTIGATION_REJECTED: 'Rechazado',
    PENDING_APPROVAL: 'Pendiente de Aprobación',
    CONTRACT_PENDING: 'Contrato Pendiente',
    CONTRACT_UPLOADED: 'Contrato Cargado',
    CONTRACT_SIGNED: 'Contrato Firmado',
    ACTIVE: 'Activa',
    EXPIRED: 'Expirada',
    CANCELLED: 'Cancelada'
  };
  
  return displayMap[status] || status;
}

function getPaymentStatusText(status: string): string {
  const displayMap: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    COMPLETED: 'Completado',
    FAILED: 'Fallido',
    REFUNDED: 'Reembolsado'
  };

  return displayMap[status] || status;
}