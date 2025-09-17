import { useState, useEffect, useCallback } from 'react';
import { DocumentCategory } from '@/types/policy';

interface Document {
  id: string;
  category: DocumentCategory;
  documentType: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

interface UseDocumentManagementProps {
  token: string | null;
  actorType: 'tenant' | 'joint-obligor' | 'aval';
}

export function useDocumentManagement({ token, actorType }: UseDocumentManagementProps) {
  const [documents, setDocuments] = useState<Record<DocumentCategory, Document[]>>({
    [DocumentCategory.IDENTIFICATION]: [],
    [DocumentCategory.INCOME_PROOF]: [],
    [DocumentCategory.ADDRESS_PROOF]: [],
    [DocumentCategory.PROPERTY_DEED]: [],
    [DocumentCategory.BANK_STATEMENT]: [],
    [DocumentCategory.TAX_RETURN]: [],
    [DocumentCategory.EMPLOYMENT_LETTER]: [],
    [DocumentCategory.OTHER]: [],
  });

  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load existing documents
  const loadDocuments = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/actor/${actorType}/${token}/documents`);
      const result = await response.json();

      if (result.success && result.data.documents) {
        // Group documents by category
        const groupedDocs: Record<DocumentCategory, Document[]> = {
          [DocumentCategory.IDENTIFICATION]: [],
          [DocumentCategory.INCOME_PROOF]: [],
          [DocumentCategory.ADDRESS_PROOF]: [],
          [DocumentCategory.PROPERTY_DEED]: [],
          [DocumentCategory.BANK_STATEMENT]: [],
          [DocumentCategory.TAX_RETURN]: [],
          [DocumentCategory.EMPLOYMENT_LETTER]: [],
          [DocumentCategory.OTHER]: [],
        };

        result.data.documents.forEach((doc: Document) => {
          if (groupedDocs[doc.category]) {
            groupedDocs[doc.category].push(doc);
          }
        });

        setDocuments(groupedDocs);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [token, actorType]);

  useEffect(() => {
    if (token && actorType) {
      loadDocuments();
    }
  }, [token, actorType, loadDocuments]);

  // Upload document
  const uploadDocument = async (
    file: File,
    category: DocumentCategory,
    documentType: string
  ) => {
    if (!token) return;

    const tempId = `${category}-${Date.now()}`;
    setUploadingFiles(prev => ({ ...prev, [tempId]: true }));
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[tempId];
      return newErrors;
    });

    try {
      // Validate file client-side
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      if (file.size > maxSize) {
        throw new Error(`El archivo excede el tamaño máximo de 10MB`);
      }

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Use PDF o imágenes.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('category', category);

      const response = await fetch(`/api/actor/${actorType}/${token}/documents`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al subir el archivo');
      }

      // Reload documents to show the new one
      await loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadErrors(prev => ({
        ...prev,
        [tempId]: error instanceof Error ? error.message : 'Error al subir el archivo'
      }));
    } finally {
      setUploadingFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[tempId];
        return newFiles;
      });
    }
  };

  // Download document
  const downloadDocument = async (documentId: string, fileName: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `/api/actor/${actorType}/${token}/documents/${documentId}/download`
      );

      if (!response.ok) {
        throw new Error('Error al descargar el documento');
      }

      const result = await response.json();

      if (result.success) {
        // Open the download URL in a new tab
        window.open(result.data.downloadUrl, '_blank');
      } else {
        throw new Error(result.error || 'Error al generar enlace de descarga');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(error instanceof Error ? error.message : 'Error al descargar el documento');
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string) => {
    if (!token) return;

    if (!confirm('¿Está seguro de eliminar este documento?')) {
      return;
    }

    setDeletingFiles(prev => ({ ...prev, [documentId]: true }));

    try {
      const response = await fetch(
        `/api/actor/${actorType}/${token}/documents?documentId=${documentId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar el documento');
      }

      // Reload documents to reflect deletion
      await loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar el documento');
    } finally {
      setDeletingFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[documentId];
        return newFiles;
      });
    }
  };

  // Clear upload errors
  const clearUploadError = (key: string) => {
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  return {
    documents,
    uploadingFiles,
    uploadErrors,
    deletingFiles,
    loading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    clearUploadError,
    reloadDocuments: loadDocuments,
  };
}