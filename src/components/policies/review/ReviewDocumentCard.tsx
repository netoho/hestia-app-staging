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
import { DocumentValidationItem } from './DocumentValidationItem';
import type { DocumentValidationInfo } from '@/lib/services/reviewService.types';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { toast } from '@/hooks/use-toast';

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
  const { downloadDocument } = useDocumentDownload();

  // Use tRPC mutation for document validation
  const validateDocumentMutation = trpc.review.validateDocument.useMutation({
    onSuccess: () => {
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedDocument(null);
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


  // Group documents by status
  const documentsByStatus = useMemo(() => {
    const approved = documents.filter(d => d.status === 'APPROVED');
    const rejected = documents.filter(d => d.status === 'REJECTED');
    const pending = documents.filter(d => d.status === 'PENDING' || d.status === 'IN_REVIEW');
    return { approved, rejected, pending };
  }, [documents]);

  const handleValidate = async (document: DocumentValidationInfo, status: 'APPROVED' | 'REJECTED') => {
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

  const handleDownload = async (documentId: string, fileName: string) => {
    await downloadDocument({ documentId, fileName });
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
          {/* Documents with integrated validation controls */}
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map(doc => (
                <DocumentValidationItem
                  key={doc.documentId}
                  document={doc}
                  onApprove={(document) => handleValidate(document, 'APPROVED')}
                  onReject={openRejectDialog}
                  onDownload={handleDownload}
                  isValidating={validateDocumentMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg p-8 bg-gray-50 text-center">
              <p className="text-sm text-gray-500">No se han cargado documentos en esta categoría</p>
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