'use client';

import { Document } from '@/types/documents';
import { DocumentListItem } from './DocumentListItem';
import { DocumentOperation } from '@/lib/documentManagement/types';
import { Upload, CheckCircle } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  readOnly?: boolean;
  operations?: DocumentOperation[];
  emptyMessage?: string;
  showEmptyState?: boolean;
  label?: string;
}

export function DocumentList({
  documents,
  onDownload,
  onDelete,
  readOnly = false,
  operations = [],
  emptyMessage = 'No se ha cargado ningún documento',
  showEmptyState = true,
  label,
}: DocumentListProps) {
  // Helper to get operation for a document
  const getDocumentOperation = (documentId: string): DocumentOperation | undefined => {
    return operations.find((op) => op.documentId === documentId);
  };

  // Show empty state if no documents
  if (documents.length === 0) {
    if (!showEmptyState) {
      return null;
    }

    return (
      <div className="p-4 border-2 border-dashed rounded-lg text-center">
        {label && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
          </div>
        )}
        {!label && <Upload className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />}
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-2 px-3 py-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700 font-medium">{label}</span>
        </div>
      )}
      {documents.map((doc) => {
        const operation = getDocumentOperation(doc.id);

        return (
          <DocumentListItem
            key={doc.id}
            document={doc}
            readOnly={readOnly}
            onDownload={onDownload}
            onDelete={onDelete}
            operation={operation}
          />
        );
      })}
    </div>
  );
}
