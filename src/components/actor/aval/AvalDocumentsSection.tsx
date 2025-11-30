'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { Document } from '@/types/documents';
import { getDocumentRequirements } from '@/lib/constants/actorDocumentRequirements';
import { documentCategoryLabels } from '@/lib/constants/documentCategories';

interface AvalDocumentsSectionProps {
  avalId?: string;
  token: string;
  isCompany: boolean;
  nationality?: 'MEXICAN' | 'FOREIGN';
  allTabsSaved: boolean;
  initialDocuments?: Document[];
  additionalInfo?: string;
  onAdditionalInfoChange?: (value: string) => void;
  onRequiredDocsChange?: (allUploaded: boolean) => void;
  isAdminEdit?: boolean;
}

export default function AvalDocumentsSection({
  avalId,
  token,
  isCompany,
  nationality,
  allTabsSaved,
  initialDocuments = [],
  additionalInfo = '',
  onAdditionalInfoChange,
  onRequiredDocsChange,
  isAdminEdit = false,
}: AvalDocumentsSectionProps) {
  const [localAdditionalInfo, setLocalAdditionalInfo] = useState(additionalInfo);

  const {
    documents,
    operations,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    getCategoryOperations,
  } = useDocumentOperations({
    token,
    actorType: 'aval',
    initialDocuments,
    isAdminEdit,
  });

  const handleAdditionalInfoChange = (value: string) => {
    setLocalAdditionalInfo(value);
    if (onAdditionalInfoChange) {
      onAdditionalInfoChange(value);
    }
  };

  // Get required documents from centralized config
  const documentRequirements = useMemo(() => {
    const requirements = getDocumentRequirements('aval', isCompany, { nationality });

    return requirements.map((req) => ({
      category: req.category,
      type: req.category.toLowerCase(),
      title: documentCategoryLabels[req.category]?.title || req.category,
      description: documentCategoryLabels[req.category]?.description || '',
      required: req.required,
    }));
  }, [isCompany, nationality]);

  // Check if all required documents are uploaded
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
          Por favor guarde la información en todas las pestañas anteriores antes de cargar documentos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Adicional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">
              Redes Sociales, LinkedIn o Información Extra
            </Label>
            <Textarea
              id="additionalInfo"
              value={localAdditionalInfo}
              onChange={(e) => handleAdditionalInfoChange(e.target.value)}
              placeholder="Ej: LinkedIn: linkedin.com/in/usuario, Instagram: @usuario, Twitter: @usuario, u otra información que considere relevante..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Información opcional que puede ayudar en el proceso de verificación
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Cards */}
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
      </div>

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
