'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, FileText, Download, FileImage, File } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatFullName } from '@/lib/utils/names';
import { formatDateTimeLong } from '@/lib/utils/formatting';
import { formatFileSize } from '@/lib/documentManagement/validation';
import { brandColors } from '@/lib/config/brand';
import {
  getInvestigatedActorLabel,
  getApproverTypeLabel,
  INVESTIGATION_FORM_LIMITS,
} from '@/lib/constants/investigationConfig';

interface InvestigationData {
  id: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actor: {
    id: string;
    firstName?: string | null;
    middleName?: string | null;
    paternalLastName?: string | null;
    maternalLastName?: string | null;
    companyName?: string | null;
    email: string;
    phone: string;
  } | null;
  findings: string | null;
  status: string;
  approvedAt: Date | null;
  approvedByType: string | null;
  documents: Array<{
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
  }>;
  policy: {
    id: string;
    policyNumber: string;
    rentAmount: number;
    propertyDetails?: {
      propertyAddressDetails?: {
        formattedAddress?: string | null;
      } | null;
    } | null;
  };
  tokenType: 'BROKER' | 'LANDLORD';
  submittedAt: Date | null;
}

interface InvestigationApprovalCardProps {
  investigation: InvestigationData;
  token: string;
  onApproved?: () => void;
  onRejected?: () => void;
}

// Get file type icon based on file name extension
const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  }
  if (ext === 'pdf') {
    return <File className="h-5 w-5 text-red-500" />;
  }
  return <FileText className="h-5 w-5 text-muted-foreground" />;
};

export function InvestigationApprovalCard({ investigation, token, onApproved, onRejected }: InvestigationApprovalCardProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const approveMutation = trpc.investigation.approve.useMutation({
    onSuccess: () => {
      toast({ title: 'Investigación aprobada', description: 'Se ha notificado a todas las partes' });
      onApproved?.();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = trpc.investigation.reject.useMutation({
    onSuccess: () => {
      toast({ title: 'Investigación rechazada', description: 'Se ha notificado a todas las partes' });
      onRejected?.();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const downloadUrlQuery = trpc.investigation.getDocumentDownloadUrlByToken.useQuery(
    { token, documentId: downloadingDoc || '' },
    { enabled: !!downloadingDoc }
  );

  // Handle document download
  const handleDownload = async (documentId: string, fileName: string) => {
    setDownloadingDoc(documentId);
    try {
      const result = await downloadUrlQuery.refetch();
      if (result.data?.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
      }
    } catch (error) {
      toast({ title: 'Error al descargar', variant: 'destructive' });
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleApprove = () => {
    approveMutation.mutate({ token, notes: notes || undefined });
    setShowApproveDialog(false);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Error', description: 'Debes proporcionar un motivo de rechazo', variant: 'destructive' });
      return;
    }
    if (rejectionReason.trim().length < INVESTIGATION_FORM_LIMITS.rejectionReason.min) {
      toast({
        title: 'Error',
        description: `El motivo debe tener al menos ${INVESTIGATION_FORM_LIMITS.rejectionReason.min} caracteres`,
        variant: 'destructive'
      });
      return;
    }
    rejectMutation.mutate({ token, reason: rejectionReason });
    setShowRejectDialog(false);
  };

  // Get actor name with proper null handling
  const actorName = investigation.actor
    ? (investigation.actor.companyName || formatFullName({
        firstName: investigation.actor.firstName,
        middleName: investigation.actor.middleName,
        paternalLastName: investigation.actor.paternalLastName,
        maternalLastName: investigation.actor.maternalLastName,
      }))
    : 'Actor no disponible';

  const propertyAddress = investigation.policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'Dirección no disponible';
  const isAlreadyProcessed = investigation.status !== 'PENDING';
  const actorTypeLabel = getInvestigatedActorLabel(investigation.actorType);
  const tokenTypeLabel = investigation.tokenType === 'BROKER' ? 'Broker' : 'Arrendador';

  return (
    <div className="space-y-6">
      {/* Already processed banner */}
      {isAlreadyProcessed && (
        <Alert variant={investigation.status === 'APPROVED' ? 'default' : 'destructive'}>
          {investigation.status === 'APPROVED' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            Investigación {investigation.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
          </AlertTitle>
          <AlertDescription>
            Esta investigación ya fue {investigation.status === 'APPROVED' ? 'aprobada' : 'rechazada'} por {investigation.approvedByType ? getApproverTypeLabel(investigation.approvedByType as any).toLowerCase() : 'desconocido'} el {investigation.approvedAt ? formatDateTimeLong(investigation.approvedAt) : ''}.
          </AlertDescription>
        </Alert>
      )}

      {/* Policy Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>Protección #{investigation.policy.policyNumber}</CardTitle>
              <CardDescription>{propertyAddress}</CardDescription>
            </div>
            <Badge variant="outline">
              {tokenTypeLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Renta mensual:</span>
              <span className="ml-2 font-medium">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(investigation.policy.rentAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actor Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>{actorName}</CardTitle>
              <CardDescription>Prospecto</CardDescription>
            </div>
            <Badge>{actorTypeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {investigation.actor ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2">{investigation.actor.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono:</span>
                <span className="ml-2">{investigation.actor.phone}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Información del actor no disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Investigation Results Card */}
      <Card>
        <CardHeader>
          <CardTitle>Investigación</CardTitle>
          <CardDescription>
            Enviada el {investigation.submittedAt ? formatDateTimeLong(investigation.submittedAt) : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Findings */}
          <div>
            <Label className="text-muted-foreground">Comentarios</Label>
            <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
              {investigation.findings || 'Sin comentarios registrados'}
            </div>
          </div>

          {/* Documents */}
          {investigation.documents.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Resultado de la Investigación</Label>
              <div className="mt-2 space-y-2" role="list" aria-label="Documentos de soporte">
                {investigation.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    role="listitem"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.originalName)}
                      <div>
                        <p className="text-sm font-medium">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc.id, doc.originalName)}
                      disabled={downloadingDoc === doc.id}
                      aria-label={`Descargar ${doc.originalName}`}
                    >
                      {downloadingDoc === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Approval Actions */}
        {!isAlreadyProcessed && (
          <CardFooter className="flex flex-col gap-4 border-t pt-6">
            <div className="w-full space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Agrega notas o comentarios..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                aria-describedby="notes-help"
              />
              <p id="notes-help" className="text-xs text-muted-foreground">
                Máximo {INVESTIGATION_FORM_LIMITS.approvalNotes.max} caracteres
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowRejectDialog(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ backgroundColor: brandColors.success }}
                onClick={() => setShowApproveDialog(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprobar
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas aprobar esta investigación?
              <br /><br />
              Se notificará a todas las partes involucradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="text-white"
              style={{ backgroundColor: brandColors.success }}
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Rechazo</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>¿Estás seguro de que deseas rechazar esta investigación?</p>
                <div>
                  <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Describe el motivo del rechazo..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="mt-2"
                    aria-describedby="rejection-help"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span id="rejection-help">Mínimo {INVESTIGATION_FORM_LIMITS.rejectionReason.min} caracteres</span>
                    <span>{rejectionReason.length} / {INVESTIGATION_FORM_LIMITS.rejectionReason.max}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejectMutation.isPending || rejectionReason.trim().length < INVESTIGATION_FORM_LIMITS.rejectionReason.min}
              className="text-white"
              style={{ backgroundColor: brandColors.danger }}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
