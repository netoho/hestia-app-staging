'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ReviewLayout from '@/components/policies/review/ReviewLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

export default function PolicyReviewPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [policyId, setPolicyId] = useState<string>('');

  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  // tRPC query to check policy access
  const { data: policy, isLoading, error, refetch } = trpc.policy.getById.useQuery(
    { id: policyId },
    { enabled: !!policyId && status === 'authenticated' }
  );

  // Check user role for permission
  const userRole = session?.user?.role;
  const hasPermission = userRole === 'STAFF' || userRole === 'ADMIN';

  const handleBack = () => {
    router.push(`/dashboard/policies/${policyId}`);
  };

  const handleRetry = () => {
    refetch();
  };

  // Handle authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
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
    let errorMessage = 'Error al cargar la póliza';
    if (error.data?.code === 'NOT_FOUND') {
      errorMessage = 'Póliza no encontrada';
    } else if (error.data?.code === 'FORBIDDEN') {
      errorMessage = 'No tienes permisos para revisar esta póliza';
    }

    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
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
