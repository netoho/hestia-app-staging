'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { InvestigationForm } from '@/components/investigation/InvestigationForm';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InvestigatedActorType } from '@/prisma/generated/prisma-client/enums';

interface PageProps {
  params: Promise<{
    id: string;
    actorType: string;
    actorId: string;
  }>;
}

export default function NewInvestigationPage({ params }: PageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const { id: policyId, actorType: actorTypeParam, actorId } = resolvedParams;

  // Check for edit mode
  const editInvestigationId = searchParams.get('edit');

  // Convert actorType to enum
  const actorTypeMap: Record<string, InvestigatedActorType> = {
    'tenant': 'TENANT',
    'TENANT': 'TENANT',
    'jointObligor': 'JOINT_OBLIGOR',
    'joint_obligor': 'JOINT_OBLIGOR',
    'JOINT_OBLIGOR': 'JOINT_OBLIGOR',
    'aval': 'AVAL',
    'AVAL': 'AVAL',
  };

  const actorType = actorTypeMap[actorTypeParam];

  // Fetch policy data
  const { data: policy, isLoading: policyLoading, error: policyError } = trpc.policy.getById.useQuery(
    { id: policyId },
    { enabled: !!policyId && status === 'authenticated' }
  );

  // Fetch existing investigation if in edit mode
  const { data: existingInvestigation, isLoading: investigationLoading } = trpc.investigation.getById.useQuery(
    { id: editInvestigationId! },
    { enabled: !!editInvestigationId && status === 'authenticated' }
  );

  const isEditMode = !!editInvestigationId;

  // Check auth
  if (status === 'loading' || policyLoading || (isEditMode && investigationLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  // Check role
  const userRole = (session?.user as any)?.role;
  if (!['ADMIN', 'STAFF'].includes(userRole)) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Acceso denegado</AlertTitle>
          <AlertDescription>
            Solo el personal administrativo puede crear investigaciones.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  // Check actor type
  if (!actorType) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Tipo de actor inválido</AlertTitle>
          <AlertDescription>
            El tipo de actor especificado no es válido.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  if (policyError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {policyError.message || 'No se pudo cargar la póliza'}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Póliza no encontrada</AlertTitle>
          <AlertDescription>
            La póliza especificada no existe.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/dashboard/policies')}>
          Volver a pólizas
        </Button>
      </div>
    );
  }

  // Get actor data
  let actor = null;
  if (actorType === 'TENANT' && policy.tenant?.id === actorId) {
    actor = policy.tenant;
  } else if (actorType === 'JOINT_OBLIGOR') {
    actor = policy.jointObligors?.find((jo: any) => jo.id === actorId);
  } else if (actorType === 'AVAL') {
    actor = policy.avals?.find((a: any) => a.id === actorId);
  }

  if (!actor) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Actor no encontrado</AlertTitle>
          <AlertDescription>
            El actor especificado no existe en esta póliza.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <InvestigationForm
        policyId={policyId}
        actorType={actorType}
        actorId={actorId}
        actor={actor}
        policy={{
          policyNumber: policy.policyNumber,
          propertyDetails: policy.propertyDetails,
        }}
        existingInvestigation={existingInvestigation}
        isEditMode={isEditMode}
      />
    </div>
  );
}
