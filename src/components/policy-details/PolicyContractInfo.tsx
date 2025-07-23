'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Upload, 
  Download, 
  Calendar,
  User,
  History,
  CheckCircle
} from 'lucide-react';
import { t } from '@/lib/i18n';

interface Contract {
  id: string;
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isCurrent: boolean;
  uploadedBy: string;
  uploadedAt: Date;
}

interface PolicyContractInfoProps {
  contracts?: Contract[];
  policyStatus: string;
  contractSignedAt?: Date | null;
  contractLength: number;
  policyExpiresAt?: Date | null;
  onUploadContract?: (file: File) => void;
  onDownloadContract?: (contractId: string) => void;
  onMarkSigned?: () => void;
}

export function PolicyContractInfo({ 
  contracts = [],
  policyStatus,
  contractSignedAt,
  contractLength,
  policyExpiresAt,
  onUploadContract,
  onDownloadContract,
  onMarkSigned
}: PolicyContractInfoProps) {
  // Don't show contract info for early statuses
  if (['DRAFT', 'INVESTIGATION_PENDING', 'INVESTIGATION_IN_PROGRESS'].includes(policyStatus)) {
    return null;
  }

  const currentContract = contracts.find(c => c.isCurrent) || contracts[0];
  const hasContract = contracts.length > 0;
  const isSigned = !!contractSignedAt;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getContractStatus = () => {
    if (!hasContract) {
      return { label: 'Pendiente', variant: 'outline' as const, color: 'text-muted-foreground' };
    }
    if (isSigned) {
      return { label: 'Firmado', variant: 'default' as const, color: 'text-green-600' };
    }
    return { label: 'Subido', variant: 'secondary' as const, color: 'text-blue-600' };
  };

  const status = getContractStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contrato de Arrendamiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Status */}
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {isSigned && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-3 w-3" />
              Firmado el {formatDate(contractSignedAt)}
            </span>
          )}
        </div>

        {/* Current Contract Info */}
        {currentContract && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{currentContract.fileName}</span>
                  {currentContract.isCurrent && (
                    <Badge variant="outline" className="text-xs">Actual</Badge>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Versión: {currentContract.version}</p>
                  <p>Tamaño: {formatFileSize(currentContract.fileSize)}</p>
                  <p>Subido el: {formatDateTime(currentContract.uploadedAt)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {onDownloadContract && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadContract(currentContract.id)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Descargar
                  </Button>
                )}
                
                {!isSigned && onMarkSigned && policyStatus === 'CONTRACT_UPLOADED' && (
                  <Button
                    size="sm"
                    onClick={onMarkSigned}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Marcar Firmado
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload New Contract */}
        {!hasContract && policyStatus === 'CONTRACT_PENDING' && (
          <div className="text-center py-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No se ha subido ningún contrato
            </p>
            {onUploadContract && (
              <div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadContract(file);
                  }}
                  className="hidden"
                  id="contract-upload"
                />
                <label htmlFor="contract-upload">
                  <Button asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Contrato
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Contract Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Duración del Contrato
            </p>
            <p className="font-medium">{contractLength} meses</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Fecha de Vencimiento
            </p>
            <p className="font-medium">{formatDate(policyExpiresAt)}</p>
          </div>
        </div>

        {/* Contract History */}
        {contracts.length > 1 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de Versiones
            </h4>
            <div className="space-y-2">
              {contracts
                .sort((a, b) => b.version - a.version)
                .map((contract) => (
                  <div 
                    key={contract.id} 
                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                  >
                    <div>
                      <span className="font-medium">v{contract.version}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatDateTime(contract.uploadedAt)}
                      </span>
                      {contract.isCurrent && (
                        <Badge variant="outline" className="ml-2 text-xs">Actual</Badge>
                      )}
                    </div>
                    {onDownloadContract && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownloadContract(contract.id)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Upload New Version */}
        {hasContract && !isSigned && onUploadContract && (
          <div className="pt-4 border-t">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadContract(file);
              }}
              className="hidden"
              id="contract-update"
            />
            <label htmlFor="contract-update">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Nueva Versión
                </span>
              </Button>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}