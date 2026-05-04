'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, Trash2, Send, ArrowLeft, FileImage, File } from 'lucide-react';
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
import {
  INVESTIGATION_FORM_LIMITS,
  getInvestigatedActorLabel,
} from '@/lib/constants/investigationConfig';
import { getCategoryValidation } from '@/lib/constants/documentCategories';
import { DocumentCategory } from '@/prisma/generated/prisma-client/enums';
import { validateFile, formatFileSize } from '@/lib/documentManagement/validation';
import { InvestigationSubmittedDialog } from './InvestigationSubmittedDialog';

interface ApprovalUrls {
  broker: string;
  landlord: string;
  brokerPhone?: string | null;
  landlordPhone?: string | null;
  brokerName: string;
  landlordName: string;
}

const investigationSchema = z.object({
  findings: z.string()
    .min(INVESTIGATION_FORM_LIMITS.findings.min, `Los comentarios deben tener al menos ${INVESTIGATION_FORM_LIMITS.findings.min} caracteres`)
    .max(INVESTIGATION_FORM_LIMITS.findings.max, `Los comentarios no pueden exceder ${INVESTIGATION_FORM_LIMITS.findings.max} caracteres`),
});

type InvestigationFormData = z.infer<typeof investigationSchema>;

interface ExistingInvestigation {
  id: string;
  findings?: string | null;
  documents: Array<{
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
  }>;
}

