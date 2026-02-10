'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

interface InvestigationsState {
  status: string;
  page: number;
}

interface InvestigationsStateActions {
  setStatus: (status: string) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

/**
 * Custom hook to manage investigations page state via URL search params
 * Simpler than usePoliciesState (no search - small dataset per policy)
 */
export function useInvestigationsState(): InvestigationsState & InvestigationsStateActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current state from URL params
  const status = searchParams.get('status') || 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  /**
   * Update URL with new params while preserving others
   */
  const updateURL = useCallback((updates: Partial<InvestigationsState>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.status !== undefined) {
      if (updates.status && updates.status !== 'all') {
        params.set('status', updates.status);
      } else {
        params.delete('status');
      }
      // Reset to page 1 when status changes
      params.set('page', '1');
    }

    if (updates.page !== undefined) {
      if (updates.page > 1) {
        params.set('page', updates.page.toString());
      } else {
        params.delete('page');
      }
    }

    // Update URL
    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newURL);
  }, [pathname, router, searchParams]);

  const setStatus = useCallback((status: string) => {
    updateURL({ status });
  }, [updateURL]);

  const setPage = useCallback((page: number) => {
    updateURL({ page });
  }, [updateURL]);

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return {
    // State
    status,
    page,
    // Actions
    setStatus,
    setPage,
    resetFilters,
  };
}
