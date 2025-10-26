'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp
} from 'lucide-react';

interface ReviewProgressProps {
  progress: {
    overall: number;
    totalValidations: number;
    completedValidations: number;
    pendingValidations: number;
    rejectedValidations: number;
  };
}

export default function ReviewProgress({ progress }: ReviewProgressProps) {
  const getProgressColor = () => {
    if (progress.overall >= 100) return 'bg-green-600';
    if (progress.overall >= 75) return 'bg-blue-600';
    if (progress.overall >= 50) return 'bg-yellow-600';
    return 'bg-orange-600';
  };

  const getStatusMessage = () => {
    if (progress.overall >= 100) {
      return {
        text: 'Revisión Completa',
        icon: CheckCircle2,
        color: 'text-green-600'
      };
    }
    if (progress.rejectedValidations > 0) {
      return {
        text: `${progress.rejectedValidations} validaciones rechazadas`,
        icon: AlertTriangle,
        color: 'text-red-600'
      };
    }
    if (progress.pendingValidations > 0) {
      return {
        text: `${progress.pendingValidations} validaciones pendientes`,
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
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Main Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Progreso de Revisión</h3>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.overall}%
              </div>
            </div>
            <Progress value={progress.overall} className="h-3" />
            <div className={`flex items-center gap-2 mt-3 ${status.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{status.text}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {progress.totalValidations}
              </div>
              <p className="text-xs text-gray-600 mt-1">Total Validaciones</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {progress.completedValidations}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Completadas</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">
                  {progress.pendingValidations}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Pendientes</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold text-red-600">
                  {progress.rejectedValidations}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Rechazadas</p>
            </div>
          </div>

          {/* Progress Bar Segments */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Distribución de validaciones</span>
              <span>{progress.completedValidations} de {progress.totalValidations}</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
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
        </div>
      </CardContent>
    </Card>
  );
}