'use client';

import { use } from 'react';
import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useInvestigationsState } from '@/hooks/useInvestigationsState';
import {
  InvestigationsHeader,
  InvestigationsFilters,
  InvestigationsList,
} from '@/components/investigations/list';
import { trpc } from '@/lib/trpc/client';

interface InvestigationsPageProps {
  params: Promise<{ id: string }>;
}

export default function InvestigationsPage({ params }: InvestigationsPageProps) {
  const { id: policyId } = use(params);
  const { status, setStatus } = useInvestigationsState();
  const { data: session, status: sessionStatus } = useSession();

  const userLoading = sessionStatus === 'loading';
  const user = session?.user as any;

  // Get policy details for header
  const { data: policy, isLoading: policyLoading } = trpc.policy.getById.useQuery(
    { id: policyId },
    { enabled: !!policyId }
  );

  // Get investigations
  const {
    data: investigations,
    isLoading: investigationsLoading,
    refetch,
  } = trpc.investigation.getByPolicy.useQuery(
    {
      policyId,
      status: status !== 'all' ? (status as 'PENDING' | 'APPROVED' | 'REJECTED') : undefined,
    },
    { enabled: !!policyId }
  );

  // Auth check
  if (!userLoading && !user) {
    redirect('/login');
  }

  // Role check - only ADMIN, STAFF, BROKER can access
  if (!userLoading && user && !['ADMIN', 'STAFF', 'BROKER'].includes(user.role)) {
    redirect('/dashboard');
  }

  const isLoading = userLoading || policyLoading || investigationsLoading;

  if (policyLoading) {
    return (
      <div className="container mx-auto w-full">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="container mx-auto w-full">
        <p className="text-center text-muted-foreground py-8">
          Póliza no encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto w-full">
      <InvestigationsHeader
        policy={{
          id: policy.id,
          policyNumber: policy.policyNumber,
          tenant: policy.tenant,
          jointObligors: policy.jointObligors,
          avals: policy.avals,
        }}
      />

      <InvestigationsFilters
        statusFilter={status}
        onStatusChange={setStatus}
      />

      <InvestigationsList
        investigations={investigations || []}
        policyId={policyId}
        loading={isLoading}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
