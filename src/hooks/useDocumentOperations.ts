'use client';

import { useState, useCallback, useEffect } from 'react';
import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';
import {
  GroupedDocuments,
  OperationRegistry,
  DocumentOperation,
  OperationProgress,
} from '@/lib/documentManagement/types';
import { uploadWithProgress } from '@/lib/documentManagement/upload';
import { trpc } from '@/lib/trpc/client';

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

// Map hook actorType to tRPC actorType (joint-obligor → jointObligor)
const mapActorType = (type: string): 'tenant' | 'landlord' | 'aval' | 'jointObligor' => {
  if (type === 'joint-obligor') return 'jointObligor';
  return type as 'tenant' | 'landlord' | 'aval' | 'jointObligor';
};

export function useDocumentOperations({
  token,
  actorType,
  initialDocuments,
  isAdminEdit = false,
}: UseDocumentOperationsProps) {
  const [operations, setOperations] = useState<OperationRegistry>({});

  // Map actorType for tRPC calls
  const trpcActorType = mapActorType(actorType);

  // tRPC query for listing documents
  const {
    data: documentsData,
    isLoading: loading,
    refetch,
  } = trpc.actor.listDocuments.useQuery(
    {
      type: trpcActorType,
      identifier: token || '',
    },
    {
      enabled: !!token,
      // Transform to grouped documents in select
      select: (data) => {
        const grouped = createEmptyDocumentMap();
        if (data?.documents) {
          data.documents.forEach((doc: Document) => {
            if (grouped[doc.category]) {
              grouped[doc.category].push(doc);
            }
          });
        }
        return grouped;
      },
      // Use initial documents if available
      initialData: initialDocuments && initialDocuments.length > 0
        ? {
            success: true,
            documents: initialDocuments,
          }
        : undefined,
    }
  );

  // tRPC mutation for deleting documents
  const deleteMutation = trpc.actor.deleteDocument.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Use the query data or create empty map
  const documents = documentsData || createEmptyDocumentMap();

  // Create operation ID
  const createOperationId = (type: string, category: DocumentCategory, timestamp: number) => {
    return `${type}-${category}-${timestamp}`;
  };

  // Update operation state
  const updateOperation = useCallback((id: string, updates: Partial<DocumentOperation>) => {
    setOperations((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...updates,
      },
    }));
  }, []);

  // Remove operation from registry
  const removeOperation = useCallback((id: string) => {
    setOperations((prev) => {
      const newOps = { ...prev };
      delete newOps[id];
      return newOps;
    });
  }, []);

  // Upload document with progress tracking (REST endpoint for XMLHttpRequest progress)
  const uploadDocument = useCallback(async (
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
      // REST endpoint for upload (supports progress tracking)
      const endpoint = `/api/actors/${trpcActorType}/${token}/documents`;

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
          refetch();
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
  }, [token, actorType, updateOperation, removeOperation, refetch]);

  // Get tRPC utils for imperative queries
  const utils = trpc.useUtils();

  // Download document using tRPC to get presigned URL
  const downloadDocument = useCallback(async (documentId: string, fileName: string) => {
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
      // Use tRPC utils to fetch download URL imperatively
      const result = await utils.actor.getDocumentDownloadUrl.fetch({
        type: trpcActorType,
        identifier: token,
        documentId,
      });

      if (result.downloadUrl) {
        // Open download URL in new tab (triggers browser download)
        window.open(result.downloadUrl, '_blank');
        updateOperation(operationId, { status: 'success' });
        setTimeout(() => removeOperation(operationId), 2000);
      } else {
        throw new Error('No se pudo obtener la URL de descarga');
      }
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al descargar el documento';
      updateOperation(operationId, {
        status: 'error',
        error: errorMessage,
      });
      alert(errorMessage);
      setTimeout(() => removeOperation(operationId), 5000);
    }
  }, [token, trpcActorType, utils, updateOperation, removeOperation]);

  // Delete document using tRPC
  const deleteDocument = useCallback(async (documentId: string) => {
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
      await deleteMutation.mutateAsync({
        type: trpcActorType,
        identifier: token,
        documentId,
      });

      updateOperation(operationId, { status: 'success' });
      setTimeout(() => removeOperation(operationId), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el documento';
      updateOperation(operationId, {
        status: 'error',
        error: errorMessage,
      });
      alert(errorMessage);
      setTimeout(() => removeOperation(operationId), 5000);
    }
  }, [token, trpcActorType, deleteMutation, updateOperation, removeOperation]);

  // Get operation for a specific document
  const getDocumentOperation = useCallback((documentId: string) => {
    return Object.values(operations).find((op) => op.documentId === documentId);
  }, [operations]);

  // Get operations for a category
  const getCategoryOperations = useCallback((category: DocumentCategory) => {
    return Object.values(operations).filter((op) => op.category === category);
  }, [operations]);

  // Check if any operation is pending for a category
  const isCategoryBusy = useCallback((category: DocumentCategory) => {
    return getCategoryOperations(category).some((op) => op.status === 'pending');
  }, [getCategoryOperations]);

  return {
    documents,
    operations,
    loading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    reloadDocuments: refetch,
    getDocumentOperation,
    getCategoryOperations,
    isCategoryBusy,
  };
}
