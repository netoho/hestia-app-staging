'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

interface DownloadOptions {
  documentId: string;
  fileName: string;
}

export function useDocumentDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const trpcUtils = trpc.useUtils();

  const downloadDocument = async ({ documentId, fileName }: DownloadOptions) => {
    try {
      setDownloading(documentId);

      const result = await trpcUtils.document.getDownloadUrl.fetch({ documentId });

      if (!result.success || !result.downloadUrl) {
        throw new Error('Failed to get download URL');
      }

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
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
