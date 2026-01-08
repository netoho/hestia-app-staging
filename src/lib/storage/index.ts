/**
 * Storage Factory
 * Creates and manages storage provider instances
 */

import { StorageProvider, StorageConfig } from './types';
import { S3StorageProvider } from './providers/s3';
import { LocalStorageProvider } from './providers/local';
import { getStorageConfig } from './config';

let storageInstance: StorageProvider | null = null;

/**
 * Get the configured storage provider instance
 * Uses singleton pattern to reuse the same instance
 */
export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    const config = getStorageConfig();
    storageInstance = createStorageProvider(config);
  }
  
  return storageInstance;
}

/**
 * Create a storage provider instance based on configuration
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 's3':
      if (!config.s3) {
        throw new Error('S3 configuration is required for S3 provider');
      }
      return new S3StorageProvider(config.s3);

    case 'local':
      return new LocalStorageProvider(config.local || {});

    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
}

/**
 * Reset the storage instance (useful for testing)
 */
export function resetStorageInstance(): void {
  storageInstance = null;
}

// Re-export types for convenience
export * from './types';
export { getStorageConfig, isUsingS3, isUsingLocalStorage } from './config';