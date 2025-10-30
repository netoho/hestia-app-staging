'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentList } from '@/components/documents/DocumentList';
import { Document } from '@/types/documents';
import { DocumentCategory } from '@/types/policy';
import { DocumentValidationInfo } from '@/lib/services/reviewService';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReviewDocumentCardProps {
  category: string;
  categoryLabel: string;
  documents: DocumentValidationInfo[];
  policyId: string;
  onValidationComplete: () => void;
}

export default function ReviewDocumentCard({
  category,
  categoryLabel,
  documents,
  policyId,
  onValidationComplete,
}: ReviewDocumentCardProps) {
  const [selectedDocument, setSelectedDocument] = useState<DocumentValidationInfo | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { downloadDocument } = useDocumentDownload();

  // Map DocumentValidationInfo to Document format for DocumentList
  const mappedDocuments: Document[] = useMemo(() => {
    return documents.map(doc => ({
      id: doc.documentId,
      fileName: doc.fileName,
      fileSize: 0, // Not available in validation info
      documentType: doc.documentType,
      category: doc.category as DocumentCategory,
      createdAt: doc.createdAt,
      s3Key: doc.s3Key || '',
      s3Bucket: '',
      policyId: policyId,
      uploadedBy: doc.validatedBy || '',
    }));
  }, [documents, policyId]);

  // Group documents by status
  const documentsByStatus = useMemo(() => {
    const approved = documents.filter(d => d.status === 'APPROVED');
    const rejected = documents.filter(d => d.status === 'REJECTED');
    const pending = documents.filter(d => d.status === 'PENDING' || d.status === 'IN_REVIEW');
    return { approved, rejected, pending };
  }, [documents]);

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

  const handleValidate = async (document: DocumentValidationInfo, status: 'APPROVED' | 'REJECTED') => {
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
        setSelectedDocument(null);
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

  const handleDownload = async (documentId: string, fileName: string) => {
    await downloadDocument({
      documentId,
      documentType: 'actor',
      fileName
    });
  };

  const openRejectDialog = (document: DocumentValidationInfo) => {
    setSelectedDocument(document);
    setShowRejectDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{categoryLabel}</CardTitle>
            </div>
            <div className="flex gap-2">
              {documentsByStatus.approved.length > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {documentsByStatus.approved.length} Aprobado{documentsByStatus.approved.length > 1 ? 's' : ''}
                </Badge>
              )}
              {documentsByStatus.rejected.length > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {documentsByStatus.rejected.length} Rechazado{documentsByStatus.rejected.length > 1 ? 's' : ''}
                </Badge>
              )}
              {documentsByStatus.pending.length > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {documentsByStatus.pending.length} Pendiente{documentsByStatus.pending.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document List */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <DocumentList
              documents={mappedDocuments}
              readOnly={true}
              onDownload={handleDownload}
              showEmptyState={documents.length === 0}
              emptyMessage="No se han cargado documentos en esta categoría"
            />
          </div>

          {/* Validation Controls for each document */}
          {documents.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Control de Validación</h4>
              {documents.map(doc => {
                const StatusIcon = getStatusIcon(doc.status);
                return (
                  <div key={doc.documentId} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(doc.status)}`} />
                        <span className="font-medium text-sm">{doc.fileName}</span>
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(doc.status)}
                        </Badge>
                      </div>

                      {/* Validation info */}
                      {doc.validatedAt && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.validatedAt), "d MMM yyyy", { locale: es })}
                          </span>
                          {doc.validatorName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {doc.validatorName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Rejection reason */}
                      {doc.status === 'REJECTED' && doc.rejectionReason && (
                        <Alert className="mt-2 py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Razón de rechazo: {doc.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Action buttons */}
                    {doc.status !== 'APPROVED' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleValidate(doc, 'APPROVED')}
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
                          onClick={() => openRejectDialog(doc)}
                          disabled={isValidating}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Rechazar</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              Documento: {selectedDocument?.fileName}
              <br />
              Proporciona una razón para el rechazo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe el motivo del rechazo..."
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
                setSelectedDocument(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedDocument && handleValidate(selectedDocument, 'REJECTED')}
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