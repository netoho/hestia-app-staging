'use client';

import { Progress } from '@/components/ui/progress';
import { OperationProgress } from '@/lib/documentManagement/types';
import { formatFileSize } from '@/lib/documentManagement/validation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentProgressProps {
  progress?: OperationProgress;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  variant?: 'default' | 'compact';
  showBytes?: boolean;
}

export function DocumentProgress({
  progress,
  status,
  error,
  variant = 'default',
  showBytes = true,
}: DocumentProgressProps) {
  if (status === 'idle') {
    return null;
  }

  const percentage = progress?.percentage || 0;
  const loaded = progress?.loaded || 0;
  const total = progress?.total || 0;

  // Compact variant - just icon and text
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        {status === 'pending' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-600">{percentage}%</span>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Completado</span>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-600">{error || 'Error'}</span>
          </>
        )}
      </div>
    );
  }

  // Default variant - full progress bar
  return (
    <div className="space-y-2">
      {status === 'pending' && (
        <>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-blue-600">Subiendo...</span>
            </div>
            <span className="text-gray-600">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
          {showBytes && total > 0 && (
            <p className="text-xs text-gray-500">
              {formatFileSize(loaded)} de {formatFileSize(total)}
            </p>
          )}
        </>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Completado exitosamente</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error || 'Error en la operación'}</span>
        </div>
      )}
    </div>
  );
}
