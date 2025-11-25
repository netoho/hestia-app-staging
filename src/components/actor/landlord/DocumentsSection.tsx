'use client';

import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from '@/lib/enums';
import { Document } from '@/types/documents';
import { getDocumentRequirements } from '@/lib/constants/actorDocumentRequirements';
import { documentCategoryLabels } from '@/lib/constants/documentCategories';

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

  // Get required documents from centralized config
  const documentRequirements = useMemo(() => {
    const requirements = getDocumentRequirements('landlord', isCompany);

    return requirements.map((req) => ({
      category: req.category,
      type: req.category.toLowerCase(),
      title: documentCategoryLabels[req.category]?.title || req.category,
      description: documentCategoryLabels[req.category]?.description || '',
      required: req.required,
    }));
  }, [isCompany]);



  // Check if all required documents are uploaded (now includes ALL required docs)
  const requiredDocsUploaded = useMemo(() => {
    const requiredCategories = documentRequirements
      .filter((doc) => doc.required)
      .map((doc) => doc.category);

    return requiredCategories.every((category) => {
      const categoryDocs = documents[category] || [];
      return categoryDocs.length > 0;
    });
  }, [documents, documentRequirements]);

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
      {documentRequirements.map(({ category, type, title, description, required }) => {
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
