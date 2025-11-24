'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentManagerCard } from '@/components/documents/DocumentManagerCard';
import { DocumentCategory } from '@/lib/enums';
import { Document } from '@/types/documents';

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

  // Define required documents based on aval type
  const documentCategories = isCompany
    ? [
        {
          category: DocumentCategory.COMPANY_CONSTITUTION,
          type: 'company_constitution',
          title: 'Acta Constitutiva',
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
          category: DocumentCategory.IDENTIFICATION,
          type: 'representative_id',
          title: 'Identificación del Representante',
          description: 'INE o Pasaporte del representante legal',
          required: true
        },
        {
          category: DocumentCategory.TAX_STATUS_CERTIFICATE,
          type: 'rfc_document',
          title: 'Constancia de Situación Fiscal',
          description: 'RFC y constancia fiscal de la empresa',
          required: true
        },
        {
          category: DocumentCategory.BANK_STATEMENT,
          type: 'bank_statement',
          title: 'Estados de Cuenta Bancarios',
          description: 'Últimos 6 meses de estados de cuenta',
          required: true
        },
        {
          category: DocumentCategory.PROPERTY_REGISTRY,
          type: 'property_registry',
          title: 'Certificado de Libertad de Gravamen',
          description: 'Certificado del Registro Público de la Propiedad (opcional pero recomendado)',
          required: false
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
        ...(nationality === 'FOREIGN' ? [{
          category: DocumentCategory.IMMIGRATION_DOCUMENT,
          type: 'immigration_document',
          title: 'Documento Migratorio',
          description: 'FM2, FM3 o documento migratorio vigente',
          required: true
        }] : []),
        {
          category: DocumentCategory.INCOME_PROOF,
          type: 'income_proof',
          title: 'Comprobante de Ingresos',
          description: 'Recibos de nómina, declaraciones, o estados financieros (últimos 3 meses)',
          required: true
        },
        {
          category: DocumentCategory.ADDRESS_PROOF,
          type: 'address_proof',
          title: 'Comprobante de Domicilio',
          description: 'Recibo de luz, agua o teléfono (no mayor a 3 meses)',
          required: true
        },
        {
          category: DocumentCategory.BANK_STATEMENT,
          type: 'bank_statement',
          title: 'Estados de Cuenta Bancarios',
          description: 'Últimos 3 meses de estados de cuenta',
          required: true
        },
        {
          category: DocumentCategory.PROPERTY_REGISTRY,
          type: 'property_registry',
          title: 'Certificado de Libertad de Gravamen',
          description: 'Certificado del Registro Público de la Propiedad (opcional pero recomendado)',
          required: false
        },
      ];

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
        {documentCategories.map(({ category, type, title, description, required }) => {
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
