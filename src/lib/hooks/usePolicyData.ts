import useSWR, { mutate } from 'swr';
import { policyConfig } from '@/lib/config/swrConfig';

export interface PolicyDetails {
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
  landlord?: any;
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

export function usePolicyData(policyId: string | null) {
  const { data, error, isLoading, isValidating, mutate: mutateFn } = useSWR<PolicyDetails>(
    policyId ? `/api/policies/${policyId}?include=progress` : null,
    policyConfig
  );

  const refresh = async () => {
    await mutateFn();
  };

  const updatePolicyStatus = async (status: string, reviewNotes?: string, reviewReason?: string) => {
    if (!policyId) return;

    // Optimistic update
    const currentData = data;
    if (currentData) {
      mutateFn(
        { ...currentData, status },
        { revalidate: false }
      );
    }

    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNotes, reviewReason }),
      });

      if (!response.ok) {
        throw new Error('Failed to update policy status');
      }

      const result = await response.json();

      // Revalidate to get the latest data
      await mutateFn();

      return result;
    } catch (error) {
      // Rollback on error
      mutateFn(currentData, { revalidate: false });
      throw error;
    }
  };

  const sendInvitations = async (actors?: string[], resend = false) => {
    if (!policyId) return;

    const response = await fetch(`/api/policies/${policyId}/send-invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actors, resend }),
    });

    if (!response.ok) {
      throw new Error('Failed to send invitations');
    }

    const result = await response.json();

    // Refresh policy data after sending invitations
    await mutateFn();

    return result;
  };

  const verifyActor = async (
    actorType: string,
    actorId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    if (!policyId) return;

    // Optimistic update for actor verification status
    const currentData = data;
    if (currentData) {
      const updatedData = { ...currentData };
      const verificationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

      // Update the specific actor
      if (actorType === 'landlord' && updatedData.landlord) {
        updatedData.landlord = { ...updatedData.landlord, verificationStatus };
      } else if (actorType === 'tenant' && updatedData.tenant) {
        updatedData.tenant = { ...updatedData.tenant, verificationStatus };
      } else if (actorType === 'jointObligor' && updatedData.jointObligors) {
        updatedData.jointObligors = updatedData.jointObligors.map((jo: any) =>
          jo.id === actorId ? { ...jo, verificationStatus } : jo
        );
      } else if (actorType === 'aval' && updatedData.avals) {
        updatedData.avals = updatedData.avals.map((aval: any) =>
          aval.id === actorId ? { ...aval, verificationStatus } : aval
        );
      }

      mutateFn(updatedData, { revalidate: false });
    }

    try {
      const response = await fetch(
        `/api/policies/${policyId}/actors/${actorType}/${actorId}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reason }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} actor`);
      }

      const result = await response.json();

      // Revalidate to get the latest data
      await mutateFn();

      return result;
    } catch (error) {
      // Rollback on error
      mutateFn(currentData, { revalidate: false });
      throw error;
    }
  };

  return {
    policy: data,
    isLoading,
    isValidating,
    error,
    refresh,
    updatePolicyStatus,
    sendInvitations,
    verifyActor,
    mutate: mutateFn,
  };
}

// Helper function to manually invalidate policy cache
export function invalidatePolicyCache(policyId: string) {
  return mutate(`/api/policies/${policyId}?include=progress`);
}
