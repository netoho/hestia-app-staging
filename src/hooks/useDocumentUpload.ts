import { useState, useEffect } from 'react';

interface UseDocumentUploadProps {
  token: string | null;
  actorType: 'tenant' | 'joint-obligor' | 'aval';
}

export function useDocumentUpload({ token, actorType }: UseDocumentUploadProps) {
  const [documents, setDocuments] = useState({
    identification: null as File | null,
    incomeProof: null as File | null,
    addressProof: null as File | null,
    propertyDeed: null as File | null,
  });

  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [existingDocuments, setExistingDocuments] = useState<Record<string, any>>({});

  useEffect(() => {
    if (token && actorType) {
      loadExistingDocuments();
    }
  }, [token, actorType]);

  const loadExistingDocuments = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/actor/${actorType}/${token}/documents`);
      const result = await response.json();

      if (result.success && result.data.documents) {
        const docsMap: Record<string, any> = {};
        const statusMap: Record<string, 'success'> = {};

        result.data.documents.forEach((doc: any) => {
          const fieldName = mapDocumentTypeToField(doc.documentType);
          if (fieldName) {
            docsMap[fieldName] = doc;
            statusMap[fieldName] = 'success';
          }
        });

        setExistingDocuments(docsMap);
        setUploadStatus(prev => ({ ...prev, ...statusMap }));
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  const mapDocumentTypeToField = (docType: string): string | null => {
    const mapping: Record<string, string> = {
      'identification': 'identification',
      'income_proof': 'incomeProof',
      'address_proof': 'addressProof',
      'property_deed': 'propertyDeed',
    };
    return mapping[docType] || null;
  };

  const validateFileClient = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo de ${maxSize / (1024 * 1024)}MB`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido. Use PDF o imágenes (JPG, PNG)',
      };
    }

    return { valid: true };
  };

  const uploadDocument = async (file: File, documentType: string, category: string) => {
    if (!token) return;

    setUploadStatus(prev => ({ ...prev, [documentType]: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('category', category);

      const response = await fetch(`/api/actor/${actorType}/${token}/documents`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus(prev => ({ ...prev, [documentType]: 'success' }));
      } else {
        setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
        setUploadErrors(prev => ({
          ...prev,
          [documentType]: result.error || 'Error al subir el archivo'
        }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: 'Error de conexión al subir el archivo'
      }));
    }
  };

  const handleDocumentChange = async (documentType: string, category: string, file: File | null) => {
    if (!file) return;

    const validation = validateFileClient(file);
    if (!validation.valid) {
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: validation.error || 'Invalid file',
      }));
      return;
    }

    // Clear previous errors
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });

    // Store file locally
    setDocuments(prev => ({ ...prev, [documentType]: file }));

    // Upload immediately
    await uploadDocument(file, documentType, category);
  };

  const uploadAllDocuments = async () => {
    const uploadPromises = [];

    if (documents.identification) {
      uploadPromises.push(uploadDocument(documents.identification, 'identification', 'identification'));
    }
    if (documents.incomeProof) {
      uploadPromises.push(uploadDocument(documents.incomeProof, 'income_proof', 'income_proof'));
    }
    if (documents.addressProof) {
      uploadPromises.push(uploadDocument(documents.addressProof, 'address_proof', 'address_proof'));
    }
    if (actorType === 'aval' && documents.propertyDeed) {
      uploadPromises.push(uploadDocument(documents.propertyDeed, 'property_deed', 'property_deed'));
    }

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
  };

  return {
    documents,
    uploadStatus,
    uploadErrors,
    existingDocuments,
    handleDocumentChange,
    uploadAllDocuments,
  };
}