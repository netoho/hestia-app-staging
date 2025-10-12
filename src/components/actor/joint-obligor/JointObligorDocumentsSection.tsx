'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info, AlertCircle } from 'lucide-react';
import { DocumentUploadCard } from '@/components/documents/DocumentUploadCard';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';

interface JointObligorDocumentsSectionProps {
  obligorId?: string;
  token: string;
  isCompany: boolean;
  guaranteeMethod?: 'income' | 'property';
  nationality?: 'MEXICAN' | 'FOREIGN';
  allTabsSaved: boolean;
  initialDocuments?: any[];
  additionalInfo?: string;
  onAdditionalInfoChange?: (value: string) => void;
  onRequiredDocsChange?: (allUploaded: boolean) => void;
}

export default function JointObligorDocumentsSection({
  obligorId,
  token,
  isCompany,
  guaranteeMethod = 'income',
  nationality = 'MEXICAN',
  allTabsSaved,
  initialDocuments = [],
  additionalInfo = '',
  onAdditionalInfoChange,
  onRequiredDocsChange,
}: JointObligorDocumentsSectionProps) {
  const {
    documents,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    uploading,
    deleting,
    refreshDocuments,
  } = useDocumentManagement(
    'joint-obligor',
    obligorId,
    token,
    initialDocuments
  );

  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

  // Define required documents based on type and guarantee method
  const getDocumentCategories = () => {
    const baseIndividualDocs = [
      { category: 'IDENTIFICATION', title: 'Identificación Oficial', required: true },
      { category: 'INCOME_PROOF', title: 'Comprobante de Ingresos', required: true },
      { category: 'ADDRESS_PROOF', title: 'Comprobante de Domicilio', required: true },
      { category: 'BANK_STATEMENT', title: 'Estados de Cuenta', required: true },
    ];

    const baseCompanyDocs = [
      { category: 'COMPANY_CONSTITUTION', title: 'Acta Constitutiva', required: true },
      { category: 'LEGAL_POWERS', title: 'Poderes Representante Legal', required: true },
      { category: 'IDENTIFICATION', title: 'ID Representante', required: true },
      { category: 'TAX_STATUS_CERTIFICATE', title: 'Constancia Situación Fiscal', required: true },
      { category: 'BANK_STATEMENT', title: 'Estados de Cuenta', required: true },
    ];

    // Add property docs only if property-based guarantee
    const propertyDocs = guaranteeMethod === 'property' ? [
      { category: 'PROPERTY_DEED', title: 'Escritura de Propiedad', required: true },
      { category: 'PROPERTY_TAX_STATEMENT', title: 'Boleta Predial', required: true },
      { category: 'PROPERTY_REGISTRY', title: 'Certificado Libertad Gravamen', required: false },
    ] : [];

    if (isCompany) {
      return [...baseCompanyDocs, ...propertyDocs];
    } else {
      const docs = [...baseIndividualDocs];
      if (nationality === 'FOREIGN') {
        docs.push({ category: 'IMMIGRATION_DOCUMENT', title: 'Documento Migratorio', required: true });
      }
      return [...docs, ...propertyDocs];
    }
  };

  const documentCategories = getDocumentCategories();

  // Check if all required documents are uploaded
  useEffect(() => {
    const requiredCategories = documentCategories
      .filter(doc => doc.required)
      .map(doc => doc.category);

    const uploadedCategories = new Set(Object.values(documents).flat().map(doc => doc.category));
    const allRequiredUploaded = requiredCategories.every(cat => uploadedCategories.has(cat));

    if (onRequiredDocsChange) {
      onRequiredDocsChange(allRequiredUploaded);
    }

    // Update checked docs
    setCheckedDocs(uploadedCategories);
  }, [documents, documentCategories]);

  if (!allTabsSaved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por favor complete y guarde todas las secciones anteriores antes de cargar documentos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const requiredDocsCount = documentCategories.filter(d => d.required).length;
  const uploadedRequiredCount = documentCategories.filter(d => d.required && checkedDocs.has(d.category)).length;

  return (
    <div className="space-y-4">
      {/* Instructions Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Documentos Requeridos:</strong> Por favor cargue todos los documentos marcados como requeridos.
          {guaranteeMethod === 'property' && (
            <span className="block mt-2 font-medium text-blue-700">
              ⚠️ Como ha seleccionado garantía con propiedad, debe incluir escrituras y boleta predial.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Documentos Cargados</span>
            <span className="text-sm text-muted-foreground">
              {uploadedRequiredCount} de {requiredDocsCount} requeridos
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(uploadedRequiredCount / requiredDocsCount) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentCategories.map((docType) => {
          const categoryDocs = Object.values(documents).flat().filter(d => d.category === docType.category);
          return (
            <DocumentUploadCard
              key={docType.category}
              title={docType.title}
              category={docType.category}
              documents={categoryDocs}
              required={docType.required}
              onUpload={uploadDocument}
              onDownload={downloadDocument}
              onDelete={deleteDocument}
              uploading={uploading === docType.category}
              deleting={deleting}
            />
          );
        })}
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información Adicional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">
              Redes sociales, LinkedIn o información adicional (Opcional)
            </Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => onAdditionalInfoChange?.(e.target.value)}
              placeholder="Proporcione cualquier información adicional que considere relevante..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Warning if missing required docs */}
      {uploadedRequiredCount < requiredDocsCount && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Faltan {requiredDocsCount - uploadedRequiredCount} documento(s) requerido(s) por cargar.
            {guaranteeMethod === 'property' && !checkedDocs.has('PROPERTY_DEED') && (
              <span className="block mt-1 font-medium">
                • Escritura de Propiedad (REQUERIDA para garantía con propiedad)
              </span>
            )}
            {guaranteeMethod === 'property' && !checkedDocs.has('PROPERTY_TAX_STATEMENT') && (
              <span className="block mt-1 font-medium">
                • Boleta Predial (REQUERIDA para garantía con propiedad)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}