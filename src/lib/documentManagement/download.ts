import { DownloadConfig, OperationProgress } from './types';

/**
 * Download file using direct browser download
 * Avoids CORS issues with S3 presigned URLs
 */
export async function downloadWithProgress(config: DownloadConfig): Promise<void> {
  try {
    // First, get the signed URL from the API
    const response = await fetch(config.endpoint);

    if (!response.ok) {
      throw new Error(`Error al obtener URL de descarga: ${response.status}`);
    }

    const data = await response.json();

    // Handle both old and new response formats for backward compatibility
    let downloadUrl: string;
    let fileName: string = config.fileName;

    if (data.data?.downloadUrl) {
      // New format: { success, data: { downloadUrl, fileName, ... } }
      downloadUrl = data.data.downloadUrl;
      fileName = data.data.fileName || config.fileName;
    } else if (data.url) {
      // Old format: { success, url, fileName, ... }
      downloadUrl = data.url;
      fileName = data.fileName || config.fileName;
    } else if (!data.success) {
      throw new Error(data.error || 'Failed to get download URL');
    } else {
      throw new Error('Invalid response format from server');
    }

    // Use direct link download to avoid CORS issues with S3
    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';

    // Some browsers require the link to be in the DOM
    document.body.appendChild(link);

    // Trigger the download
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);

    // Call success callback immediately since we can't track actual download progress
    // The browser handles the download natively
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

    // Handle both old and new response formats for backward compatibility
    let downloadUrl: string;
    let actualFileName: string = fileName;

    if (data.data?.downloadUrl) {
      // New format: { success, data: { downloadUrl, fileName, ... } }
      downloadUrl = data.data.downloadUrl;
      actualFileName = data.data.fileName || fileName;
    } else if (data.url) {
      // Old format: { success, url, fileName, ... }
      downloadUrl = data.url;
      actualFileName = data.fileName || fileName;
    } else if (!data.success) {
      throw new Error(data.error || 'Failed to get download URL');
    } else {
      throw new Error('Invalid response format from server');
    }

    // Direct download without opening new tab
    // This avoids popup blockers and CORS issues
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = actualFileName;
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
