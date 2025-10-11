'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import JointObligorFormWizard from '@/components/actor/joint-obligor/JointObligorFormWizard';

export default function JointObligorPortalPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obligorData, setObligorData] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setToken(resolvedParams.token);
    });
  }, [params]);

  // Validate token and load data
  useEffect(() => {
    if (token) {
      validateAndLoad();
    }
  }, [token]);

  const validateAndLoad = async () => {
    try {
      const response = await fetch(`/api/actor/joint-obligor/${token}/validate`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Token inválido o expirado');
        setLoading(false);
        return;
      }

      setPolicy(data.policy);
      setObligorData(data.jointObligor);

      // If already completed, show completion state
      if (data.completed) {
        setObligorData({ ...data.jointObligor, informationComplete: true });
      }

      setLoading(false);
    } catch (error) {
      console.error('Validation error:', error);
      setError('Error al validar el acceso. Por favor, intente nuevamente.');
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.refresh();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Already completed state
  if (obligorData?.informationComplete) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Información Completa</strong>
                <p className="mt-2">
                  Su información como obligado solidario ha sido enviada y está en proceso de revisión.
                  Si necesita hacer cambios, por favor contacte a soporte.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render wizard
  return (
    <div className="container mx-auto py-8 px-4">
      <JointObligorFormWizard
        token={token}
        initialData={obligorData}
        policy={policy}
        onComplete={handleComplete}
      />
    </div>
  );
}