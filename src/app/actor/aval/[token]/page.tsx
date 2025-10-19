'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import AvalFormWizard from '@/components/actor/aval/AvalFormWizard';

interface PolicyData {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  rentAmount: number;
  status: string;
}

export default function AvalPortalPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [avalData, setAvalData] = useState<any>(null);
  const [completed, setCompleted] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setToken(resolvedParams.token);
    });
  }, [params]);

  // Fetch aval and policy data
  useEffect(() => {
    if (token) {
      validateTokenAndLoadData();
    }
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

      setPolicy(data.policy);
      setAvalData(data.aval);
      setCompleted(data.completed || data.aval?.informationComplete || false);
      setLoading(false);
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Error al validar el acceso. Por favor, intente nuevamente.');
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // Reload data to show completed state
    setCompleted(true);
    validateTokenAndLoadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se pudo cargar la información de la protección.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If already completed
  if (completed) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Información Completa</strong>
                <p className="mt-2">
                  Ya has completado tu información para esta protección. Si necesitas hacer cambios,
                  por favor contacta a soporte en soporte@hestiaplp.com.mx
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Información del Aval</CardTitle>
          <CardDescription>
            Complete su información para la protección de arrendamiento con garantía de propiedad
          </CardDescription>
          {policy && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>No. Protección:</strong> {policy.policyNumber}<br />
                <strong>Propiedad:</strong> {policy.propertyAddress}<br />
                <strong>Renta mensual:</strong> ${policy.rentAmount?.toLocaleString('es-MX')}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent>
          <AvalFormWizard
            token={token}
            initialData={avalData}
            policy={policy}
            onComplete={handleComplete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
