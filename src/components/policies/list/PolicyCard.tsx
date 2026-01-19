'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";
import { calculatePolicyProgress } from '@/lib/utils/policy';
import { POLICY_STATUS_CONFIG } from '@/lib/config/policyStatus';
import ActorsList from './ActorsList';

interface Actor {
  firstName?: string | null;
  middleName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  informationComplete: boolean;
  isPrimary?: boolean;
  [key: string]: unknown;
}

interface Policy {
  id: string;
  policyNumber: string;
  internalCode?: string | null;
  status: PolicyStatus;
  propertyAddress?: { formattedAddress?: string | null } | null;
  propertyDetails?: { propertyAddressDetails?: { formattedAddress?: string | null } | null } | null;
  propertyType?: string | null;
  rentAmount: number;
  totalPrice?: number | null;
  createdAt: Date | string;
  package?: { name: string } | null;
  tenant?: Actor | null;
  landlords?: Actor[];
  jointObligors?: Actor[];
  avals?: Actor[];
  guarantorType?: string | null;
  [key: string]: unknown;
}

interface PolicyCardProps {
  policy: Policy;
  onView: (policyId: string) => void;
}

/**
 * Mobile card view for a single policy
 */
export default function PolicyCard({ policy, onView }: PolicyCardProps) {
  const progress = calculatePolicyProgress(policy);
  const statusConfig = POLICY_STATUS_CONFIG[policy.status] || { label: policy.status, variant: 'secondary' as const };

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
          <p className="text-sm font-medium">{policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'N/A'}</p>
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
