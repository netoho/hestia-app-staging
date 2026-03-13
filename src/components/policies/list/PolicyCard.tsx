'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculatePolicyProgress } from '@/lib/utils/policy';
import { POLICY_STATUS_CONFIG } from '@/lib/config/policyStatus';
import ActorsList from './ActorsList';
import { PolicyListItem } from './types';
import { t } from '@/lib/i18n';

interface PolicyCardProps {
  policy: PolicyListItem;
  onView: (policyId: string) => void;
}

/**
 * Mobile card view for a single policy
 */
export default function PolicyCard({ policy, onView }: PolicyCardProps) {
  const progress = calculatePolicyProgress(policy);
  const statusConfig = POLICY_STATUS_CONFIG[policy.status] || { label: policy.status, variant: 'secondary' as const };

  return (
    <Card
      className="overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      role="button"
      tabIndex={0}
      aria-label={`Protección ${policy.policyNumber}`}
      onClick={() => onView(policy.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(policy.id); } }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            {policy.internalCode && (
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{policy.internalCode}</p>
            )}
            <h3 className="font-semibold text-base text-primary">{policy.policyNumber}</h3>
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
          <p className="text-sm font-medium text-muted-foreground mb-1">{t.pages.createPolicy.list.headers.property}</p>
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
          <p className="text-xs font-medium text-muted-foreground mb-2">{t.pages.createPolicy.list.headers.actors}</p>
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
            <span className="text-xs font-medium text-muted-foreground">{t.pages.createPolicy.list.headers.progress}</span>
            <span className="text-xs font-semibold">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress.percentage === 100
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : progress.percentage > 0
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {progress.completedActors}/{progress.totalActors} {t.pages.createPolicy.list.actorsCompleted}
          </p>
        </div>

        {/* Pricing */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">{t.pages.createPolicy.list.headers.totalPrice}</p>
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
