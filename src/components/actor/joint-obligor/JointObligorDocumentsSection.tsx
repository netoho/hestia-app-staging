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
    uploadingFiles,
    uploadErrors,
    deletingFiles,
    uploadDocument,
    downloadDocument,
    deleteDocument,
  } = useDocumentManagement({
    token,
    actorType: 'joint-obligor',
    initialDocuments
  });

  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

  // Define required documents based on type and guarantee method
  // Note: INCOME_PROOF, PROPERTY_DEED, and PROPERTY_TAX_STATEMENT are uploaded in Guarantee tab
  const getDocumentCategories = () => {
    const baseIndividualDocs = [
      { category: 'IDENTIFICATION', title: 'Identificación Oficial', required: true },
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

    // Optional property registry certificate (only for property guarantee)
    const propertyDocs = guaranteeMethod === 'property' ? [
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

  // Get guarantee documents uploaded in previous tab
  const getGuaranteeDocuments = () => {
    const guaranteeDocs = [];

    if (guaranteeMethod === 'income') {
      const incomeDocs = documents['INCOME_PROOF'] || [];
      if (incomeDocs.length > 0) {
        guaranteeDocs.push({
          category: 'INCOME_PROOF',
          title: 'Comprobante de Ingresos',
          documents: incomeDocs
        });
      }
    } else if (guaranteeMethod === 'property') {
      const propertyDeedDocs = documents['PROPERTY_DEED'] || [];
      const propertyTaxDocs = documents['PROPERTY_TAX_STATEMENT'] || [];

      if (propertyDeedDocs.length > 0) {
        guaranteeDocs.push({
          category: 'PROPERTY_DEED',
          title: 'Escritura de Propiedad',
          documents: propertyDeedDocs
        });
      }
      if (propertyTaxDocs.length > 0) {
        guaranteeDocs.push({
          category: 'PROPERTY_TAX_STATEMENT',
          title: 'Boleta Predial',
          documents: propertyTaxDocs
        });
      }
    }

    return guaranteeDocs;
  };

  const guaranteeDocuments = getGuaranteeDocuments();

  // Check if all required documents are uploaded
  useEffect(() => {
    const requiredCategories = documentCategories
      .filter(doc => doc.required)
      .map(doc => doc.category);

    const allRequiredUploaded = requiredCategories.every(category => {
      const categoryDocs = documents[category] || [];
      return categoryDocs.length > 0;
    });

    if (onRequiredDocsChange) {
      onRequiredDocsChange(allRequiredUploaded);
    }

    // Update checked docs for display
    const uploadedCategories = new Set(
      Object.keys(documents).filter(cat => documents[cat] && documents[cat].length > 0)
    );
    setCheckedDocs(uploadedCategories);
  }, [documents, documentCategories, onRequiredDocsChange]);

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
          {guaranteeDocuments.length > 0 && (
            <span className="block mt-2 text-green-700 font-medium">
              ✓ {guaranteeDocuments.length} documento(s) de garantía ya cargado(s) en la pestaña anterior
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso de Documentos</span>
            <span className="text-sm text-muted-foreground">
              {uploadedRequiredCount} de {requiredDocsCount} documentos de esta sección
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${requiredDocsCount > 0 ? (uploadedRequiredCount / requiredDocsCount) * 100 : 0}%` }}
            />
          </div>
          {guaranteeDocuments.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              + {guaranteeDocuments.length} documento(s) de garantía previamente cargado(s)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Previously Uploaded Guarantee Documents */}
      {guaranteeDocuments.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Documentos de Garantía (Ya Cargados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                Los siguientes documentos fueron cargados en la pestaña de Garantía. Puede verlos y descargarlos aquí.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guaranteeDocuments.map(({ category, title, documents: docs }) => (
                <DocumentUploadCard
                  key={category}
                  category={category}
                  title={title}
                  documents={docs}
                  required={true}
                  allowMultiple={category === 'INCOME_PROOF'}
                  onUpload={() => {}} // Read-only, no upload
                  onDelete={deleteDocument}
                  onDownload={downloadDocument}
                  uploading={false}
                  uploadError={undefined}
                  deletingDocumentId={Object.keys(deletingFiles).find(id =>
                    docs.some(doc => doc.id === id && deletingFiles[id])
                  ) || null}
                  documentType={category.toLowerCase()}
                  description={`Cargado en pestaña de Garantía`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentCategories.map((docType) => {
          const categoryDocs = documents[docType.category] || [];
          const uploadKey = `${docType.category}-upload`;
          const isUploading = uploadingFiles[uploadKey];
          const error = uploadErrors[uploadKey];

          return (
            <DocumentUploadCard
              key={docType.category}
              category={docType.category}
              title={docType.title}
              documents={categoryDocs}
              required={docType.required}
              allowMultiple={true}
              onUpload={(file) => uploadDocument(file, docType.category, docType.category.toLowerCase())}
              onDelete={deleteDocument}
              onDownload={downloadDocument}
              uploading={isUploading}
              uploadError={error}
              deletingDocumentId={Object.keys(deletingFiles).find(id =>
                categoryDocs.some(doc => doc.id === id && deletingFiles[id])
              ) || null}
              documentType={docType.category.toLowerCase()}
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
            <strong>Faltan {requiredDocsCount - uploadedRequiredCount} documento(s) requerido(s) de esta sección.</strong>
            <div className="mt-2 space-y-1">
              {documentCategories
                .filter(doc => doc.required && !checkedDocs.has(doc.category))
                .map(doc => (
                  <div key={doc.category} className="font-medium">
                    • {doc.title}
                  </div>
                ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}