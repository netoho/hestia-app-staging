'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ReviewLayout from '@/components/policies/review/ReviewLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function PolicyReviewPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [policyId, setPolicyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user && policyId) {
      checkPermissions();
    }
  }, [session, status, policyId]);

  const checkPermissions = async () => {
    try {
      // Check user role and permissions
      const response = await fetch(`/api/policies/${policyId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Póliza no encontrada');
        } else if (response.status === 403) {
          setError('No tienes permisos para revisar esta póliza');
        } else {
          setError('Error al cargar la póliza');
        }
        return;
      }

      const policyData = await response.json();
      const policy = policyData.data || policyData;

      // Check if user has review permissions
      const userResponse = await fetch('/api/auth/session');
      const userData = await userResponse.json();

      if (!userData?.user) {
        setError('No se pudo verificar tu sesión');
        return;
      }

      const userRole = (userData.user as any).role;

      // Only STAFF and ADMIN can access review page
      if (userRole === 'STAFF' || userRole === 'ADMIN') {
        setHasPermission(true);
      } else {
        setError('Solo el personal administrativo puede acceder a la página de revisión');
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Error al verificar permisos');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/policies/${policyId}`);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    checkPermissions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando página de revisión...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleBack} variant="outline">
            Volver a la póliza
          </Button>
          <Button onClick={handleRetry}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            No tienes permisos para acceder a esta página de revisión.
            Solo el personal administrativo (STAFF/ADMIN) puede revisar pólizas.
          </AlertDescription>
        </Alert>
        <Button onClick={handleBack} className="mt-4">
          Volver a la póliza
        </Button>
      </div>
    );
  }

  return (
    <ReviewLayout
      policyId={policyId}
      onBack={handleBack}
    />
  );
}