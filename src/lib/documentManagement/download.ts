import { DownloadConfig, OperationProgress } from './types';

/**
 * Download file with progress tracking using Fetch API
 * Uses ReadableStream to track download progress
 */
export async function downloadWithProgress(config: DownloadConfig): Promise<void> {
  try {
    // First, get the signed URL from the API
    const response = await fetch(config.endpoint);

    if (!response.ok) {
      throw new Error(`Error al obtener URL de descarga: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.url) {
      throw new Error(data.error || 'Invalid response from server');
    }

    // Now download the file from the signed URL
    const downloadResponse = await fetch(data.url, {
      signal: config.signal,
    });

    if (!downloadResponse.ok) {
      throw new Error(`Error al descargar: ${downloadResponse.status}`);
    }

    // Get content length for progress tracking
    const contentLength = downloadResponse.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Read the response body as a stream
    const reader = downloadResponse.body?.getReader();
    if (!reader) {
      throw new Error('No se pudo leer la respuesta');
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // Report progress
      if (total > 0 && config.onProgress) {
        const progress: OperationProgress = {
          loaded,
          total,
          percentage: Math.round((loaded / total) * 100),
        };
        config.onProgress(progress);
      }
    }

    // Create blob from chunks
    const blob = new Blob(chunks);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = config.fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    config.onSuccess?.();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error al descargar el documento';
    config.onError?.(errorMessage);
    throw error;
  }
}

/**
 * Simple download without progress tracking (for when we don't need it)
 */
export async function downloadFile(
  documentId: string,
  fileName: string,
  endpoint: string
): Promise<void> {
  try {
    // Get signed URL
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error('Failed to get download URL');
    }

    const data = await response.json();

    if (!data.success || !data.url) {
      throw new Error(data.error || 'Invalid response from server');
    }

    // Open download URL in new window/tab
    // The browser will handle the download
    const link = document.createElement('a');
    link.href = data.url;
    link.download = fileName;
    link.target = '_blank';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Batch download multiple files
 */
export async function batchDownload(configs: DownloadConfig[]): Promise<{
  successful: number;
  failed: number;
  errors: Error[];
}> {
  let successful = 0;
  let failed = 0;
  const errors: Error[] = [];

  // Download files sequentially to avoid overwhelming browser
  for (const config of configs) {
    try {
      await downloadWithProgress(config);
      successful++;
    } catch (error) {
      failed++;
      errors.push(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  return { successful, failed, errors };
}
