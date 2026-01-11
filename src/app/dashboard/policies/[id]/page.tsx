'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PolicyDetailsSkeleton from '@/components/ui/skeleton/PolicyDetailsSkeleton';
import PolicyErrorState from '@/components/ui/error/PolicyErrorState';
import ErrorBoundary from '@/components/ui/error/ErrorBoundary';
import PolicyDetailsContent from '@/components/policies/PolicyDetailsContent';
import { usePolicyPermissions, useIsStaffOrAdmin } from '@/lib/hooks/usePolicyPermissions';
import { trpc } from '@/lib/trpc/client';

export default function PolicyDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session } = useSession();
  const router = useRouter();

  // Unwrap the params promise using React's use() hook
  const { id: policyId } = use(params);

  // Use tRPC to fetch policy with progress
  const { data: policy, isLoading, error, refetch } = trpc.policy.getById.useQuery(
    {
      id: policyId,
      includeProgress: true
    },
    {
      retry: (failureCount, error) => {
        // Don't retry on 404 or 403
        if (error?.data?.code === 'NOT_FOUND' || error?.data?.code === 'FORBIDDEN') {
          return false;
        }
        return failureCount < 3;
      }
    }
  );

  // Use permission hooks
  const user = session?.user ? {
    id: (session.user as any).id || '',
    email: session.user.email || '',
    role: (session.user as any).role || 'BROKER',
    name: session.user.name || undefined,
  } : null;

  const permissions = usePolicyPermissions(user, policy ? {
    id: policy.id,
    createdById: policy.createdBy?.id || '',
    status: policy.status,
  } : null);

  const isStaffOrAdmin = useIsStaffOrAdmin(user);

  // Handle loading state with skeleton
  if (isLoading) {
    return <PolicyDetailsSkeleton />;
  }

  // Handle error state
  if (error) {
    const errorType =
      error.data?.code === 'NOT_FOUND' ? 'not-found' :
      error.data?.code === 'FORBIDDEN' ? 'unauthorized' :
      error.data?.code === 'UNAUTHORIZED' ? 'unauthorized' :
      error.message?.includes('fetch') ? 'network' : 'unknown';

    return (
      <PolicyErrorState
        error={{
          code: error.data?.httpStatus,
          type: errorType as any,
          message: error.message
        }}
        onRetry={() => refetch()}
        onGoHome={() => router.push('/dashboard/policies')}
      />
    );
  }

  // Handle not found after loading
  if (!policy) {
    return (
      <PolicyErrorState
        error={{ code: 404, type: 'not-found' }}
        onRetry={() => refetch()}
        onGoHome={() => router.push('/dashboard/policies')}
      />
    );
  }

  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <PolicyDetailsContent
        policy={policy}
        policyId={policyId}
        permissions={permissions}
        isStaffOrAdmin={isStaffOrAdmin}
        onRefresh={async () => { await refetch(); }}
      />
    </ErrorBoundary>
  );
}
