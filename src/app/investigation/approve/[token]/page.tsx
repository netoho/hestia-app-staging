'use client';

import { use, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { InvestigationApprovalCard } from '@/components/investigation/InvestigationApprovalCard';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { brandInfo } from '@/lib/config/brand';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function InvestigationApprovalPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { token } = resolvedParams;
  const [completed, setCompleted] = useState(false);
  const [completedStatus, setCompletedStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const { data: investigation, isLoading, error, refetch } = trpc.investigation.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const handleApproved = () => {
    setCompleted(true);
    setCompletedStatus('APPROVED');
    refetch();
  };

  const handleRejected = () => {
    setCompleted(true);
    setCompletedStatus('REJECTED');
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando investigación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error.message === 'Token inválido'
                ? 'Este enlace no es válido o ha expirado.'
                : error.message === 'Token expired'
                  ? 'Este enlace ha expirado. Contacta al administrador para obtener uno nuevo.'
                  : error.message || 'Ocurrió un error al cargar la investigación.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>No encontrado</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No se encontró la investigación solicitada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completion screen
  if (completed && completedStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {completedStatus === 'APPROVED' ? (
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <CardTitle>
              Investigación {completedStatus === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
            </CardTitle>
            <CardDescription>
              Tu decisión ha sido registrada y se ha notificado a todas las partes involucradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Puedes cerrar esta ventana.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo-hestia-azul-top.png"
                alt={brandInfo.name}
                className="h-8"
              />
              <span className="text-lg font-semibold">{brandInfo.name}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Aprobación de Investigación
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Aprobación de Investigación</h1>
          <p className="text-muted-foreground">
            Revisa los resultados de la investigación y toma una decisión
          </p>
        </div>

        <InvestigationApprovalCard
          investigation={investigation as any}
          token={token}
          onApproved={handleApproved}
          onRejected={handleRejected}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>{brandInfo.name} - {brandInfo.tagline}</p>
          <p className="mt-1">{brandInfo.supportEmail}</p>
        </div>
      </footer>
    </div>
  );
}
