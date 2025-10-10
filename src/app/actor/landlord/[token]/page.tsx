'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import LandlordFormWizard from '@/components/actor/landlord/LandlordFormWizard';
import { LandlordData } from '@/lib/types/actor';

export default function LandlordPortalPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [landlord, setLandlord] = useState<LandlordData | null>(null);
  const [policy, setPolicy] = useState<any>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/actor/landlord/${token}/validate`);
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

      setLandlord(data.landlord);
      setPolicy(data.policy);
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!landlord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Token inválido o expirado</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Portal del Arrendador</CardTitle>
            <CardDescription>
              Complete la información solicitada para la protección #{policy?.policyNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Propiedad:</span>
                <span className="font-medium">{policy?.propertyAddress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Renta mensual:</span>
                <span className="font-medium">
                  ${policy?.rentAmount?.toLocaleString('es-MX')} MXN
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium">{policy?.contractLength} meses</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <span className={`font-medium ${
                  landlord.informationComplete
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}>
                  {landlord.informationComplete
                    ? 'Información Completa'
                    : 'Información Pendiente'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <LandlordFormWizard
          token={token}
          initialData={landlord}
          policy={policy}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}