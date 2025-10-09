'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  File,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Image,
  X
} from 'lucide-react';
import { DocumentCategory } from '@/types/policy';
import { formatFileSize } from '@/lib/utils';
import { getDocumentCategoriesByActorType } from '@/lib/constants/documentCategories';

interface Document {
  id: string;
  category: DocumentCategory;
  documentType: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

interface InternalDocumentsTabProps {
  policyId: string;
  actorType: 'tenant' | 'joint-obligor' | 'aval' | 'landlord';
  actorId: string;
  documents: Document[];
  onDocumentsFetch: () => void;
  isCompany?: boolean;
}

export default function InternalDocumentsTab({
  policyId,
  actorType,
  actorId,
  documents,
  onDocumentsFetch,
  isCompany = false,
}: InternalDocumentsTabProps) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({});
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Get dynamic categories based on actor type and company/individual status
  const categoriesToShow = getDocumentCategoriesByActorType(
    actorType,
    isCompany,
    actorType === 'aval'
  );

  const handleFileSelect = async (category: DocumentCategory, documentType: string, file: File) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (file.size > maxSize) {
      setUploadErrors({
        ...uploadErrors,
        [category]: `El archivo excede el tamaño máximo de 10MB`
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setUploadErrors({
        ...uploadErrors,
        [category]: `Tipo de archivo no permitido. Use PDF o imágenes.`
      });
      return;
    }

    // Clear previous errors
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[category];
      return newErrors;
    });

    // Upload file
    setUploading({ ...uploading, [category]: true });
    setUploadSuccess(prev => ({ ...prev, [category]: false }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('documentType', documentType);

      const endpoint = actorType === 'tenant'
        ? `/api/policies/${policyId}/tenant/documents`
        : actorType === 'joint-obligor'
        ? `/api/policies/${policyId}/joint-obligor/${actorId}/documents`
        : `/api/policies/${policyId}/aval/${actorId}/documents`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir el documento');
      }

      setUploadSuccess(prev => ({ ...prev, [category]: true }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(prev => ({ ...prev, [category]: false }));
      }, 3000);

      // Refresh documents list
      onDocumentsFetch();

      // Clear the file input
      if (fileInputRefs.current[category]) {
        fileInputRefs.current[category]!.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadErrors({
        ...uploadErrors,
        [category]: error instanceof Error ? error.message : 'Error al subir el documento'
      });
    } finally {
      setUploading({ ...uploading, [category]: false });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('¿Está seguro de eliminar este documento?')) {
      return;
    }

    setDeletingDoc(documentId);

    try {
      const endpoint = actorType === 'tenant'
        ? `/api/policies/${policyId}/tenant/documents/${documentId}`
        : actorType === 'joint-obligor'
        ? `/api/policies/${policyId}/joint-obligor/${actorId}/documents/${documentId}`
        : `/api/policies/${policyId}/aval/${actorId}/documents/${documentId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el documento');
      }

      // Refresh documents list
      onDocumentsFetch();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar el documento');
    } finally {
      setDeletingDoc(null);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);

      if (!response.ok) {
        throw new Error('Error al descargar el documento');
      }

      const data = await response.json();

      // Open the signed URL in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      alert('Error al descargar el documento');
    }
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getCategoryDocuments = (category: DocumentCategory) => {
    return documents.filter(doc => doc.category === category);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Gestione los documentos del actor. Puede subir nuevos documentos o eliminar los existentes.
      </p>

      {categoriesToShow.map(({ category, title, description, documentType, required }) => {
        const categoryDocs = getCategoryDocuments(category);
        const isUploading = uploading[category];
        const hasError = uploadErrors[category];
        const hasSuccess = uploadSuccess[category];

        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {title} {required && <span className="text-red-500">*</span>}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
                {categoryDocs.length > 0 && (
                  <Badge variant="secondary">
                    {categoryDocs.length} documento{categoryDocs.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Existing documents */}
              {categoryDocs.length > 0 && (
                <div className="mb-4 space-y-2">
                  {categoryDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getDocumentIcon(doc.mimeType)}
                        <div>
                          <p className="text-sm font-medium">{doc.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.fileSize)} • Subido el {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingDoc === doc.id}
                        >
                          {deletingDoc === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <div className="space-y-2">
                <Input
                  ref={el => fileInputRefs.current[category] = el}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(category, documentType, file);
                    }
                  }}
                  disabled={isUploading}
                />

                {isUploading && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo documento...
                  </div>
                )}

                {hasSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Documento subido exitosamente
                    </AlertDescription>
                  </Alert>
                )}

                {hasError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {hasError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formatos aceptados:</strong> PDF, JPG, JPEG, PNG, WEBP<br />
          <strong>Tamaño máximo:</strong> 10MB por archivo<br />
          <strong>Nota:</strong> Los documentos marcados con * son obligatorios
        </AlertDescription>
      </Alert>
    </div>
  );
}