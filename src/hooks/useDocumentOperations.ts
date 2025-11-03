import { useState, useEffect, useCallback } from 'react';
import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';
import {
  GroupedDocuments,
  OperationRegistry,
  DocumentOperation,
  OperationProgress,
} from '@/lib/documentManagement/types';
import { uploadWithProgress } from '@/lib/documentManagement/upload';
import { downloadWithProgress } from '@/lib/documentManagement/download';

interface UseDocumentOperationsProps {
  token: string | null;
  actorType: 'tenant' | 'joint-obligor' | 'aval' | 'landlord';
  initialDocuments?: Document[];
  isAdminEdit?: boolean;
}

const createEmptyDocumentMap = (): GroupedDocuments => {
  const categories = Object.values(DocumentCategory);
  const map: any = {};
  categories.forEach((category) => {
    map[category] = [];
  });
  return map as GroupedDocuments;
};

export function useDocumentOperations({
  token,
  actorType,
  initialDocuments,
  isAdminEdit = false,
}: UseDocumentOperationsProps) {
  const [documents, setDocuments] = useState<GroupedDocuments>(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      const grouped = createEmptyDocumentMap();
      initialDocuments.forEach((doc) => {
        if (grouped[doc.category]) {
          grouped[doc.category].push(doc);
        }
      });
      return grouped;
    }
    return createEmptyDocumentMap();
  });

  const [operations, setOperations] = useState<OperationRegistry>({});
  const [loading, setLoading] = useState(true);

  // Load documents from server
  const loadDocuments = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Use unified route - token can be either UUID (admin) or access token (actor)
      const endpoint = `/api/actors/${actorType}/${token}/documents`;

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success && result.data.documents) {
        const groupedDocs = createEmptyDocumentMap();

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
  }, [token, actorType, isAdminEdit]);

  useEffect(() => {
    if (token && actorType) {
      loadDocuments();
    }
  }, [token, actorType, loadDocuments]);

  // Create operation ID
  const createOperationId = (type: string, category: DocumentCategory, timestamp: number) => {
    return `${type}-${category}-${timestamp}`;
  };

  // Update operation state
  const updateOperation = (id: string, updates: Partial<DocumentOperation>) => {
    setOperations((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...updates,
      },
    }));
  };

  // Remove operation from registry
  const removeOperation = (id: string) => {
    setOperations((prev) => {
      const newOps = { ...prev };
      delete newOps[id];
      return newOps;
    });
  };

  // Upload document with progress tracking
  const uploadDocument = async (
    file: File,
    category: DocumentCategory,
    documentType: string
  ) => {
    if (!token) return;

    const operationId = createOperationId('upload', category, Date.now());

    // Initialize operation
    setOperations((prev) => ({
      ...prev,
      [operationId]: {
        id: operationId,
        type: 'upload',
        status: 'pending',
        category,
        progress: { loaded: 0, total: file.size, percentage: 0 },
      },
    }));

    try {
      // Use unified route - token can be either UUID (admin) or access token (actor)
      const endpoint = `/api/actors/${actorType}/${token}/documents`;

      await uploadWithProgress({
        file,
        endpoint,
        category,
        documentType,
        onProgress: (progress: OperationProgress) => {
          updateOperation(operationId, { progress });
        },
        onSuccess: () => {
          updateOperation(operationId, { status: 'success' });
          // Reload documents after successful upload
          loadDocuments();
          // Remove operation after a delay
          setTimeout(() => removeOperation(operationId), 2000);
        },
        onError: (error: string) => {
          updateOperation(operationId, { status: 'error', error });
          // Keep error visible for longer
          setTimeout(() => removeOperation(operationId), 5000);
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      updateOperation(operationId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Error al subir el archivo',
      });
      setTimeout(() => removeOperation(operationId), 5000);
    }
  };

  // Download document with progress tracking
  const downloadDocument = async (documentId: string, fileName: string) => {
    if (!token) return;

    const operationId = `download-${documentId}`;

    setOperations((prev) => ({
      ...prev,
      [operationId]: {
        id: operationId,
        type: 'download',
        status: 'pending',
        documentId,
      },
    }));

    try {
      // Use unified route - token can be either UUID (admin) or access token (actor)
      const endpoint = `/api/actors/${actorType}/${token}/documents/${documentId}`;

      await downloadWithProgress({
        documentId,
        fileName,
        endpoint,
        onProgress: (progress: OperationProgress) => {
          updateOperation(operationId, { progress });
        },
        onSuccess: () => {
          updateOperation(operationId, { status: 'success' });
          setTimeout(() => removeOperation(operationId), 2000);
        },
        onError: (error: string) => {
          updateOperation(operationId, { status: 'error', error });
          setTimeout(() => removeOperation(operationId), 5000);
        },
      });
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

    const operationId = `delete-${documentId}`;

    setOperations((prev) => ({
      ...prev,
      [operationId]: {
        id: operationId,
        type: 'delete',
        status: 'pending',
        documentId,
      },
    }));

    try {
      // Use unified route - token can be either UUID (admin) or access token (actor)
      const endpoint = `/api/actors/${actorType}/${token}/documents?documentId=${documentId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar el documento');
      }

      updateOperation(operationId, { status: 'success' });
      await loadDocuments();
      setTimeout(() => removeOperation(operationId), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      updateOperation(operationId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Error al eliminar el documento',
      });
      alert(error instanceof Error ? error.message : 'Error al eliminar el documento');
      setTimeout(() => removeOperation(operationId), 5000);
    }
  };

  // Get operation for a specific document
  const getDocumentOperation = (documentId: string) => {
    return Object.values(operations).find((op) => op.documentId === documentId);
  };

  // Get operations for a category
  const getCategoryOperations = (category: DocumentCategory) => {
    return Object.values(operations).filter((op) => op.category === category);
  };

  // Check if any operation is pending for a category
  const isCategoryBusy = (category: DocumentCategory) => {
    return getCategoryOperations(category).some((op) => op.status === 'pending');
  };

  return {
    documents,
    operations,
    loading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    reloadDocuments: loadDocuments,
    getDocumentOperation,
    getCategoryOperations,
    isCategoryBusy,
  };
}
