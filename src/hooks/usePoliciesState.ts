'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const DEFAULT_LIMIT = 20;

interface PoliciesState {
  search: string;
  status: string;
  page: number;
  limit: number;
}

interface PoliciesStateActions {
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  resetFilters: () => void;
}

/**
 * Custom hook to manage policies page state via URL search params
 * Enables browser back/forward, bookmarking, and sharing of filtered views.
 *
 * `limit` is persisted so the per-page selector survives navigation/refresh.
 */
export function usePoliciesState(): PoliciesState & PoliciesStateActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current state from URL params
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT;

  const updateURL = useCallback((updates: Partial<PoliciesState>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.search !== undefined) {
      if (updates.search) {
        params.set('search', updates.search);
      } else {
        params.delete('search');
      }
      // Reset to page 1 when search changes
      params.set('page', '1');
    }

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

    if (updates.limit !== undefined) {
      if (updates.limit !== DEFAULT_LIMIT) {
        params.set('limit', updates.limit.toString());
      } else {
        params.delete('limit');
      }
      // Reset to page 1 when limit changes — current page may not exist anymore
      params.set('page', '1');
    }

    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newURL);
  }, [pathname, router, searchParams]);

  const setSearch = useCallback((search: string) => updateURL({ search }), [updateURL]);
  const setStatus = useCallback((status: string) => updateURL({ status }), [updateURL]);
  const setPage = useCallback((page: number) => updateURL({ page }), [updateURL]);
  const setLimit = useCallback((limit: number) => updateURL({ limit }), [updateURL]);

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return {
    search,
    status,
    page,
    limit,
    setSearch,
    setStatus,
    setPage,
    setLimit,
    resetFilters,
  };
}
