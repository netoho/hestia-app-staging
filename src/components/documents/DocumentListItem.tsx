'use client';

import { Button } from '@/components/ui/button';
import { FileText, Image, Download, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Document } from '@/types/documents';
import { DocumentOperation } from '@/lib/documentManagement/types';
import { DocumentProgress } from './DocumentProgress';

interface DocumentListItemProps {
  document: Document;
  readOnly?: boolean;
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  deleting?: boolean;
  downloading?: boolean;
  operation?: DocumentOperation;
}

export function DocumentListItem({
  document,
  readOnly = false,
  onDownload,
  onDelete,
  deleting = false,
  downloading = false,
  operation,
}: DocumentListItemProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch (error) {
      console.error('Invalid date:', dateString);
      return 'Invalid date';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (document.mimeType?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const displayName = document.originalName || document.fileName;

  // Check if there's an active operation
  const hasActiveOperation = operation && operation.status === 'pending';
  const isDeleting = deleting || (operation?.type === 'delete' && operation.status === 'pending');
  const isDownloading = downloading || (operation?.type === 'download' && operation.status === 'pending');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{displayName}</p>
            <p className="text-xs text-gray-500">
              {formatFileSize(document.fileSize)}
              {' • '}
              {formatDate(document.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(document.id, displayName)}
              disabled={isDownloading || isDeleting}
              title="Descargar documento"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          )}

          {!readOnly && onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(document.id)}
              disabled={isDownloading || isDeleting}
              title="Eliminar documento"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Show progress for active operations */}
      {hasActiveOperation && (
        <div className="px-3">
          <DocumentProgress
            progress={operation.progress}
            status={operation.status}
            error={operation.error}
            variant="compact"
            showBytes={operation.type === 'download'}
          />
        </div>
      )}
    </div>
  );
}
