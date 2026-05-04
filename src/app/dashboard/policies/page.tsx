'use client';

import { usePoliciesState } from '@/hooks/usePoliciesState';
import PoliciesHeader from '@/components/policies/list/PoliciesHeader';
import PoliciesFilters from '@/components/policies/list/PoliciesFilters';
import PoliciesList from '@/components/policies/list/PoliciesList';
import { TablePagination } from '@/components/shared/TablePagination';
import { trpc } from '@/lib/trpc/client';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

/**
 * Main policies list page
 * Entry point to the application - displays all policies with search, filtering, and pagination
 * Now using tRPC for type-safe data fetching
 */
export default function PoliciesPage() {
  const { search, status, page, limit, setSearch, setStatus, setPage, setLimit } = usePoliciesState();

  const { data, isLoading } = trpc.policy.list.useQuery({
    page,
    limit,
    status: status !== 'all' ? status as PolicyStatus : undefined,
    search: search || undefined,
  });

  const policies = data?.policies || [];
  const pagination = data?.pagination ?? { page, limit, total: 0, totalPages: 0 };

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

      <TablePagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isLoading}
      />
    </div>
  );
}
