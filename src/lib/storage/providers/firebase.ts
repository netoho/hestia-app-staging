/**
 * Firebase Storage Provider
 * Implements storage abstraction for Firebase/Google Cloud Storage
 */

import { Storage, Bucket } from '@google-cloud/storage';
import {
  StorageProvider,
  StorageUploadOptions,
  SignedUrlOptions,
  StorageFileMetadata,
} from '../types';
import { Readable } from 'stream';

export class FirebaseStorageProvider implements StorageProvider {
  private bucket: Bucket;
  private storage: Storage;

  constructor(config: {
    bucketName: string;
    projectId?: string;
    keyFilename?: string;
  }) {
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
    });
    
    this.bucket = this.storage.bucket(config.bucketName);
  }

  async upload(options: StorageUploadOptions): Promise<string> {
    const file = this.bucket.file(options.path);
    const stream = Readable.from(options.file.buffer);

    return new Promise((resolve, reject) => {
      stream
        .pipe(file.createWriteStream({
          metadata: {
            contentType: options.contentType || options.file.mimeType,
            metadata: {
              originalName: options.file.originalName,
              ...options.metadata,
            },
          },
        }))
        .on('error', reject)
        .on('finish', () => resolve(options.path));
    });
  }

  async download(path: string): Promise<Buffer> {
    const file = this.bucket.file(path);
    const [buffer] = await file.download();
    return buffer;
  }

  async delete(path: string): Promise<boolean> {
    try {
      const file = this.bucket.file(path);
      await file.delete();
      return true;
    } catch (error) {
      console.error('Error deleting file from Firebase Storage:', error);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  async getMetadata(path: string): Promise<StorageFileMetadata | null> {
    try {
      const file = this.bucket.file(path);
      const [metadata] = await file.getMetadata();
      
      const customMetadata: Record<string, string> = {};
      if (metadata.metadata) {
        Object.entries(metadata.metadata).forEach(([key, value]) => {
          if (typeof value === 'string') {
            customMetadata[key] = value;
          } else if (value !== null && value !== undefined) {
            customMetadata[key] = String(value);
          }
        });
      }
      
      return {
        size: parseInt(metadata.size?.toString() || '0'),
        contentType: metadata.contentType,
        created: new Date(metadata.timeCreated || Date.now()),
        updated: new Date(metadata.updated || metadata.timeCreated || Date.now()),
        metadata: customMetadata,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    const file = this.bucket.file(options.path);
    
    // Map action to Firebase Storage action
    let action: 'read' | 'write' | 'delete' = 'read';
    switch (options.action) {
      case 'read':
        action = 'read';
        break;
      case 'write':
        action = 'write';
        break;
      case 'delete':
        action = 'delete';
        break;
    }

    // Default to 10 seconds for security
    const expiresIn = options.expiresInSeconds || 10;
    const expires = Date.now() + (expiresIn * 1000);

    const [signedUrl] = await file.getSignedUrl({
      action,
      expires,
      responseDisposition: options.responseDisposition === 'attachment'
        ? `attachment; filename="${options.fileName || options.path.split('/').pop()}"`
        : undefined,
    });

    return signedUrl;
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix,
      });

      return files.map(file => file.name);
    } catch (error) {
      console.error('Error listing files from Firebase Storage:', error);
      return [];
    }
  }
}