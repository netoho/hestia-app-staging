'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { t } from '@/lib/i18n';

interface Actor {
  id: string;
  fullName?: string;
  companyName?: string;
  informationComplete: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
  documents?: any[];
  isPrimary?: boolean;
}

interface VerificationChecklist {
  infoComplete: boolean;
  docsVerified: boolean;
  referencesChecked: boolean;
}

interface ActorVerificationRowProps {
  actor: Actor;
  actorType: string;
  displayName: string;
  icon: React.ElementType;
  checklist: VerificationChecklist;
  isSelected: boolean;
  isProcessing: boolean;
  onToggleSelection: () => void;
  onUpdateChecklist: (field: keyof VerificationChecklist, value: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

export function ActorVerificationRow({
  actor,
  actorType,
  displayName,
  icon: Icon,
  checklist,
  isSelected,
  isProcessing,
  onToggleSelection,
  onUpdateChecklist,
  onApprove,
  onReject,
}: ActorVerificationRowProps) {
  const isPending = actor.verificationStatus === 'PENDING' && actor.informationComplete;
  const isRejected = actor.verificationStatus === 'REJECTED';

  const actorTypeLabel = actorType === 'landlord'
    ? 'Arrendador'
    : actorType === 'tenant'
      ? 'Inquilino'
      : actorType === 'jointObligor'
        ? 'Obligado Solidario'
        : 'Aval';

  return (
    <div className="border rounded-lg p-3 sm:p-4 space-y-3">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              disabled={!isPending}
              className="h-5 w-5"
            />
            <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm sm:text-base truncate">{displayName}</p>
            <p className="text-xs text-gray-500">{actorTypeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <VerificationBadge status={actor.verificationStatus || 'PENDING'} />
        </div>
      </div>

      {/* Verification Checklist */}
      {isPending && (
        <div className="bg-gray-50 p-3 rounded space-y-2">
          <p className="text-sm font-medium text-gray-700">Verificación:</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checklist.infoComplete}
                onCheckedChange={(checked) => onUpdateChecklist('infoComplete', checked as boolean)}
              />
              <span>Información completa</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checklist.docsVerified}
                onCheckedChange={(checked) => onUpdateChecklist('docsVerified', checked as boolean)}
              />
              <span>Documentos verificados</span>
              {actor.documents && actor.documents.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {actor.documents.length} docs
                </Badge>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checklist.referencesChecked}
                onCheckedChange={(checked) => onUpdateChecklist('referencesChecked', checked as boolean)}
              />
              <span>Referencias verificadas</span>
            </label>
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {isRejected && actor.rejectionReason && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Razón de rechazo</AlertTitle>
          <AlertDescription className="text-red-700">{actor.rejectionReason}</AlertDescription>
        </Alert>
      )}

      {/* Actions - Mobile Responsive */}
      {isPending && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50 flex-1 sm:flex-initial"
            onClick={onApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span className="ml-1">{t.pages.policies.actorVerification.approve}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-initial"
            onClick={onReject}
          >
            <X className="h-4 w-4" />
            <span className="ml-1">{t.pages.policies.actorVerification.reject}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
