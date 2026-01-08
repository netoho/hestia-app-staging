'use client';

import { CheckCircle, Upload } from 'lucide-react';
import { Document } from '@/types/documents';
import { DocumentList } from './DocumentList';
import { DocumentUploader } from './DocumentUploader';
import { DocumentOperation } from '@/lib/documentManagement/types';

interface InlineDocumentManagerProps {
  label: string;
  documentType: string;
  documents: Document[];
  allowMultiple?: boolean;
  readOnly?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  operations?: DocumentOperation[];
  disabled?: boolean;
  accept?: string;
}

export function InlineDocumentManager({
  label,
  documentType,
  documents,
  allowMultiple = true,
  readOnly = false,
  onUpload,
  onDelete,
  onDownload,
  operations = [],
  disabled = false,
  accept = '.pdf,.jpg,.jpeg,.png,.webp',
}: InlineDocumentManagerProps) {
  const hasDocuments = documents.length > 0;
  const canUpload = !readOnly && (allowMultiple || !hasDocuments);

  // Get upload operation for this document type
  const uploadOperation = operations.find(
    (op) => op.type === 'upload' && op.status === 'pending'
  );

  const getButtonText = () => {
    if (uploadOperation) return 'Cargando...';
    if (hasDocuments && !allowMultiple) return 'Reemplazar';
    if (hasDocuments && allowMultiple) return 'Agregar Otro';
    return 'Cargar';
  };

  return (
    <div className="space-y-3">
      {/* Upload Control */}
      {canUpload && (
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

          <DocumentUploader
            documentType={documentType}
            onUpload={onUpload}
            accept={accept}
            disabled={disabled}
            operation={uploadOperation}
            variant="button-only"
            buttonText={getButtonText()}
            showProgress={false}
          />
        </div>
      )}

      {/* Progress indicator below upload button */}
      {uploadOperation && uploadOperation.status === 'pending' && (
        <div className="px-4">
          <div className="flex items-center text-sm text-blue-600">
            {uploadOperation.progress && (
              <span className="font-medium">{uploadOperation.progress.percentage}% </span>
            )}
            <span className="ml-1">Subiendo...</span>
          </div>
        </div>
      )}

      {/* Document List */}
      {hasDocuments && (
        <DocumentList
          documents={documents}
          readOnly={readOnly}
          onDownload={onDownload}
          onDelete={onDelete}
          operations={operations}
          showEmptyState={false}
        />
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
