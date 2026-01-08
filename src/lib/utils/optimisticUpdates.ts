import { KeyedMutator } from 'swr';

export interface OptimisticUpdateOptions<T> {
  mutate: KeyedMutator<T>;
  currentData: T | undefined;
  updateFn: (data: T) => T;
  apiCall: () => Promise<any>;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

/**
 * Generic optimistic update helper
 * Performs optimistic UI update, executes API call, and handles rollback on error
 */
export async function performOptimisticUpdate<T>({
  mutate,
  currentData,
  updateFn,
  apiCall,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  showToast = true,
}: OptimisticUpdateOptions<T>): Promise<any> {
  if (!currentData) {
    throw new Error('No data to update');
  }

  // Optimistic update
  const optimisticData = updateFn(currentData);
  await mutate(optimisticData, { revalidate: false });

  try {
    // Execute API call
    const result = await apiCall();

    // Revalidate to get latest data from server
    await mutate();

    // Success callback
    if (onSuccess) {
      onSuccess(result);
    }

    // Show success toast
    if (showToast && successMessage) {
      showSuccessToast(successMessage);
    }

    return result;
  } catch (error) {
    // Rollback on error
    await mutate(currentData, { revalidate: false });

    // Error callback
    if (onError && error instanceof Error) {
      onError(error);
    }

    // Show error toast
    if (showToast && errorMessage) {
      showErrorToast(errorMessage);
    }

    throw error;
  }
}

/**
 * Optimistic update for actor verification status
 */
export function updateActorVerificationStatus<T extends { landlord?: any; tenant?: any; jointObligors?: any[]; avals?: any[] }>(
  data: T,
  actorType: string,
  actorId: string,
  status: 'APPROVED' | 'REJECTED'
): T {
  const updated = { ...data };

  if (actorType === 'landlord' && updated.landlord) {
    updated.landlord = { ...updated.landlord, verificationStatus: status };
  } else if (actorType === 'tenant' && updated.tenant) {
    updated.tenant = { ...updated.tenant, verificationStatus: status };
  } else if (actorType === 'jointObligor' && updated.jointObligors) {
    updated.jointObligors = updated.jointObligors.map((jo: any) =>
      jo.id === actorId ? { ...jo, verificationStatus: status } : jo
    );
  } else if (actorType === 'aval' && updated.avals) {
    updated.avals = updated.avals.map((aval: any) =>
      aval.id === actorId ? { ...aval, verificationStatus: status } : aval
    );
  }

  return updated;
}

/**
 * Optimistic update for policy status
 */
export function updatePolicyStatus<T extends { status: string }>(
  data: T,
  newStatus: string
): T {
  return {
    ...data,
    status: newStatus,
  };
}

/**
 * Optimistic update for actor information complete flag
 */
export function updateActorCompletion<T extends { landlord?: any; tenant?: any; jointObligors?: any[]; avals?: any[] }>(
  data: T,
  actorType: string,
  actorId: string,
  isComplete: boolean
): T {
  const updated = { ...data };

  if (actorType === 'landlord' && updated.landlord) {
    updated.landlord = {
      ...updated.landlord,
      informationComplete: isComplete,
      completedAt: isComplete ? new Date().toISOString() : null,
    };
  } else if (actorType === 'tenant' && updated.tenant) {
    updated.tenant = {
      ...updated.tenant,
      informationComplete: isComplete,
      completedAt: isComplete ? new Date().toISOString() : null,
    };
  } else if (actorType === 'jointObligor' && updated.jointObligors) {
    updated.jointObligors = updated.jointObligors.map((jo: any) =>
      jo.id === actorId
        ? {
            ...jo,
            informationComplete: isComplete,
            completedAt: isComplete ? new Date().toISOString() : null,
          }
        : jo
    );
  } else if (actorType === 'aval' && updated.avals) {
    updated.avals = updated.avals.map((aval: any) =>
      aval.id === actorId
        ? {
            ...aval,
            informationComplete: isComplete,
            completedAt: isComplete ? new Date().toISOString() : null,
          }
        : aval
    );
  }

  return updated;
}

/**
 * Optimistic update for document upload
 */
export function addDocumentToActor<T extends { landlord?: any; tenant?: any; jointObligors?: any[]; avals?: any[] }>(
  data: T,
  actorType: string,
  actorId: string,
  document: any
): T {
  const updated = { ...data };

  if (actorType === 'landlord' && updated.landlord) {
    updated.landlord = {
      ...updated.landlord,
      documents: [...(updated.landlord.documents || []), document],
    };
  } else if (actorType === 'tenant' && updated.tenant) {
    updated.tenant = {
      ...updated.tenant,
      documents: [...(updated.tenant.documents || []), document],
    };
  } else if (actorType === 'jointObligor' && updated.jointObligors) {
    updated.jointObligors = updated.jointObligors.map((jo: any) =>
      jo.id === actorId
        ? {
            ...jo,
            documents: [...(jo.documents || []), document],
          }
        : jo
    );
  } else if (actorType === 'aval' && updated.avals) {
    updated.avals = updated.avals.map((aval: any) =>
      aval.id === actorId
        ? {
            ...aval,
            documents: [...(aval.documents || []), document],
          }
        : aval
    );
  }

  return updated;
}

// Toast notification helpers (simple implementation)
// These can be replaced with your actual toast library implementation

function showSuccessToast(message: string) {
  if (typeof window !== 'undefined') {
    console.log('Success:', message);
    // TODO: Replace with actual toast implementation
    // Example: toast.success(message)
  }
}

function showErrorToast(message: string) {
  if (typeof window !== 'undefined') {
    console.error('Error:', message);
    // TODO: Replace with actual toast implementation
    // Example: toast.error(message)
  }
}

/**
 * Debounce function for reducing API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function for rate-limiting updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
