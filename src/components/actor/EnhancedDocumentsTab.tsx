'use client';

import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Plus,
  X
} from 'lucide-react';
import { DocumentCategory } from '@/types/policy';
import { formatFileSize } from '@/lib/utils';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { getDocumentCategoriesByActorType } from '@/lib/constants/documentCategories';

interface EnhancedDocumentsTabProps {
  token: string | null;
  actorType: 'tenant' | 'joint-obligor' | 'aval' | 'landlord';
  additionalInfo?: string;
  updateFormData: (field: string, value: any) => void;
  isCompany?: boolean;
}

export default function EnhancedDocumentsTab({
  token,
  actorType,
  additionalInfo,
  updateFormData,
  isCompany = false,
}: EnhancedDocumentsTabProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const {
    documents,
    uploadingFiles,
    uploadErrors,
    deletingFiles,
    loading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    clearUploadError,
  } = useDocumentManagement({ token, actorType });

  // Get dynamic categories based on actor type and company/individual status
  const categoriesToShow = getDocumentCategoriesByActorType(
    actorType,
    isCompany,
    actorType === 'aval'
  );

  const handleFileSelect = async (category: DocumentCategory, documentType: string, file: File) => {
    await uploadDocument(file, category, documentType);

    // Clear the file input
    const inputKey = `${category}-new`;
    if (fileInputRefs.current[inputKey]) {
      fileInputRefs.current[inputKey]!.value = '';
    }
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getCategoryDocuments = (category: DocumentCategory) => {
    return documents[category] || [];
  };

  const getTotalDocumentCount = () => {
    return Object.values(documents).reduce((sum, docs) => sum + docs.length, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Cargando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Cargue los documentos requeridos. Puede subir múltiples archivos por categoría.
        </p>
        <Badge variant="secondary">
          {getTotalDocumentCount()} documento{getTotalDocumentCount() !== 1 ? 's' : ''} cargado{getTotalDocumentCount() !== 1 ? 's' : ''}
        </Badge>
      </div>

      {categoriesToShow.map(({ category, title, description, documentType, required }) => {
        const categoryDocs = getCategoryDocuments(category);
        const uploadingInCategory = Object.keys(uploadingFiles).some(key => key.startsWith(category));

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
                  <Badge variant="outline">
                    {categoryDocs.length} archivo{categoryDocs.length > 1 ? 's' : ''}
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
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getDocumentIcon()}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadDocument(doc.id, doc.fileName)}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDocument(doc.id)}
                          disabled={deletingFiles[doc.id]}
                          title="Eliminar"
                        >
                          {deletingFiles[doc.id] ? (
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
                <div className="flex items-center gap-2">
                  <Input
                    ref={el => fileInputRefs.current[`${category}-new`] = el}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileSelect(category, documentType, file);
                      }
                    }}
                    disabled={uploadingInCategory}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingInCategory}
                    onClick={() => fileInputRefs.current[`${category}-new`]?.click()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {uploadingInCategory && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo documento...
                  </div>
                )}

                {/* Upload errors */}
                {Object.entries(uploadErrors).map(([key, error]) => {
                  if (key.startsWith(category)) {
                    return (
                      <Alert key={key} className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 flex items-center justify-between">
                          <span>{error}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => clearUploadError(key)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información adicional</CardTitle>
          <CardDescription>Cualquier información adicional que quieras compartir</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full p-3 border rounded-md"
            rows={4}
            placeholder="LinkedIn, Portafolio, referencias adicionales..."
            value={additionalInfo || ''}
            onChange={(e) => updateFormData('additionalInfo', e.target.value)}
          />
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formatos aceptados:</strong> PDF, JPG, JPEG, PNG, WEBP<br />
          <strong>Tamaño máximo:</strong> 10MB por archivo<br />
          <strong>Nota:</strong> Puede subir múltiples documentos por categoría
        </AlertDescription>
      </Alert>
    </div>
  );
}