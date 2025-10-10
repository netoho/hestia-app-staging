'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
}

interface DocumentsSectionProps {
  landlordId?: string;
  token: string;
  isCompany: boolean;
  allTabsSaved: boolean;
  initialDocuments?: Document[];
}

export default function DocumentsSection({
  landlordId,
  token,
  isCompany,
  allTabsSaved,
  initialDocuments = [],
}: DocumentsSectionProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;

    setUploading(documentType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    try {
      const response = await fetch(`/api/actor/landlord/${token}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || 'Error al cargar documento',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: 'Documento cargado exitosamente',
      });

      setDocuments(prev => [...prev, data.document]);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: 'Error al cargar el documento',
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const requiredDocuments = isCompany
    ? [
        { type: 'company_constitution', label: 'Escritura Constitutiva' },
        { type: 'legal_powers', label: 'Poderes del Representante Legal' },
        { type: 'rfc_document', label: 'Constancia de Situación Fiscal' },
      ]
    : [
        { type: 'ine', label: 'Identificación Oficial (INE/Pasaporte)' },
        { type: 'rfc_document', label: 'RFC (opcional)' },
      ];

  const commonDocuments = [
    { type: 'property_deed', label: 'Escritura de la Propiedad' },
    { type: 'property_tax', label: 'Boleta Predial' },
    { type: 'bank_statement', label: 'Estado de Cuenta Bancario' },
  ];

  const allDocuments = [...requiredDocuments, ...commonDocuments];

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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Documentos Requeridos</CardTitle>
          <CardDescription>
            Cargue los documentos solicitados en formato PDF, JPG o PNG (máx. 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allDocuments.map((doc) => (
            <DocumentUpload
              key={doc.type}
              label={doc.label}
              documentType={doc.type}
              onUpload={handleFileUpload}
              uploaded={documents.some(d => d.documentType === doc.type)}
              uploading={uploading === doc.type}
            />
          ))}
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Documentos Cargados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {getDocumentTypeLabel(doc.documentType)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DocumentUpload({
  label,
  documentType,
  onUpload,
  uploaded,
  uploading,
}: {
  label: string;
  documentType: string;
  onUpload: (type: string, file: File) => void;
  uploaded: boolean;
  uploading: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(documentType, file);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        {uploaded ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Upload className="h-5 w-5 text-gray-400" />
        )}
        <span className={uploaded ? 'text-green-700 font-medium' : ''}>{label}</span>
      </div>
      <Label htmlFor={documentType} className="cursor-pointer">
        <Input
          id={documentType}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={uploading}
        >
          <span>
            {uploading ? 'Cargando...' : uploaded ? 'Reemplazar' : 'Cargar'}
          </span>
        </Button>
      </Label>
    </div>
  );
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'company_constitution': 'Escritura Constitutiva',
    'legal_powers': 'Poderes del Representante Legal',
    'rfc_document': 'RFC',
    'ine': 'Identificación Oficial',
    'property_deed': 'Escritura de la Propiedad',
    'property_tax': 'Boleta Predial',
    'bank_statement': 'Estado de Cuenta',
  };
  return labels[type] || type;
}