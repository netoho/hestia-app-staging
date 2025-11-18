'use client';

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Home, DollarSign, Calendar } from 'lucide-react';
import { brandInfo } from '@/lib/config/brand';
import { trpc } from '@/lib/trpc/client';
import JointObligorFormWizard from '@/components/actor/joint-obligor/JointObligorFormWizard';

export default function JointObligorPortalPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  // Unwrap the params promise using React's use() hook
  const { token } = use(params);

  // Use tRPC to fetch actor data
  const { data, isLoading, error, refetch } = trpc.actor.getByToken.useQuery(
    {
      type: 'joint-obligor',
      token
    },
    {
      retry: false
    }
  );

  const obligorData = data?.data || null;
  const policy = data?.policy || null;
  const completed = data?.data?.informationComplete || false;

  const handleComplete = () => {
    // Reload data to show completed state
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: '#173459' }} />
          <p className="mt-4 text-gray-600">Validando acceso...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error?.message || 'Token inválido o expirado'}. Por favor, contacte a {brandInfo.supportEmail}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Already completed state
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="shadow-lg border-0">
            <CardHeader style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f9ff)', borderBottom: '1px solid #d4dae1' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#173459' }}>
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="font-headline text-2xl" style={{ color: '#173459' }}>
                    Portal del Obligado Solidario
                  </CardTitle>
                  <CardDescription className="text-base">
                    Protección #{policy?.policyNumber}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Policy Info */}
              {policy && (
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
                    <Home className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Propiedad</p>
                      <p className="text-sm font-medium" style={{ color: '#173459' }}>{policy.propertyAddress}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold mb-2">✅ Información Completa</div>
                  <p className="text-sm">
                    Su información como obligado solidario ha sido enviada y está en proceso de revisión.
                    Si necesita hacer cambios, por favor contacte a {brandInfo.supportEmail}
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render wizard
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(to bottom, #ffffff, #dbeafe)', borderColor: '#d4dae1' }} className="border-b">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <h1 className="font-headline text-3xl md:text-4xl mb-3" style={{ color: '#173459' }}>
              Bienvenido, Obligado Solidario
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Complete su información para la protección de arrendamiento
            </p>
            {policy && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                   style={{ backgroundColor: '#fff7ed', color: '#FF7F50', border: '1px solid #fed7aa' }}>
                <AlertCircle className="h-4 w-4" />
                Protección #{policy.policyNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Policy Info Card */}
        {policy && (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader style={{ background: 'linear-gradient(to right, #173459, #2b5a8c)', color: 'white' }}>
              <CardTitle className="font-headline">Detalles de la Protección</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Propiedad</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>{policy.propertyAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Renta mensual</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>
                      ${policy.rentAmount?.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Wizard */}
        <JointObligorFormWizard
          token={token}
          initialData={obligorData}
          policy={policy}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
