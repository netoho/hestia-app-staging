import { DocumentCategory } from './policy';

/**
 * Shared document interface used across all document components
 */
export interface Document {
  id: string;
  category: DocumentCategory;
  documentType: string;
  fileName: string;
  originalName?: string;
  fileSize: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

/**
 * Document upload/delete operation states
 */
export type DocumentOperationState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Props for components that handle document operations
 */
export interface DocumentOperationHandlers {
  onUpload: (file: File) => void | Promise<void>;
  onDelete?: (documentId: string) => void | Promise<void>;
  onDownload?: (documentId: string, fileName: string) => void | Promise<void>;
}

/**
 * Common props for document display components
 */
export interface DocumentDisplayProps {
  documents: Document[];
  readOnly?: boolean;
  disabled?: boolean;
}

/**
 * Props for upload controls
 */
export interface DocumentUploadProps {
  allowMultiple?: boolean; // Default: true
  uploading?: boolean;
  uploadError?: string;
  accept?: string; // Default: 'image/*,application/pdf'
  maxSizeMB?: number; // Default: 10
}
