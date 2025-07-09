'use client';

import { useState, useCallback, useMemo } from 'react';

export interface TableState {
  search: string;
  filters: Record<string, string>;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseTableStateOptions {
  initialState?: Partial<TableState>;
  onStateChange?: (state: TableState) => void;
}

export function useTableState(options: UseTableStateOptions = {}) {
  const {
    initialState = {},
    onStateChange,
  } = options;

  const [state, setState] = useState<TableState>({
    search: '',
    filters: {},
    page: 1,
    limit: 10,
    sortBy: undefined,
    sortOrder: undefined,
    ...initialState,
  });

  const updateState = useCallback((updates: Partial<TableState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };
      onStateChange?.(newState);
      return newState;
    });
  }, [onStateChange]);

  const setSearch = useCallback((search: string) => {
    updateState({ search, page: 1 }); // Reset to first page when searching
  }, [updateState]);

  const setFilter = useCallback((key: string, value: string) => {
    updateState({
      filters: { ...state.filters, [key]: value },
      page: 1, // Reset to first page when filtering
    });
  }, [state.filters, updateState]);

  const clearFilters = useCallback(() => {
    updateState({
      search: '',
      filters: {},
      page: 1,
    });
  }, [updateState]);

  const setPage = useCallback((page: number) => {
    updateState({ page });
  }, [updateState]);

  const setLimit = useCallback((limit: number) => {
    updateState({ limit, page: 1 }); // Reset to first page when changing limit
  }, [updateState]);

  const setSort = useCallback((sortBy?: string, sortOrder?: 'asc' | 'desc') => {
    updateState({ sortBy, sortOrder });
  }, [updateState]);

  // Generate query parameters for API calls
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (state.search.trim()) {
      params.set('search', state.search.trim());
    }
    
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      }
    });
    
    params.set('page', state.page.toString());
    params.set('limit', state.limit.toString());
    
    if (state.sortBy) {
      params.set('sortBy', state.sortBy);
      params.set('sortOrder', state.sortOrder || 'asc');
    }
    
    return params;
  }, [state]);

  const queryString = useMemo(() => {
    return queryParams.toString();
  }, [queryParams]);

  return {
    state,
    setSearch,
    setFilter,
    clearFilters,
    setPage,
    setLimit,
    setSort,
    queryParams,
    queryString,
    updateState,
  };
}