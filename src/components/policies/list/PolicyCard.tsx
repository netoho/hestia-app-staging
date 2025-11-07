'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PolicyStatus } from '@/types/policy';
import { calculatePolicyProgress } from '@/lib/utils/policyUtils';
import ActorsList from './ActorsList';

interface Policy {
  id: string;
  policyNumber: string;
  internalCode?: string;
  status: PolicyStatus;
  propertyAddress: string;
  propertyType?: string;
  rentAmount: number;
  totalPrice?: number;
  createdAt: string;
  package?: {
    name: string;
  };
  tenant?: {
    fullName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    informationComplete: boolean;
  } | null;
  landlords?: Array<{
    fullName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    informationComplete: boolean;
  }>;
  jointObligors?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
    informationComplete: boolean;
  }>;
  avals?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
    informationComplete: boolean;
  }>;
  guarantorType?: string;
}

interface PolicyCardProps {
  policy: Policy;
  onView: (policyId: string) => void;
}

const STATUS_CONFIG = {
  [PolicyStatus.DRAFT]: { label: 'Borrador', variant: 'secondary' as const },
  [PolicyStatus.COLLECTING_INFO]: { label: 'Recopilando Info', variant: 'default' as const },
  [PolicyStatus.UNDER_INVESTIGATION]: { label: 'En Investigación', variant: 'default' as const },
  [PolicyStatus.INVESTIGATION_REJECTED]: { label: 'Rechazado', variant: 'destructive' as const },
  [PolicyStatus.PENDING_APPROVAL]: { label: 'Pendiente Aprobación', variant: 'default' as const },
  [PolicyStatus.APPROVED]: { label: 'Aprobado', variant: 'default' as const },
  [PolicyStatus.CONTRACT_PENDING]: { label: 'Contrato Pendiente', variant: 'default' as const },
  [PolicyStatus.CONTRACT_SIGNED]: { label: 'Contrato Firmado', variant: 'default' as const },
  [PolicyStatus.ACTIVE]: { label: 'Activa', variant: 'default' as const },
  [PolicyStatus.EXPIRED]: { label: 'Expirada', variant: 'secondary' as const },
  [PolicyStatus.CANCELLED]: { label: 'Cancelada', variant: 'destructive' as const },
};

/**
 * Mobile card view for a single policy
 */
export default function PolicyCard({ policy, onView }: PolicyCardProps) {
  const progress = calculatePolicyProgress(policy);
  const statusConfig = STATUS_CONFIG[policy.status] || { label: policy.status, variant: 'secondary' as const };

  return (
    <Card className="overflow-hidden cursor-pointer" onClick={() => onView(policy.id)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            {policy.internalCode && (
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{policy.internalCode}</p>
            )}
            <h3 className="font-semibold text-base text-blue-600">{policy.policyNumber}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {policy.createdAt && format(new Date(policy.createdAt), 'dd/MM/yyyy', { locale: es })}
            </p>
          </div>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property Info */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Propiedad</p>
          <p className="text-sm font-medium">{policy.propertyAddress}</p>
          {policy.propertyType && (
            <p className="text-xs text-muted-foreground">{policy.propertyType}</p>
          )}
          <p className="text-sm mt-1">
            ${policy.rentAmount?.toLocaleString('es-MX')} /mes
          </p>
        </div>

        {/* All Actors Combined */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Actores</p>
          <ActorsList
            landlords={policy.landlords}
            tenant={policy.tenant}
            jointObligors={policy.jointObligors}
            avals={policy.avals}
            guarantorType={policy.guarantorType}
          />
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground">Progreso</span>
            <span className="text-xs font-semibold">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress.percentage === 100
                  ? 'bg-green-500'
                  : progress.percentage > 0
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {progress.completedActors}/{progress.totalActors} actores completados
          </p>
        </div>

        {/* Pricing */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Precio Total</p>
            <p className="text-sm font-semibold">
              ${policy.totalPrice?.toLocaleString('es-MX')}
            </p>
            {policy.package && (
              <p className="text-xs text-muted-foreground">{policy.package.name}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
