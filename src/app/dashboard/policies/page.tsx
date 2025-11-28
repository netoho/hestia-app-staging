'use client';

import { usePoliciesState } from '@/hooks/usePoliciesState';
import PoliciesHeader from '@/components/policies/list/PoliciesHeader';
import PoliciesFilters from '@/components/policies/list/PoliciesFilters';
import PoliciesList from '@/components/policies/list/PoliciesList';
import PoliciesPagination from '@/components/policies/list/PoliciesPagination';
import { trpc } from '@/lib/trpc/client';

/**
 * Main policies list page
 * Entry point to the application - displays all policies with search, filtering, and pagination
 * Now using tRPC for type-safe data fetching
 */
export default function PoliciesPage() {
  const { search, status, page, setSearch, setStatus, setPage } = usePoliciesState();

  // Use tRPC query with URL state as input
  const { data, isLoading } = trpc.policy.list.useQuery({
    page,
    limit: 20,
    status: status !== 'all' ? status : undefined,
    search: search || undefined,
  });

  // Extract data with defaults
  const policies = data?.policies || [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="container mx-auto w-full">
      <PoliciesHeader />

      <PoliciesFilters
        searchTerm={search}
        statusFilter={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      <PoliciesList policies={policies} loading={isLoading} />

      <PoliciesPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
