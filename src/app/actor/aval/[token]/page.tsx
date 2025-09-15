'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ActorInformationForm from '@/components/actor/ActorInformationForm';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, XCircle } from 'lucide-react';

export default function AvalPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avalData, setAvalData] = useState<any>(null);
  const [policyData, setPolicyData] = useState<any>(null);

  useEffect(() => {
    validateTokenAndLoadData();
  }, [token]);

  const validateTokenAndLoadData = async () => {
    try {
      const response = await fetch(`/api/actor/aval/${token}/validate`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Token inválido o expirado');
        setLoading(false);
        return;
      }

      setAvalData(data.aval);
      setPolicyData(data.policy);
      setLoading(false);
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Error al validar el acceso. Por favor, intente nuevamente.');
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    const response = await fetch(`/api/actor/aval/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Error al enviar la información');
    }

    // Upload documents if any
    const documents = formData.documents;
    if (documents && Object.keys(documents).length > 0) {
      const formDataUpload = new FormData();
      Object.entries(documents).forEach(([key, file]) => {
        if (file) {
          formDataUpload.append(key, file as File);
        }
      });

      await fetch(`/api/actor/aval/${token}/documents`, {
        method: 'POST',
        body: formDataUpload,
      });
    }
  };

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Validando acceso...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Error de Acceso</strong>
              <p className="mt-2">{error}</p>
              <p className="mt-4 text-sm">
                Si cree que esto es un error, por favor contacte a soporte en{' '}
                <a href="mailto:soporte@hestiaplp.com.mx" className="underline">
                  soporte@hestiaplp.com.mx
                </a>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // If already completed
  if (avalData?.informationComplete) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              <strong>Información Completa</strong>
              <p className="mt-2">
                Ya has completado tu información para esta póliza. Si necesitas hacer cambios,
                por favor contacta a soporte.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <ActorInformationForm
      actorType="aval"
      token={token}
      policyData={{
        policyNumber: policyData?.policyNumber,
        propertyAddress: policyData?.propertyAddress,
      }}
      initialData={{
        fullName: avalData?.fullName,
        email: avalData?.email,
        phone: avalData?.phone,
        nationality: avalData?.nationality,
        curp: avalData?.curp,
        passport: avalData?.passport,
        address: avalData?.address,
        employmentStatus: avalData?.employmentStatus,
        occupation: avalData?.occupation,
        companyName: avalData?.companyName,
        position: avalData?.position,
        monthlyIncome: avalData?.monthlyIncome,
        incomeSource: avalData?.incomeSource,
        references: avalData?.references || [],
        propertyAddress: avalData?.propertyAddress,
        propertyValue: avalData?.propertyValue,
        propertyDeedNumber: avalData?.propertyDeedNumber,
        propertyRegistry: avalData?.propertyRegistry,
      }}
      onSubmit={handleSubmit}
    />
  );
}