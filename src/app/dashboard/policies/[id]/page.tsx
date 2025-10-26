'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PolicyDetailsSkeleton from '@/components/ui/skeleton/PolicyDetailsSkeleton';
import PolicyErrorState from '@/components/ui/error/PolicyErrorState';
import ErrorBoundary from '@/components/ui/error/ErrorBoundary';
import PolicyDetailsContent from '@/components/policies/PolicyDetailsContent';
import { usePolicyPermissions, useIsStaffOrAdmin } from '@/lib/hooks/usePolicyPermissions';

interface PolicyDetails {
  id: string;
  policyNumber: string;
  status: string;

  // Property Information
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;

  // Property Details (new separated model)
  propertyDetails?: any;

  // Guarantor Configuration
  guarantorType: string;

  // Package/Pricing
  packageId?: string;
  package?: {
    id: string;
    name: string;
    price: number;
    features?: string;
  };
  totalPrice: number;
  tenantPercentage?: number;
  landlordPercentage?: number;

  // Actors with verification status
  landlords?: any[];
  tenant?: any;
  jointObligors?: any[];
  avals?: any[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  activatedAt?: string;
  approvedAt?: string;

  // Activities
  activities?: any[];

  // Documents
  documents?: any[];

  // User info
  createdBy?: {
    id?: string;
    name?: string;
    email: string;
  };

  // Progress metrics (from API with ?include=progress)
  progress?: {
    overall: number;
    byActor: Record<string, {
      percentage: number;
      completedFields: number;
      totalFields: number;
      documentsUploaded: number;
      documentsRequired: number;
    }>;
    completedActors: number;
    totalActors: number;
    documentsUploaded: number;
    documentsRequired: number;
  };
}

export default function PolicyDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [policyId, setPolicyId] = useState<string>('');
  const [policy, setPolicy] = useState<PolicyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    code?: number;
    message?: string;
    type?: 'network' | 'not-found' | 'server' | 'unauthorized' | 'unknown';
  } | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (policyId) {
      fetchPolicyDetails();
    }
  }, [policyId]);

  const fetchPolicyDetails = async () => {
    try {
      setError(null);
      // Fetch policy with progress calculation
      const response = await fetch(`/api/policies/${policyId}?include=progress`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          setError({ code: 404, type: 'not-found', message: errorData.message });
        } else if (response.status === 401 || response.status === 403) {
          setError({ code: response.status, type: 'unauthorized', message: errorData.message });
        } else if (response.status >= 500) {
          setError({ code: response.status, type: 'server', message: errorData.message });
        } else {
          setError({ code: response.status, type: 'unknown', message: errorData.message });
        }
        return;
      }

      const data = await response.json();
      setPolicy(data.data || data);
    } catch (error) {
      console.error('Error fetching policy:', error);
      setError({
        type: 'network',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      });
    } finally {
      setLoading(false);
    }
  };

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
  if (loading) {
    return <PolicyDetailsSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <PolicyErrorState
        error={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          fetchPolicyDetails();
        }}
        onGoHome={() => router.push('/dashboard/policies')}
      />
    );
  }

  // Handle not found after loading
  if (!policy) {
    return (
      <PolicyErrorState
        error={{ code: 404, type: 'not-found' }}
        onRetry={() => {
          setLoading(true);
          fetchPolicyDetails();
        }}
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
        onRefresh={fetchPolicyDetails}
      />
    </ErrorBoundary>
  );
}