'use client';

import { use, useState } from 'react';
import { useRouter, redirect } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FileImage,
  File,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { formatFullName } from '@/lib/utils/names';
import { formatDateTimeLong } from '@/lib/utils/formatting';
import { formatFileSize } from '@/lib/documentManagement/validation';
import {
  getInvestigatedActorLabel,
  getVerdictLabel,
  getVerdictColorClasses,
  getRiskLevelLabel,
  getRiskLevelColorClasses,
  getApproverTypeLabel,
  getInvestigationStatusLabel,
} from '@/lib/constants/investigationConfig';
import DeleteInvestigationDialog from '@/components/investigations/list/DeleteInvestigationDialog';

interface InvestigationDetailPageProps {
  params: Promise<{ id: string; investigationId: string }>;
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

export default function InvestigationDetailPage({ params }: InvestigationDetailPageProps) {
  const { id: policyId, investigationId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const userLoading = sessionStatus === 'loading';
  const user = session?.user as any;

  // Get investigation details
  const {
    data: investigation,
    isLoading: investigationLoading,
    refetch,
  } = trpc.investigation.getById.useQuery(
    { id: investigationId },
    { enabled: !!investigationId }
  );

  // Document download query
  const downloadUrlQuery = trpc.investigation.getDocumentDownloadUrl.useQuery(
    { documentId: downloadingDoc || '' },
    { enabled: !!downloadingDoc }
  );

  // Auth check
  if (!userLoading && !user) {
    redirect('/login');
  }

  // Role check
  if (!userLoading && user && !['ADMIN', 'STAFF', 'BROKER'].includes(user.role)) {
    redirect('/dashboard');
  }

  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const canEditInvestigation = canEdit && investigation?.status === 'PENDING';
  const canDeleteInvestigation = canEdit && investigation?.status === 'PENDING' && !investigation?.submittedAt;

  // Handle document download
  const handleDownload = async (documentId: string) => {
    setDownloadingDoc(documentId);
    try {
      const result = await downloadUrlQuery.refetch();
      if (result.data?.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
      }
    } catch {
      toast({ title: 'Error al descargar', variant: 'destructive' });
    } finally {
      setDownloadingDoc(null);
    }
  };

  // Handle delete success
  const handleDeleteSuccess = () => {
    router.push(`/dashboard/policies/${policyId}/investigations`);
  };

  if (investigationLoading || userLoading) {
    return (
      <div className="container mx-auto w-full">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="container mx-auto w-full">
        <p className="text-center text-muted-foreground py-8">
          Investigación no encontrada
        </p>
      </div>
    );
  }

  // Get actor name
  const actorName = investigation.actor
    ? (investigation.actor.companyName || formatFullName({
        firstName: investigation.actor.firstName,
        middleName: investigation.actor.middleName,
        paternalLastName: investigation.actor.paternalLastName,
        maternalLastName: investigation.actor.maternalLastName,
      }))
    : 'Actor no disponible';

  const propertyAddress =
    investigation.policy.propertyDetails?.propertyAddressDetails?.formattedAddress ||
    'Dirección no disponible';

  const isProcessed = investigation.status !== 'PENDING';

  return (
    <div className="container mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href={`/dashboard/policies/${policyId}/investigations`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a investigaciones
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Detalle de Investigación</h1>
          <div className="flex gap-2">
            {canEditInvestigation && (
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/dashboard/policies/${policyId}/investigation/${investigation.actorType}/${investigation.actorId}/new?edit=${investigation.id}`
                  )
                }
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {canDeleteInvestigation && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {isProcessed && (
        <Alert variant={investigation.status === 'APPROVED' ? 'default' : 'destructive'}>
          {investigation.status === 'APPROVED' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            Investigación {getInvestigationStatusLabel(investigation.status as any)}
          </AlertTitle>
          <AlertDescription>
            {investigation.approvedByType && (
              <>
                Por {getApproverTypeLabel(investigation.approvedByType as any).toLowerCase()}{' '}
              </>
            )}
            {investigation.approvedAt && (
              <>el {formatDateTimeLong(investigation.approvedAt)}</>
            )}
            {investigation.approvalNotes && (
              <div className="mt-2">
                <strong>Notas:</strong> {investigation.approvalNotes}
              </div>
            )}
            {investigation.rejectionReason && (
              <div className="mt-2">
                <strong>Motivo:</strong> {investigation.rejectionReason}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Policy Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>Póliza #{investigation.policy.policyNumber}</CardTitle>
              <CardDescription>{propertyAddress}</CardDescription>
            </div>
            <Badge variant={isProcessed ? (investigation.status === 'APPROVED' ? 'success' : 'destructive') : 'secondary'}>
              {getInvestigationStatusLabel(investigation.status as any)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Actor Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>{actorName}</CardTitle>
              <CardDescription>Sujeto de Investigación</CardDescription>
            </div>
            <Badge>{getInvestigatedActorLabel(investigation.actorType as any)}</Badge>
          </div>
        </CardHeader>
        {investigation.actor && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {investigation.actor.email && (
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2">{investigation.actor.email}</span>
                </div>
              )}
              {investigation.actor.phone && (
                <div>
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="ml-2">{investigation.actor.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Investigation Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados de la Investigación</CardTitle>
          <CardDescription>
            {investigation.submittedAt
              ? `Enviada el ${formatDateTimeLong(investigation.submittedAt)}`
              : `Creada el ${formatDateTimeLong(investigation.createdAt)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Verdict & Risk Level */}
          <div className="flex flex-wrap gap-4">
            <div>
              <Label className="text-muted-foreground">Veredicto</Label>
              <div className="mt-1">
                {investigation.verdict ? (
                  <Badge className={getVerdictColorClasses(investigation.verdict as any)}>
                    {getVerdictLabel(investigation.verdict as any)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin veredicto</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Nivel de Riesgo</Label>
              <div className="mt-1">
                {investigation.riskLevel ? (
                  <Badge className={getRiskLevelColorClasses(investigation.riskLevel as any)}>
                    {getRiskLevelLabel(investigation.riskLevel as any)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin nivel</span>
                )}
              </div>
            </div>
          </div>

          {/* Warning for high risk */}
          {(investigation.verdict === 'REJECTED' || investigation.verdict === 'HIGH_RISK') && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {investigation.verdict === 'REJECTED'
                  ? 'Esta investigación ha resultado en un veredicto RECHAZADO.'
                  : 'Esta investigación indica un nivel de ALTO RIESGO.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Findings */}
          <div>
            <Label className="text-muted-foreground">Comentarios</Label>
            <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
              {investigation.findings || 'Sin comentarios registrados'}
            </div>
          </div>

          {/* Documents */}
          <div>
            <Label className="text-muted-foreground">Documentos de Soporte</Label>
            {investigation.documents.length > 0 ? (
              <div className="mt-2 space-y-2">
                {investigation.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
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
                      onClick={() => handleDownload(doc.id)}
                      disabled={downloadingDoc === doc.id}
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
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Sin documentos</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <DeleteInvestigationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        investigation={
          investigation
            ? { id: investigation.id, actorName, actorType: investigation.actorType }
            : null
        }
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
