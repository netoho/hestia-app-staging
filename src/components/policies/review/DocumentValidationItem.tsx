'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentValidationInfo } from '@/lib/services/reviewService';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  RefreshCw,
  User,
  Calendar,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DocumentValidationItemProps {
  document: DocumentValidationInfo;
  onApprove: (document: DocumentValidationInfo) => void;
  onReject: (document: DocumentValidationInfo) => void;
  onDownload: (documentId: string, fileName: string) => void;
  isValidating: boolean;
  showActions?: boolean;
}

export function DocumentValidationItem({
  document,
  onApprove,
  onReject,
  onDownload,
  isValidating,
  showActions = true,
}: DocumentValidationItemProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return CheckCircle2;
      case 'REJECTED': return XCircle;
      case 'IN_REVIEW': return Eye;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      case 'IN_REVIEW': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Aprobado';
      case 'REJECTED': return 'Rechazado';
      case 'IN_REVIEW': return 'En Revisión';
      default: return 'Pendiente';
    }
  };

  const StatusIcon = getStatusIcon(document.status);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${getStatusColor(document.status)}`} />
          <span className="font-medium text-sm">{document.fileName}</span>
          <Badge variant="outline" className="text-xs">
            {getStatusLabel(document.status)}
          </Badge>
        </div>

        {/* Validation info */}
        {document.validatedAt && (
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(document.validatedAt), "d MMM yyyy", { locale: es })}
            </span>
            {document.validatorName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {document.validatorName}
              </span>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {document.status === 'REJECTED' && document.rejectionReason && (
          <Alert className="mt-2 py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Razón de rechazo: {document.rejectionReason}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 ml-4">
        {/* Download button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(document.documentId, document.fileName)}
          disabled={isValidating}
          title="Descargar documento"
        >
          <Download className="h-4 w-4" />
        </Button>

        {/* Validation buttons */}
        {showActions && document.status !== 'APPROVED' && (
          <>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onApprove(document)}
              disabled={isValidating}
            >
              {isValidating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">Aprobar</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(document)}
              disabled={isValidating}
            >
              <XCircle className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Rechazar</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}