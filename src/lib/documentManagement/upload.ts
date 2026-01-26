import { UploadConfig, OperationProgress } from './types';
import { validateFile } from './validation';

/**
 * Upload file directly to S3 using presigned URL with progress tracking
 * This is the new recommended approach that bypasses Vercel's 4.5MB limit
 */
export function uploadToS3WithProgress(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: OperationProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress: OperationProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        onProgress?.(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during S3 upload'));
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Handle cancellation via AbortSignal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    // Start upload - PUT to presigned URL
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

/**
 * Upload file with progress tracking using XMLHttpRequest (legacy REST endpoint)
 * @deprecated Use uploadToS3WithProgress with presigned URLs instead
 */
export function uploadWithProgress(config: UploadConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    // Validate file first (using category for config lookup)
    const validation = validateFile(config.file, {}, config.category);
    if (!validation.valid) {
      const error = validation.error || 'Invalid file';
      config.onError?.(error);
      reject(new Error(error));
      return;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', config.file);
    formData.append('documentType', config.documentType);
    formData.append('category', config.category);

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    // Handle upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress: OperationProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        config.onProgress?.(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            config.onSuccess?.(result);
            resolve(result);
          } else {
            const error = result.error || 'Upload failed';
            config.onError?.(error);
            reject(new Error(error));
          }
        } catch (e) {
          const error = 'Error al procesar la respuesta del servidor';
          config.onError?.(error);
          reject(new Error(error));
        }
      } else {
        const error = `Error del servidor: ${xhr.status}`;
        config.onError?.(error);
        reject(new Error(error));
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      const error = 'Error de conexión al subir el archivo';
      config.onError?.(error);
      reject(new Error(error));
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      const error = 'Carga cancelada';
      config.onError?.(error);
      reject(new Error(error));
    });

    // Handle cancellation via AbortSignal
    if (config.signal) {
      config.signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    // Start upload
    xhr.open('POST', config.endpoint);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files with progress tracking
 */
export async function batchUpload(
  configs: UploadConfig[]
): Promise<{ results: any[]; errors: Error[] }> {
  const results: any[] = [];
  const errors: Error[] = [];

  // Upload files sequentially to avoid overwhelming the server
  for (const config of configs) {
    try {
      const result = await uploadWithProgress(config);
      results.push(result);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  return { results, errors };
}

/**
 * Upload files in parallel (use with caution for large files)
 */
export async function batchUploadParallel(
  configs: UploadConfig[]
): Promise<{ results: any[]; errors: Error[] }> {
  const promises = configs.map((config) =>
    uploadWithProgress(config)
      .then((result) => ({ success: true, result }))
      .catch((error) => ({ success: false, error }))
  );

  const settled = await Promise.all(promises);

  const results = settled
    .filter((s) => s.success)
    .map((s) => (s as any).result);

  const errors = settled
    .filter((s) => !s.success)
    .map((s) => (s as any).error);

  return { results, errors };
}
