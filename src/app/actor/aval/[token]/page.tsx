'use client';

import { use, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Home, DollarSign, Calendar } from 'lucide-react';
import { brandInfo } from '@/lib/config/brand';
import { trpc } from '@/lib/trpc/client';
import AvalFormWizardSimplified from '@/components/actor/aval/AvalFormWizard-Simplified';

export default function AvalPortalPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  // Unwrap the params promise using React's use() hook
  const { token } = use(params);

  // Store token in localStorage for tRPC client to use in Authorization header
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    }
    return () => {
      localStorage.removeItem('token');
    };
  }, [token]);

  // Use tRPC to fetch actor data
  const { data, isLoading, error, refetch } = trpc.actor.getByToken.useQuery(
    {
      type: 'aval',
      token
    },
    {
      retry: false
    }
  );

  const avalData = data?.data || null;
  const policy = data?.policy || null;
  const completed = data?.data?.informationComplete || false;

  const handleComplete = () => {
    // Reload data to show completed state
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-md w-full mx-4">
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

  if (!policy) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-md w-full mx-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              No se pudo cargar la información de la protección. Contacte a {brandInfo.supportEmail}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // If already completed
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-b from-white to-blue-50 border-b border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full flex items-center justify-center bg-primary">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="font-headline text-2xl text-primary">
                    Portal del Aval
                  </CardTitle>
                  <CardDescription className="text-base">
                    Protección #{policy.policyNumber}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Policy Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50">
                  <Home className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Propiedad</p>
                    <p className="text-sm font-medium text-primary">{policy.propertyAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50">
                  <DollarSign className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Renta mensual</p>
                    <p className="text-sm font-medium text-primary">
                      ${policy.rentAmount?.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50">
                  <Calendar className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Período</p>
                    <p className="text-sm font-medium text-primary">
                      {policy.contractLength} meses
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold mb-2">✅ Información Completa</div>
                  <p className="text-sm">
                    Ya has completado tu información para esta protección. Si necesitas hacer cambios,
                    por favor contacta a {brandInfo.supportEmail}
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-white to-blue-100 border-b border-border">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <h1 className="font-headline text-3xl md:text-4xl mb-3 text-primary">
              Bienvenido, Aval
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Complete su información para la protección de arrendamiento con garantía de propiedad
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-orange-50 text-accent border border-orange-200">
              <AlertCircle className="h-4 w-4" />
              Protección #{policy.policyNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Policy Info Card */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/70 text-white">
            <CardTitle className="font-headline">Detalles de la Protección</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Propiedad</p>
                  <p className="text-sm font-medium text-primary">{policy.propertyAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Renta mensual</p>
                  <p className="text-sm font-medium text-primary">
                    ${policy.rentAmount?.toLocaleString('es-MX')} MXN
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Wizard */}
        <AvalFormWizardSimplified
          token={token}
          initialData={avalData}
          policy={policy}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
