'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle } from 'lucide-react';
import { Document } from '@/types/documents';
import { DocumentListItem } from './DocumentListItem';

interface InlineDocumentUploadProps {
  label: string;
  documentType: string;
  documents: Document[];
  allowMultiple?: boolean;
  readOnly?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  uploading?: boolean;
  deletingDocumentId?: string | null;
  disabled?: boolean;
}

export function InlineDocumentUpload({
  label,
  documentType,
  documents,
  allowMultiple = true,
  readOnly = false,
  onUpload,
  onDelete,
  onDownload,
  uploading = false,
  deletingDocumentId = null,
  disabled = false,
}: InlineDocumentUploadProps) {
  const hasDocuments = documents.length > 0;
  const canUpload = allowMultiple || !hasDocuments;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Clear input so same file can be selected again
      e.target.value = '';
    }
  };

  const getButtonText = () => {
    if (uploading) return 'Cargando...';
    if (hasDocuments && !allowMultiple) return 'Reemplazar';
    if (hasDocuments && allowMultiple) return 'Agregar Otro';
    return 'Cargar';
  };

  return (
    <div className="space-y-3">
      {/* Upload Control */}
      {!readOnly && canUpload && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
          <div className="flex items-center space-x-3">
            {hasDocuments ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Upload className="h-5 w-5 text-gray-400" />
            )}
            <span className={hasDocuments ? 'text-green-700 font-medium' : ''}>
              {label}
            </span>
          </div>
          <Label htmlFor={documentType} className="cursor-pointer">
            <Input
              id={documentType}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleChange}
              className="hidden"
              disabled={uploading || disabled}
            />
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={uploading || disabled}
            >
              <span>{getButtonText()}</span>
            </Button>
          </Label>
        </div>
      )}

      {/* Document List */}
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

      {/* Read-only mode with no documents */}
      {readOnly && !hasDocuments && (
        <div className="p-4 border rounded-lg bg-gray-50 text-sm text-gray-500 text-center">
          No se ha cargado ningún documento
        </div>
      )}
    </div>
  );
}
