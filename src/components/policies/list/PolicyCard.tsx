'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PolicyStatus } from '@/types/policy';
import { calculatePolicyProgress, getPrimaryLandlord, getActorDisplayName } from '@/lib/utils/policyUtils';

interface Policy {
  id: string;
  policyNumber: string;
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
    informationComplete: boolean;
  } | null;
  landlords?: Array<{
    fullName?: string;
    companyName?: string;
    isPrimary?: boolean;
    informationComplete: boolean;
  }>;
  jointObligors?: Array<{
    informationComplete: boolean;
  }>;
  avals?: Array<{
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
  const primaryLandlord = getPrimaryLandlord(policy.landlords);
  const statusConfig = STATUS_CONFIG[policy.status] || { label: policy.status, variant: 'secondary' as const };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{policy.policyNumber}</h3>
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

        {/* Actors Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tenant */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Inquilino</p>
            {policy.tenant ? (
              <div>
                <p className="text-sm truncate">
                  {getActorDisplayName(policy.tenant)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {policy.tenant.informationComplete ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-orange-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {policy.tenant.informationComplete ? 'Completo' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pendiente</p>
            )}
          </div>

          {/* Landlord */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Arrendador</p>
            {primaryLandlord ? (
              <div>
                <p className="text-sm truncate">
                  {getActorDisplayName(primaryLandlord)}
                  {(policy.landlords?.length || 0) > 1 && (
                    <span className="text-xs text-muted-foreground"> (+{(policy.landlords?.length || 0) - 1})</span>
                  )}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {primaryLandlord.informationComplete ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-orange-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {policy.landlords?.filter(l => l.informationComplete).length || 0}/{policy.landlords?.length || 0} completos
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pendiente</p>
            )}
          </div>
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

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(policy.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Detalles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
