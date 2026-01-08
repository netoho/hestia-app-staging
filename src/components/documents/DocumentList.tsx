'use client';

import { Document } from '@/types/documents';
import { DocumentListItem } from './DocumentListItem';
import { DocumentOperation } from '@/lib/documentManagement/types';
import { Upload } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  readOnly?: boolean;
  operations?: DocumentOperation[];
  emptyMessage?: string;
  showEmptyState?: boolean;
}

export function DocumentList({
  documents,
  onDownload,
  onDelete,
  readOnly = false,
  operations = [],
  emptyMessage = 'No se ha cargado ningún documento',
  showEmptyState = true,
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
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
