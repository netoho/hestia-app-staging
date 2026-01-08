/**
 * Storage Provider Types and Interfaces
 * Abstraction layer for multiple storage providers
 */

export interface StorageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StorageUploadOptions {
  path: string;
  file: StorageFile;
  metadata?: Record<string, string>;
  contentType?: string;
}

export interface StorageDownloadOptions {
  path: string;
  expiresInSeconds?: number;
}

export interface SignedUrlOptions {
  path: string;
  action: 'read' | 'write' | 'delete';
  expiresInSeconds?: number;
  responseDisposition?: 'inline' | 'attachment';
  fileName?: string;
}

export interface StorageFileMetadata {
  size: number;
  contentType?: string;
  created: Date;
  updated: Date;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(options: StorageUploadOptions, isPrivate: boolean): Promise<string>;

  publicUpload(options: StorageUploadOptions): Promise<string>;

  privateUpload(options: StorageUploadOptions): Promise<string>;

  /**
   * Download a file from storage
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  delete(path: string): Promise<boolean>;

  /**
   * Check if a file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getMetadata(path: string): Promise<StorageFileMetadata | null>;

  /**
   * Generate a signed URL for temporary access
   */
  getSignedUrl(options: SignedUrlOptions): Promise<string>;

  /**
   * List files in a directory
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Get the public URL for a file (only for public files)
   * @param path The storage path/key of the file
   * @returns The full public URL to access the file
   */
  getPublicUrl(path: string): string;
}

export type StorageProviderType = 's3' | 'local';

export interface StorageConfig {
  provider: StorageProviderType;
  s3?: {
    bucket: string;
    publicBucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // For S3-compatible services
  };
  local?: {
    basePath: string;
  };
}
