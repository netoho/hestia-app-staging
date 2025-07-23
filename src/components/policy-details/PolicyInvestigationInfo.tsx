'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import { t } from '@/lib/i18n';

interface Investigation {
  id: string;
  verdict?: 'APPROVED' | 'REJECTED' | 'HIGH_RISK' | null;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | null;
  landlordDecision?: 'PROCEED' | 'REJECT' | null;
  landlordOverride: boolean;
  landlordNotes?: string | null;
  assignedTo?: string | null;
  completedBy?: string | null;
  completedAt?: Date | null;
  responseTimeHours?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PolicyInvestigationInfoProps {
  investigation?: Investigation | null;
  policyStatus: string;
  onStartInvestigation?: () => void;
  onCompleteInvestigation?: (verdict: 'APPROVED' | 'REJECTED' | 'HIGH_RISK') => void;
  onLandlordOverride?: (decision: 'PROCEED' | 'REJECT', notes?: string) => void;
}

export function PolicyInvestigationInfo({ 
  investigation, 
  policyStatus,
  onStartInvestigation,
  onCompleteInvestigation,
  onLandlordOverride
}: PolicyInvestigationInfoProps) {
  // Don't show investigation info for certain statuses
  if (['DRAFT', 'INVESTIGATION_PENDING'].includes(policyStatus)) {
    return null;
  }

  const getVerdictBadge = (verdict: string | null | undefined) => {
    if (!verdict) return null;
    
    const verdictMap = {
      'APPROVED': { label: 'Aprobado', variant: 'default' as const, icon: CheckCircle },
      'REJECTED': { label: 'Rechazado', variant: 'destructive' as const, icon: XCircle },
      'HIGH_RISK': { label: 'Alto Riesgo', variant: 'destructive' as const, icon: AlertTriangle }
    };
    
    const config = verdictMap[verdict as keyof typeof verdictMap];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getRiskLevelBadge = (riskLevel: string | null | undefined) => {
    if (!riskLevel) return null;
    
    const riskMap = {
      'LOW': { label: 'Bajo', variant: 'default' as const },
      'MEDIUM': { label: 'Medio', variant: 'secondary' as const },
      'HIGH': { label: 'Alto', variant: 'destructive' as const }
    };
    
    const config = riskMap[riskLevel as keyof typeof riskMap];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  const formatResponseTime = (hours: number | null | undefined) => {
    if (!hours) return '-';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Investigación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!investigation && policyStatus === 'INVESTIGATION_PENDING' && (
          <div className="text-center py-6">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              La investigación está pendiente de iniciar
            </p>
            {onStartInvestigation && (
              <Button onClick={onStartInvestigation}>
                Iniciar Investigación
              </Button>
            )}
          </div>
        )}

        {investigation && (
          <div className="space-y-4">
            {/* Status and Verdict */}
            <div className="flex flex-wrap gap-2">
              {getVerdictBadge(investigation.verdict)}
              {getRiskLevelBadge(investigation.riskLevel)}
              {investigation.landlordOverride && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Override del Propietario
                </Badge>
              )}
            </div>

            {/* Investigation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Timing Information */}
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tiempo de Respuesta
                </p>
                <p className="font-medium">{formatResponseTime(investigation.responseTimeHours)}</p>
              </div>

              {/* Completion Date */}
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fecha de Completado
                </p>
                <p className="font-medium">{formatDate(investigation.completedAt)}</p>
              </div>
            </div>

            {/* Rejection Details */}
            {investigation.verdict === 'REJECTED' && (
              <div className="border-l-4 border-destructive pl-4">
                <h4 className="font-medium text-destructive mb-2">Detalles del Rechazo</h4>
                {investigation.rejectionReason && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Razón:</strong> {investigation.rejectionReason}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  <strong>Rechazado el:</strong> {formatDate(investigation.rejectedAt)}
                </p>
              </div>
            )}

            {/* Landlord Override */}
            {investigation.landlordDecision && (
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-blue-700 mb-2">Decisión del Propietario</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Decisión:</strong> {investigation.landlordDecision === 'PROCEED' ? 'Proceder' : 'Rechazar'}
                </p>
                {investigation.landlordNotes && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Notas:</strong> {investigation.landlordNotes}
                  </p>
                )}
              </div>
            )}

            {/* Investigation Notes */}
            {investigation.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notas de Investigación</p>
                <p className="text-sm bg-muted p-3 rounded">{investigation.notes}</p>
              </div>
            )}

            {/* Actions */}
            {policyStatus === 'INVESTIGATION_IN_PROGRESS' && !investigation.completedAt && (
              <div className="flex gap-2 pt-4 border-t">
                {onCompleteInvestigation && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => onCompleteInvestigation('APPROVED')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Aprobar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => onCompleteInvestigation('REJECTED')}
                    >
                      Rechazar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onCompleteInvestigation('HIGH_RISK')}
                    >
                      Marcar Alto Riesgo
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Landlord Override Actions */}
            {investigation.verdict === 'REJECTED' && !investigation.landlordDecision && (
              <div className="bg-blue-50 p-4 rounded border">
                <p className="text-sm text-blue-700 mb-3">
                  El inquilino fue rechazado. ¿El propietario desea proceder de todos modos?
                </p>
                {onLandlordOverride && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => onLandlordOverride('PROCEED')}
                    >
                      Proceder de Todos Modos
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onLandlordOverride('REJECT')}
                    >
                      Confirmar Rechazo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}