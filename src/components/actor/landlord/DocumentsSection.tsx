'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { DocumentUploadCard } from '@/components/documents/DocumentUploadCard';
import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';

interface DocumentsSectionProps {
  landlordId?: string;
  token: string;
  isCompany: boolean;
  allTabsSaved: boolean;
  initialDocuments?: Document[];
  isAdminEdit?: boolean;
}

export default function DocumentsSection({
  landlordId,
  token,
  isCompany,
  allTabsSaved,
  initialDocuments = [],
  isAdminEdit = false,
}: DocumentsSectionProps) {
  const {
    documents,
    uploadingFiles,
    uploadErrors,
    deletingFiles,
    uploadDocument,
    downloadDocument,
    deleteDocument,
  } = useDocumentManagement({
    token,
    actorType: 'landlord',
    initialDocuments,
    isAdminEdit
  });

  const documentCategories = isCompany
    ? [
        {
          category: DocumentCategory.COMPANY_CONSTITUTION,
          type: 'company_constitution',
          title: 'Escritura Constitutiva',
          description: 'Documento constitutivo de la empresa',
          required: true
        },
        {
          category: DocumentCategory.LEGAL_POWERS,
          type: 'legal_powers',
          title: 'Poderes del Representante Legal',
          description: 'Documentación de poderes legales',
          required: true
        },
        {
          category: DocumentCategory.TAX_STATUS_CERTIFICATE,
          type: 'rfc_document',
          title: 'Constancia de Situación Fiscal',
          description: 'RFC y constancia fiscal',
          required: true
        },
      ]
    : [
        {
          category: DocumentCategory.IDENTIFICATION,
          type: 'ine',
          title: 'Identificación Oficial',
          description: 'INE, Pasaporte u otra identificación oficial',
          required: true
        },
        {
          category: DocumentCategory.TAX_STATUS_CERTIFICATE,
          type: 'rfc_document',
          title: 'RFC',
          description: 'Registro Federal de Contribuyentes (opcional)',
          required: false
        },
      ];

  const commonDocuments = [
    {
      category: DocumentCategory.PROPERTY_DEED,
      type: 'property_deed',
      title: 'Escritura de la Propiedad',
      description: 'Documento que acredita la propiedad del inmueble',
      required: true
    },
    {
      category: DocumentCategory.PROPERTY_TAX_STATEMENT,
      type: 'property_tax',
      title: 'Boleta Predial',
      description: 'Comprobante de pago del impuesto predial',
      required: true
    },
    {
      category: DocumentCategory.BANK_STATEMENT,
      type: 'bank_statement',
      title: 'Estado de Cuenta Bancario',
      description: 'Últimos 3 meses de estados de cuenta',
      required: false
    },
  ];

  const allDocuments = [...documentCategories, ...commonDocuments];

  if (!allTabsSaved) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Por favor guarde la información en las pestañas Personal, Propiedad y Fiscal antes de cargar documentos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {allDocuments.map(({ category, type, title, description, required }) => {
        const categoryDocs = documents[category] || [];
        const uploadKey = `${category}-upload`;
        const isUploading = uploadingFiles[uploadKey];
        const error = uploadErrors[uploadKey];

        return (
          <DocumentUploadCard
            key={category}
            category={category}
            title={title}
            description={description}
            documentType={type}
            documents={categoryDocs}
            required={required}
            allowMultiple={true}
            onUpload={(file) => uploadDocument(file, category, type)}
            onDelete={deleteDocument}
            onDownload={downloadDocument}
            uploading={isUploading}
            uploadError={error}
            deletingDocumentId={Object.keys(deletingFiles).find(id =>
              categoryDocs.some(doc => doc.id === id && deletingFiles[id])
            ) || null}
          />
        );
      })}
    </div>
  );
}
