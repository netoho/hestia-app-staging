/**
 * Local Storage Provider
 * In-memory storage for demo/testing purposes
 */

import {
  StorageProvider,
  StorageUploadOptions,
  SignedUrlOptions,
  StorageFileMetadata,
} from '../types';
import crypto from 'crypto';

interface LocalFile {
  path: string;
  buffer: Buffer;
  metadata: StorageFileMetadata;
  originalName: string;
}

export class LocalStorageProvider implements StorageProvider {
  private files: Map<string, LocalFile> = new Map();
  private basePath: string;
  private baseUrl: string;

  constructor(config: {
    basePath?: string;
    baseUrl?: string;
  }) {
    this.basePath = config.basePath || '/tmp/storage';
    this.baseUrl = config.baseUrl || 'http://localhost:3000/api/storage';
  }

  async upload(options: StorageUploadOptions): Promise<string> {
    const file: LocalFile = {
      path: options.path,
      buffer: options.file.buffer,
      originalName: options.file.originalName,
      metadata: {
        size: options.file.size,
        contentType: options.contentType || options.file.mimeType,
        created: new Date(),
        updated: new Date(),
        metadata: {
          originalName: options.file.originalName,
          ...options.metadata,
        },
      },
    };

    this.files.set(options.path, file);
    console.log(`[LocalStorage] File uploaded: ${options.path} (${options.file.size} bytes)`);
    
    return options.path;
  }

  async download(path: string): Promise<Buffer> {
    const file = this.files.get(path);
    
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    console.log(`[LocalStorage] File downloaded: ${path}`);
    return file.buffer;
  }

  async delete(path: string): Promise<boolean> {
    const existed = this.files.has(path);
    this.files.delete(path);
    
    if (existed) {
      console.log(`[LocalStorage] File deleted: ${path}`);
    }
    
    return existed;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async getMetadata(path: string): Promise<StorageFileMetadata | null> {
    const file = this.files.get(path);
    
    if (!file) {
      return null;
    }

    return file.metadata;
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    // For local storage, generate a mock signed URL
    const token = crypto.randomBytes(16).toString('hex');
    const expires = Date.now() + ((options.expiresInSeconds || 10) * 1000);
    
    // Store the token for validation (in a real implementation, this would be in a cache)
    const url = new URL(`${this.baseUrl}/signed`);
    url.searchParams.append('path', options.path);
    url.searchParams.append('token', token);
    url.searchParams.append('expires', expires.toString());
    url.searchParams.append('action', options.action);
    
    if (options.responseDisposition) {
      url.searchParams.append('disposition', options.responseDisposition);
    }
    
    if (options.fileName) {
      url.searchParams.append('filename', options.fileName);
    }

    console.log(`[LocalStorage] Signed URL generated for ${options.path} (expires in ${options.expiresInSeconds || 10}s)`);
    
    return url.toString();
  }

  async list(prefix: string): Promise<string[]> {
    const paths: string[] = [];
    
    for (const [path] of this.files) {
      if (path.startsWith(prefix)) {
        paths.push(path);
      }
    }

    console.log(`[LocalStorage] Listed ${paths.length} files with prefix: ${prefix}`);
    return paths;
  }

  // Helper method for demo mode to get all files
  getAllFiles(): Map<string, LocalFile> {
    return this.files;
  }

  // Helper method to clear all files (useful for testing)
  clear(): void {
    this.files.clear();
    console.log('[LocalStorage] All files cleared');
  }
}