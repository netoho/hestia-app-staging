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
  const [isValidating, setIsValidating] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getStatusIcon = () => {
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
      'bank_statement': 'Estado de Cuenta',
      'income_proof': 'Comprobante de Ingresos',
      'tax_return': 'Declaración de Impuestos',
      'payroll_receipt': 'Recibo de Nómina',
      'utility_bill': 'Comprobante de Domicilio'
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'IDENTIFICATION': 'Identificación',
      'INCOME_PROOF': 'Ingresos',
      'ADDRESS_PROOF': 'Domicilio',
      'BANK_STATEMENT': 'Bancario',
      'PROPERTY_DEED': 'Propiedad',
      'TAX_RETURN': 'Fiscal',
      'EMPLOYMENT_LETTER': 'Laboral',
      'COMPANY_CONSTITUTION': 'Constitución',
      'PASSPORT': 'Pasaporte',
      'OTHER': 'Otro'
    };
    return labels[category] || category;
  };

  const handleValidate = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`/api/policies/${policyId}/review/validate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.documentId,
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
        })
      });

      if (response.ok) {
        setShowRejectDialog(false);
        setRejectionReason('');
        onValidationComplete();
      } else {
        const error = await response.json();
        console.error('Validation error:', error);
        alert(`Error al validar: ${error.message}`);
      }
    } catch (error) {
      console.error('Error validating document:', error);
      alert('Error al validar el documento');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePreview = () => {
    // Open document in new tab for preview
    if (document.s3Key) {
      // Construct download URL - adjust based on your implementation
      const downloadUrl = `/api/documents/preview/${document.documentId}`;
      window.open(downloadUrl, '_blank');
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
                    {document.uploadedAt && format(new Date(document.uploadedAt), "d MMM yyyy", { locale: es })}
                  </span>
                  {document.validatedAt && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Validado: {document.validatedAt && format(new Date(document.validatedAt), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>

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
              >
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>

              {document.status !== 'APPROVED' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleValidate('APPROVED')}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isValidating}
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
              disabled={!rejectionReason.trim() || isValidating}
            >
              {isValidating ? (
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
