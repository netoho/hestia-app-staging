/**
 * Storage Configuration
 * Loads storage configuration from environment variables
 */

import { StorageConfig, StorageProviderType } from './types';

export function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageProviderType;

  const config: StorageConfig = {
    provider,
  };

  switch (provider) {
    case 's3':
      config.s3 = {
        bucket: process.env.AWS_S3_BUCKET || '',
        region: process.env.AWS_S3_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        endpoint: process.env.AWS_S3_ENDPOINT, // Optional, for S3-compatible services
      };

      // Validate required S3 configuration
      if (!config.s3.bucket || !config.s3.accessKeyId || !config.s3.secretAccessKey) {
        throw new Error('Missing required S3 configuration. Please set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY');
      }
      break;

    case 'firebase':
      config.firebase = {
        bucketName: process.env.FIREBASE_STORAGE_BUCKET || '',
        projectId: process.env.FIREBASE_PROJECT_ID || undefined,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
      };

      // Validate required Firebase configuration
      if (!config.firebase.bucketName) {
        throw new Error('Missing required Firebase configuration. Please set FIREBASE_STORAGE_BUCKET');
      }
      break;

    case 'local':
      config.local = {
        basePath: process.env.LOCAL_STORAGE_PATH || '/tmp/hestia-storage',
      };
      break;

    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }

  return config;
}

export function isUsingS3(): boolean {
  return process.env.STORAGE_PROVIDER === 's3';
}

export function isUsingFirebase(): boolean {
  return process.env.STORAGE_PROVIDER === 'firebase';
}

export function isUsingLocalStorage(): boolean {
  return !process.env.STORAGE_PROVIDER || process.env.STORAGE_PROVIDER === 'local';
}