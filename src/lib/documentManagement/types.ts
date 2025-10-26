import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';

/**
 * Operation types for document management
 */
export type DocumentOperationType = 'upload' | 'download' | 'delete';

/**
 * Status of a document operation
 */
export type DocumentOperationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Progress information for an operation
 */
export interface OperationProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Document operation state
 */
export interface DocumentOperation {
  id: string;
  type: DocumentOperationType;
  status: DocumentOperationStatus;
  progress?: OperationProgress;
  error?: string;
  documentId?: string;
  category?: DocumentCategory;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * File validation options
 */
export interface ValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Upload configuration
 */
export interface UploadConfig {
  file: File;
  endpoint: string;
  category: DocumentCategory;
  documentType: string;
  onProgress?: (progress: OperationProgress) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

/**
 * Download configuration
 */
export interface DownloadConfig {
  documentId: string;
  fileName: string;
  endpoint: string;
  onProgress?: (progress: OperationProgress) => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

/**
 * Delete configuration
 */
export interface DeleteConfig {
  documentId: string;
  endpoint: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Grouped documents by category
 */
export type GroupedDocuments = Record<DocumentCategory, Document[]>;

/**
 * Operation registry - maps operation IDs to operation states
 */
export type OperationRegistry = Record<string, DocumentOperation>;

/**
 * Error registry - maps document IDs or category keys to errors
 */
export type ErrorRegistry = Record<string, string>;
