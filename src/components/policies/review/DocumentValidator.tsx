'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  FileText,
  Download,
  AlertCircle,
  RefreshCw,
  User,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { DocumentValidationInfo } from '@/lib/services/reviewService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import type { StatusIconComponent } from '@/types/review';
import { trpc } from '@/lib/trpc/client';
import { toast } from '@/hooks/use-toast';

interface DocumentValidatorProps {
  document: DocumentValidationInfo;
  policyId: string;
  onValidationComplete: () => void;
}

export default function DocumentValidator({
  document,
  policyId,
  onValidationComplete
}: DocumentValidatorProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { downloadDocument, downloading } = useDocumentDownload();

  // Use tRPC mutation for document validation
  const validateDocumentMutation = trpc.review.validateDocument.useMutation({
    onSuccess: () => {
      setShowRejectDialog(false);
      setRejectionReason('');
      onValidationComplete();
    },
    onError: (error) => {
      console.error('Validation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error al validar documento',
        description: error.message || 'Ocurrió un error. Intente de nuevo.',
      });
    },
  });

  const getStatusIcon = (): StatusIconComponent => {
    switch (document.status) {
      case 'APPROVED': return CheckCircle2;
      case 'REJECTED': return XCircle;
      case 'IN_REVIEW': return Eye;
      default: return Clock;
    }
  };

  const getStatusColor = () => {
    switch (document.status) {
      case 'APPROVED': return 'border-green-200 bg-green-50';
      case 'REJECTED': return 'border-red-200 bg-red-50';
      case 'IN_REVIEW': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getStatusBadgeColor = () => {
    switch (document.status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = () => {
    switch (document.status) {
      case 'APPROVED': return 'Aprobado';
      case 'REJECTED': return 'Rechazado';
      case 'IN_REVIEW': return 'En Revisión';
      default: return 'Pendiente';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ine': 'INE/IFE',
      'passport': 'Pasaporte',
      'rfc_document': 'Constancia RFC',
      'company_constitution': 'Acta Constitutiva',
      'property_deed': 'Escritura de Propiedad',
      'property_tax': 'Predial',
      'property_tax_statement': 'Estado de Cuenta Predial',
      'bank_statement': 'Estado de Cuenta',
      'income_proof': 'Comprobante de Ingresos',
      'tax_return': 'Declaración de Impuestos',
      'payroll_receipt': 'Recibo de Nómina',
      'utility_bill': 'Comprobante de Domicilio',
      'tax_status_certificate': 'Constancia de Situación Fiscal',
      'proof_of_address': 'Comprobante de Domicilio',
      'curp': 'CURP',
      'other': 'Otro'
    };
    return labels[type.toLowerCase()] || type;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'IDENTIFICATION': 'Identificación',
      'INCOME_PROOF': 'Ingresos',
      'ADDRESS_PROOF': 'Domicilio',
      'BANK_STATEMENT': 'Bancario',
      'PROPERTY_DEED': 'Propiedad',
      'PROPERTY_TAX_STATEMENT': 'Predial',
      'TAX_RETURN': 'Fiscal',
      'EMPLOYMENT_LETTER': 'Laboral',
      'COMPANY_CONSTITUTION': 'Constitución',
      'PASSPORT': 'Pasaporte',
      'TAX_STATUS_CERTIFICATE': 'Situación Fiscal',
      'OTHER': 'Otro'
    };
    return labels[category] || category;
  };

  const handleValidate = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      return;
    }

    validateDocumentMutation.mutate({
      policyId,
      documentId: document.documentId,
      status,
      rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
    });
  };

  const handlePreview = async () => {
    if (document.documentId && document.fileName) {
      await downloadDocument({
        documentId: document.documentId,
        fileName: document.fileName
      });
    } else {
      console.error('Document ID or filename missing');
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${getStatusColor()}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{document.fileName}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getDocumentTypeLabel(document.documentType)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(document.category)}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getStatusBadgeColor()}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {getStatusLabel()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {document.createdAt && format(new Date(document.createdAt), "d MMM yyyy", { locale: es })}
                  </span>
                </div>
                {document.validatedAt && (
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Aprobado: {format(new Date(document.validatedAt), "d MMM yyyy", { locale: es })}
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
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-800">Razón de rechazo:</p>
                        <p className="text-xs text-red-700 mt-0.5">{document.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreview}
                className="text-xs"
                disabled={downloading === document.documentId}
              >
                {downloading === document.documentId ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                Ver
              </Button>

              {document.status !== 'APPROVED' && (
                <>
                  <Button
                    size="sm"
                    className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleValidate('APPROVED')}
                    disabled={validateDocumentMutation.isPending}
                  >
                    {validateDocumentMutation.isPending ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={validateDocumentMutation.isPending}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Rechazar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              Documento: {document.fileName}
              <br />
              Proporciona una razón para el rechazo. Esta información será visible para el equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe el motivo del rechazo del documento..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleValidate('REJECTED')}
              disabled={!rejectionReason.trim() || validateDocumentMutation.isPending}
            >
              {validateDocumentMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
