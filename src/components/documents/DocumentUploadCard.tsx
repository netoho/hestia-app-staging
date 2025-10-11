'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';
import { DocumentListItem } from './DocumentListItem';

interface DocumentUploadCardProps {
  category: DocumentCategory;
  title: string;
  description: string;
  documentType: string;
  documents: Document[];
  required?: boolean;
  readOnly?: boolean;
  allowMultiple?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  uploading?: boolean;
  uploadError?: string;
  deletingDocumentId?: string | null;
  disabled?: boolean;
}

export function DocumentUploadCard({
  category,
  title,
  description,
  documentType,
  documents,
  required = false,
  readOnly = false,
  allowMultiple = true,
  onUpload,
  onDelete,
  onDownload,
  uploading = false,
  uploadError,
  deletingDocumentId = null,
  disabled = false,
}: DocumentUploadCardProps) {
  const hasDocuments = documents.length > 0;
  const canUpload = !readOnly && (allowMultiple || !hasDocuments);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Clear input so same file can be selected again
      e.target.value = '';
    }
  };

  const getUploadButtonText = () => {
    if (uploading) return 'Cargando...';
    if (hasDocuments && !allowMultiple) return 'Reemplazar';
    if (hasDocuments && allowMultiple) return 'Agregar';
    return 'Cargar';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {title} {required && <span className="text-red-500">*</span>}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {hasDocuments && (
            <Badge variant="outline">
              {documents.length} archivo{documents.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Existing Documents */}
        {hasDocuments && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                readOnly={readOnly}
                onDownload={onDownload}
                onDelete={onDelete}
                deleting={deletingDocumentId === doc.id}
              />
            ))}
          </div>
        )}

        {/* Upload Area */}
        {canUpload && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                disabled={uploading || disabled}
                className="flex-1"
                id={`upload-${category}-${documentType}`}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading || disabled}
                onClick={() => {
                  document.getElementById(`upload-${category}-${documentType}`)?.click();
                }}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {getUploadButtonText()}
              </Button>
            </div>

            {uploading && (
              <div className="flex items-center text-sm text-blue-600">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo documento...
              </div>
            )}

            {uploadError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {uploadError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* No documents in read-only mode */}
        {readOnly && !hasDocuments && (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No se ha cargado ningún documento</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
