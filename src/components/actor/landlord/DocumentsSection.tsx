'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from '@/types/policy';
import { Document } from '@/types/documents';
import { useMemo } from 'react';

interface DocumentsSectionProps {
  landlordId?: string;
  token: string;
  isCompany: boolean;
  allTabsSaved: boolean;
  initialDocuments?: Document[];
  onRequiredDocsChange?: (allUploaded: boolean) => void
  isAdminEdit?: boolean;
}

export default function DocumentsSection({
  landlordId,
  token,
  isCompany,
  allTabsSaved,
  initialDocuments = [],
  onRequiredDocsChange,
  isAdminEdit = false,
}: DocumentsSectionProps) {
  const {
    documents,
    operations,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    getCategoryOperations,
  } = useDocumentOperations({
    token,
    actorType: 'landlord',
    initialDocuments,
    isAdminEdit,
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
          required: true
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



    // Check if all required documents are uploaded
    const requiredDocsUploaded = useMemo(() => {
        const requiredCategories = documentCategories
            .filter(doc => doc.required)
            .map(doc => doc.category);

        return requiredCategories.every(category => {
            const categoryDocs = documents[category] || [];
            return categoryDocs.length > 0;
        });
    }, [documents, documentCategories]);

    // Notify parent of required docs status
    useMemo(() => {
        if (onRequiredDocsChange) {
            onRequiredDocsChange(requiredDocsUploaded);
        }
    }, [requiredDocsUploaded, onRequiredDocsChange]);

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
        const categoryOps = getCategoryOperations(category);

        return (
          <DocumentManagerCard
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
            operations={categoryOps}
          />
        );
      })}

    {/* Warning if required docs not uploaded */}
    {!requiredDocsUploaded && (
        <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
                Por favor cargue todos los documentos requeridos antes de enviar su información.
            </AlertDescription>
        </Alert>
    )}
    </div>
  );
}
