import { useState } from 'react';

interface DownloadOptions {
  documentId: string;
  documentType?: 'actor' | 'policy';
  fileName: string;
}

export function useDocumentDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadDocument = async ({ documentId, documentType = 'actor', fileName }: DownloadOptions) => {
    try {
      setDownloading(documentId);

      // Get signed URL from API
      const response = await fetch(`/api/documents/${documentId}/download?type=${documentType}`);

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();

      // Handle both old and new response formats
      let downloadUrl: string;
      if (data.data?.downloadUrl) {
        // New format: { success, data: { downloadUrl, ... } }
        downloadUrl = data.data.downloadUrl;
      } else if (data.url) {
        // Old format: { success, url, ... }
        downloadUrl = data.url;
      } else if (!data.success) {
        throw new Error(data.error || 'Failed to get download URL');
      } else {
        throw new Error('Invalid response format from server');
      }

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error al descargar el documento. Por favor, intente de nuevo.');
    } finally {
      setDownloading(null);
    }
  };

  return {
    downloadDocument,
    downloading,
  };
}