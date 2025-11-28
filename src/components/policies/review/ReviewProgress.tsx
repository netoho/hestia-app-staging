'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  RefreshCw,
  Shield
} from 'lucide-react';

interface ReviewProgressProps {
  progress: {
    overall: number;
    totalValidations: number;
    completedValidations: number;
    pendingValidations: number;
    rejectedValidations: number;
  };
  investigationVerdict?: string | null;
  onApproveInvestigation?: () => void;
  isApprovingInvestigation?: boolean;
}

export default function ReviewProgress({
  progress,
  investigationVerdict,
  onApproveInvestigation,
  isApprovingInvestigation
}: ReviewProgressProps) {
  const getStatusMessage = () => {
    if (progress.overall >= 100 && progress.rejectedValidations === 0) {
      return {
        text: 'Revisión Completa',
        icon: CheckCircle2,
        color: 'text-green-600'
      };
    }
    if (progress.rejectedValidations > 0) {
      return {
        text: 'Requiere corrección',
        icon: AlertTriangle,
        color: 'text-red-600'
      };
    }
    if (progress.pendingValidations > 0) {
      return {
        text: 'En progreso',
        icon: Clock,
        color: 'text-orange-600'
      };
    }
    return {
      text: 'En progreso',
      icon: TrendingUp,
      color: 'text-blue-600'
    };
  };

  const status = getStatusMessage();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Compact Header with Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Progreso de Revisión</span>
              <span className="text-lg font-bold text-blue-600">{progress.overall}%</span>
            </div>

            {/* Compact Stats Badges */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">Total: {progress.totalValidations}</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {progress.completedValidations}
              </Badge>
              {progress.pendingValidations > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {progress.pendingValidations}
                </Badge>
              )}
              {progress.rejectedValidations > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  {progress.rejectedValidations}
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar Segments */}
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
              {progress.completedValidations > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{
                    width: `${(progress.completedValidations / progress.totalValidations) * 100}%`
                  }}
                />
              )}
              {progress.rejectedValidations > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{
                    width: `${(progress.rejectedValidations / progress.totalValidations) * 100}%`
                  }}
                />
              )}
            </div>
            <div className={`flex items-center gap-2 text-sm ${status.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="font-medium">{status.text}</span>
              <span className="text-xs text-gray-500">
                ({progress.completedValidations} de {progress.totalValidations} validaciones)
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {progress.overall === 100 && progress.rejectedValidations === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    ¡Revisión completada exitosamente!
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Todas las validaciones han sido aprobadas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {progress.rejectedValidations > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Hay {progress.rejectedValidations} validaciones rechazadas
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Se requiere corrección antes de aprobar la póliza.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Investigation Approval */}
          {progress.overall === 100 && progress.rejectedValidations === 0 && !investigationVerdict && onApproveInvestigation && (
            <Button
              onClick={onApproveInvestigation}
              disabled={isApprovingInvestigation}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isApprovingInvestigation ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Aprobar Investigación
            </Button>
          )}

          {investigationVerdict === 'APPROVED' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Investigación aprobada
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    La póliza puede ser aprobada desde la página de detalles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}