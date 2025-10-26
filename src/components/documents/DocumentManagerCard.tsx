'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';
import { DocumentList } from './DocumentList';
import { DocumentUploader } from './DocumentUploader';
import { DocumentOperation } from '@/lib/documentManagement/types';

interface DocumentManagerCardProps {
  category: DocumentCategory;
  title: string;
  description?: string;
  documentType: string;
  documents: Document[];
  required?: boolean;
  readOnly?: boolean;
  allowMultiple?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  operations?: DocumentOperation[];
  disabled?: boolean;
  accept?: string;
}

export function DocumentManagerCard({
  category,
  title,
  description = '',
  documentType,
  documents,
  required = false,
  readOnly = false,
  allowMultiple = true,
  onUpload,
  onDelete,
  onDownload,
  operations = [],
  disabled = false,
  accept = '.pdf,.jpg,.jpeg,.png,.webp',
}: DocumentManagerCardProps) {
  const hasDocuments = documents.length > 0;
  const canUpload = !readOnly && (allowMultiple || !hasDocuments);

  // Get upload operation for this category
  const uploadOperation = operations.find(
    (op) => op.type === 'upload' && op.category === category && op.status === 'pending'
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {title} {required && <span className="text-red-500">*</span>}
            </CardTitle>
            {description && (<CardDescription>{description}</CardDescription>)}
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
          <DocumentList
            documents={documents}
            readOnly={readOnly}
            onDownload={onDownload}
            onDelete={onDelete}
            operations={operations}
            showEmptyState={false}
          />
        )}

        {/* Upload Area */}
        {canUpload && (
          <DocumentUploader
            documentType={documentType}
            onUpload={onUpload}
            accept={accept}
            disabled={disabled}
            operation={uploadOperation}
            variant="compact"
            showProgress={true}
          />
        )}

        {/* No documents in read-only mode */}
        {readOnly && !hasDocuments && (
          <DocumentList
            documents={[]}
            readOnly={readOnly}
            emptyMessage="No se ha cargado ningún documento"
            showEmptyState={true}
          />
        )}
      </CardContent>
    </Card>
  );
}
