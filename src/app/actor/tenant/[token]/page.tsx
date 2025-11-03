'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Home, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { brandInfo } from '@/lib/config/brand';
import { formatFullName } from '@/lib/utils/names';

import TenantFormWizard from '@/components/actor/tenant/TenantFormWizard';

interface TenantData {
  id: string;
  tenantType: 'INDIVIDUAL' | 'COMPANY';
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  email: string;
  phone: string;
  informationComplete: boolean;
  [key: string]: any;
}

interface PolicyData {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  propertyType?: string;
  rentAmount: number;
  contractLength?: number;
  status: string;
}

export default function TenantPortalPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/actors/tenant/${token}`);
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || 'Token inválido',
          variant: "destructive",
        });
        router.push('/');
        return;
      }

      setTenant(data.tenant);
      setPolicy(data.policy);
      setIsCompleted(data.completed || false);
    } catch (error) {
      console.error('Error validating token:', error);
      toast({
        title: "Error",
        description: 'Error al validar el acceso',
        variant: "destructive",
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: "✅ Completado",
      description: "Toda la información ha sido guardada exitosamente",
    });

    // Refresh data
    validateToken();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: '#173459' }} />
          <p className="mt-4 text-gray-600">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (!tenant || !policy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-md w-full mx-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Token inválido o expirado. Por favor, contacte a {brandInfo.supportEmail}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isCompleted) {
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
                    Portal del Inquilino
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
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
                  <Home className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Propiedad</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>{policy.propertyAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
                  <DollarSign className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Renta mensual</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>
                      ${policy.rentAmount?.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </div>
                {policy.contractLength && (
                  <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
                    <Calendar className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Período</p>
                      <p className="text-sm font-medium" style={{ color: '#173459' }}>
                        {policy.contractLength} meses
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold mb-2">✅ Información Enviada</div>
                  <p className="text-sm">
                    Su información ha sido enviada exitosamente y está en proceso de revisión por nuestro equipo.
                    Le notificaremos cuando haya sido aprobada.
                  </p>
                  <p className="text-sm mt-3">
                    <strong>¿Necesita ayuda?</strong> Contacte a {brandInfo.supportEmail}
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
      <div style={{ background: 'linear-gradient(to bottom, #ffffff, #dbeafe)', borderColor: '#d4dae1' }} className="border-b">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center">
            <h1 className="font-headline text-3xl md:text-4xl mb-3" style={{ color: '#173459' }}>
              Bienvenido, {tenant.firstName ? formatFullName(tenant.firstName, tenant.paternalLastName || '', tenant.maternalLastName || '', tenant.middleName) : 'Inquilino'}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Complete su información para la protección de arrendamiento
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                 style={{ backgroundColor: '#fff7ed', color: '#FF7F50', border: '1px solid #fed7aa' }}>
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
          <CardHeader style={{ background: 'linear-gradient(to right, #173459, #2b5a8c)', color: 'white' }}>
            <CardTitle className="font-headline">Detalles de la Protección</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {policy.contractLength && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 mt-0.5" style={{ color: '#173459' }} />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Período</p>
                    <p className="text-sm font-medium" style={{ color: '#173459' }}>
                      {policy.contractLength} meses
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm text-gray-600">Estado de la información:</span>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                tenant.informationComplete
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {tenant.informationComplete
                  ? '✓ Información Completa'
                  : '⏳ Información Pendiente'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Form Wizard */}
        <TenantFormWizard
          token={token}
          initialData={tenant}
          policy={policy}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
