'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface DocumentsTabProps {
  documents: {
    identification: File | null;
    incomeProof: File | null;
    addressProof: File | null;
    propertyDeed: File | null;
  };
  existingDocuments: Record<string, any>;
  uploadStatus: Record<string, 'pending' | 'uploading' | 'success' | 'error'>;
  uploadErrors: Record<string, string>;
  handleDocumentChange: (documentType: string, category: string, file: File | null) => void;
  actorType: 'tenant' | 'joint-obligor' | 'aval';
}

export default function DocumentsTab({
  documents,
  existingDocuments,
  uploadStatus,
  uploadErrors,
  handleDocumentChange,
  actorType
}: DocumentsTabProps) {
  const renderDocumentCard = (
    title: string,
    description: string,
    documentType: string,
    category: string,
    isRequired: boolean = true
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title} {isRequired && '*'}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            handleDocumentChange(documentType, category, file);
          }}
        />
        {documents[documentType as keyof typeof documents] && (
          <p className="text-sm text-green-600 mt-2">
            ✓ {documents[documentType as keyof typeof documents]?.name}
          </p>
        )}
        {existingDocuments[documentType] && !documents[documentType as keyof typeof documents] && (
          <p className="text-sm text-green-600 mt-2">
            ✓ {existingDocuments[documentType].fileName} (subido previamente)
          </p>
        )}
        {uploadStatus[documentType] === 'uploading' && (
          <p className="text-sm text-blue-600 mt-2">Subiendo...</p>
        )}
        {uploadStatus[documentType] === 'success' && (
          <p className="text-sm text-green-600 mt-2">✓ Subido exitosamente</p>
        )}
        {uploadErrors[documentType] && (
          <p className="text-sm text-red-600 mt-2">{uploadErrors[documentType]}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Cargue los documentos requeridos (máximo 10MB por archivo)
      </p>

      <div className="space-y-4">
        {renderDocumentCard(
          'Identificación Oficial',
          'INE, Pasaporte o Cédula Profesional',
          'identification',
          'identification'
        )}

        {renderDocumentCard(
          'Comprobante de Ingresos',
          'Recibos de nómina, estados de cuenta o declaración fiscal',
          'incomeProof',
          'income_proof'
        )}

        {renderDocumentCard(
          'Comprobante de Domicilio',
          'Recibo de servicios (luz, agua, gas, teléfono)',
          'addressProof',
          'address_proof',
          false
        )}

        {actorType === 'aval' && renderDocumentCard(
          'Escritura de Propiedad',
          'Documento que acredite la propiedad del inmueble en garantía',
          'propertyDeed',
          'property_deed'
        )}
      </div>
    </div>
  );
}