interface InvestigationFormProps {
  policyId: string;
  actorType: 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
  actorId: string;
  actor: {
    id: string;
    firstName?: string;
    middleName?: string;
    paternalLastName?: string;
    maternalLastName?: string;
    companyName?: string;
    email: string;
    phone: string;
  };
  policy: {
    policyNumber: string;
    propertyDetails?: {
      propertyAddressDetails?: {
        formattedAddress?: string | null;
      } | null;
    } | null;
  };
  existingInvestigation?: ExistingInvestigation | null;
  isEditMode?: boolean;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

// Get file type icon based on MIME type
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

// Get validation config from centralized location
const validationConfig = getCategoryValidation(DocumentCategory.INVESTIGATION_SUPPORT);

export function InvestigationForm({
  policyId,
  actorType,
  actorId,
  actor,
  policy,
  existingInvestigation,
  isEditMode = false,
}: InvestigationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [investigationId, setInvestigationId] = useState<string | null>(
    existingInvestigation?.id || null
  );
  const [documents, setDocuments] = useState<UploadedDocument[]>(
    existingInvestigation?.documents.map(d => ({
      id: d.id,
      fileName: d.originalName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
    })) || []
  );
  const [uploading, setUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false);
  const [approvalUrls, setApprovalUrls] = useState<ApprovalUrls | null>(null);

  const utils = trpc.useUtils();

  const createMutation = trpc.investigation.create.useMutation({
    onSuccess: (data) => {
      setInvestigationId(data.investigation.id);
      utils.investigation.getByPolicy.invalidate({ policyId });
      toast({ title: 'Investigación creada' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = trpc.investigation.update.useMutation({
    onSuccess: () => {
      utils.investigation.getByPolicy.invalidate({ policyId });
      if (investigationId) utils.investigation.getById.invalidate({ id: investigationId });
      toast({ title: 'Borrador guardado', description: 'Los cambios se han guardado correctamente' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const submitMutation = trpc.investigation.submit.useMutation({
    onSuccess: (data) => {
      utils.investigation.getByPolicy.invalidate({ policyId });
      if (investigationId) utils.investigation.getById.invalidate({ id: investigationId });
      toast({ title: 'Investigación enviada', description: 'Se ha notificado al broker y arrendador para su aprobación' });
      if (data.approvalUrls) {
        setApprovalUrls(data.approvalUrls);
        setShowSubmittedDialog(true);
      } else {
        router.push(`/dashboard/policies/${policyId}/investigations`);
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getUploadUrlMutation = trpc.investigation.getDocumentUploadUrl.useMutation();
  const removeDocumentMutation = trpc.investigation.removeDocument.useMutation({
    onSuccess: () => {
      toast({ title: 'Documento eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<InvestigationFormData>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      findings: existingInvestigation?.findings || '',
    },
  });

  const watchedFindings = watch('findings');

  // Create investigation on first interaction
  const ensureInvestigation = useCallback(async () => {
    if (!investigationId && !createMutation.isPending) {
      const result = await createMutation.mutateAsync({
        policyId,
        actorType,
        actorId,
      });
      return result.investigation.id;
    }
    return investigationId;
  }, [investigationId, createMutation, policyId, actorType, actorId]);

  // Handle file upload with validation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before upload using centralized config
    const validation = validateFile(file, {
      maxSizeMB: validationConfig.maxSizeMB,
      allowedTypes: [...validationConfig.allowedMimeTypes],
      allowedExtensions: [...validationConfig.allowedExtensions],
    });

    if (!validation.valid) {
      toast({ title: 'Error de validación', description: validation.error, variant: 'destructive' });
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const invId = await ensureInvestigation();
      if (!invId) throw new Error('No investigation ID');

      // Get presigned URL
      const { uploadUrl, documentId } = await getUploadUrlMutation.mutateAsync({
        investigationId: invId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      // Upload to S3
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setDocuments(prev => [...prev, {
        id: documentId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }]);

      toast({ title: 'Documento subido' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Error al subir documento', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Remove document
  const handleRemoveDocument = async (documentId: string) => {
    if (!investigationId) return;

    await removeDocumentMutation.mutateAsync({
      investigationId,
      documentId,
    });

    setDocuments(prev => prev.filter(d => d.id !== documentId));
  };

  // Save draft (update)
  const handleSaveDraft = async (data: InvestigationFormData) => {
    const invId = await ensureInvestigation();
    if (!invId) return;

    await updateMutation.mutateAsync({
      id: invId,
      findings: data.findings,
    });
  };

  // Submit for approval
  const handleSubmitForApproval = async (data: InvestigationFormData) => {
    const invId = investigationId || await ensureInvestigation();
    if (!invId) return;

    await submitMutation.mutateAsync({
      id: invId,
      findings: data.findings,
    });
  };

  const onSubmit = (data: InvestigationFormData) => {
    // Documents are mandatory
    if (documents.length === 0) {
      toast({
        title: 'Documentos requeridos',
        description: 'Debe subir al menos un documento de soporte',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const actorName = actor.companyName || formatFullName(
    actor.firstName,
    actor.paternalLastName,
    actor.maternalLastName,
    actor.middleName,
  );

  const propertyAddress = policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'Dirección no disponible';
  const actorTypeLabel = getInvestigatedActorLabel(actorType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Editar Investigación' : 'Nueva Investigación'}
          </h1>
          <p className="text-muted-foreground">
            Protección #{policy.policyNumber}
          </p>
        </div>
      </div>

      {/* Actor Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>{actorName}</CardTitle>
              <CardDescription>{actorTypeLabel}</CardDescription>
            </div>
            <Badge variant="muted">{actorTypeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <span className="ml-2">{actor.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Teléfono:</span>
              <span className="ml-2">{actor.phone}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Propiedad:</span>
              <span className="ml-2">{propertyAddress}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investigation Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Investigación</CardTitle>
            <CardDescription>
              Ingresa los detalles de la investigación realizada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Findings */}
            <div className="space-y-2">
              <Label htmlFor="findings">Comentarios *</Label>
              <Textarea
                id="findings"
                placeholder="Describe los comentarios de la investigación..."
                rows={6}
                aria-describedby="findings-help findings-error"
                {...register('findings')}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span id="findings-help">Mínimo {INVESTIGATION_FORM_LIMITS.findings.min} caracteres</span>
                <span>{watchedFindings?.length || 0} / {INVESTIGATION_FORM_LIMITS.findings.max}</span>
              </div>
              {errors.findings && (
                <p id="findings-error" className="text-sm text-destructive" role="alert">{errors.findings.message}</p>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos *</CardTitle>
            <CardDescription>
              Sube los documentos de soporte de la investigación (obligatorio)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload area */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center"
              role="region"
              aria-label="Área de carga de documentos"
            >
              <input
                type="file"
                id="document-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept={validationConfig.allowedExtensions.join(',')}
                disabled={uploading}
                aria-describedby="upload-help"
              />
              <label
                htmlFor="document-upload"
                className={`cursor-pointer flex flex-col items-center gap-2 ${uploading ? 'pointer-events-none' : ''}`}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Subiendo...' : 'Haz clic para subir documento'}
                </span>
                <span id="upload-help" className="text-xs text-muted-foreground">
                  {validationConfig.formatsLabel} (máx. {validationConfig.maxSizeMB}MB)
                </span>
              </label>
            </div>

            {/* Document list or empty state */}
            {documents.length > 0 ? (
              <div className="space-y-2" role="list" aria-label="Documentos subidos">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    role="listitem"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.fileName)}
                      <div>
                        <p className="text-sm font-medium">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocument(doc.id)}
                      disabled={removeDocumentMutation.isPending}
                      aria-label={`Eliminar ${doc.fileName}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No hay documentos subidos. Debe subir al menos un documento de soporte para enviar la investigación.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(handleSaveDraft)}
            disabled={updateMutation.isPending || createMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Borrador
          </Button>
          <Button
            type="submit"
            disabled={submitMutation.isPending || createMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Enviar para Aprobación
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío de investigación</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Se enviará la investigación al broker y arrendador para su aprobación.</p>
                <div className="mt-4 space-y-1 text-sm">
                  <p><strong>Actor:</strong> {actorName} ({actorTypeLabel})</p>
                  <p><strong>Documentos:</strong> {documents.length} archivo(s)</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit(handleSubmitForApproval)}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submitted Dialog with approval links */}
      {approvalUrls && (
        <InvestigationSubmittedDialog
          isOpen={showSubmittedDialog}
          onClose={() => setShowSubmittedDialog(false)}
          policyId={policyId}
          policyNumber={policy.policyNumber}
          actorName={actorName}
          approvalUrls={approvalUrls}
        />
      )}
    </div>
  );
}
