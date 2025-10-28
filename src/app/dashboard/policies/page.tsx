'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePoliciesState } from '@/hooks/usePoliciesState';
import PoliciesHeader from '@/components/policies/list/PoliciesHeader';
import PoliciesFilters from '@/components/policies/list/PoliciesFilters';
import PoliciesList from '@/components/policies/list/PoliciesList';
import PoliciesPagination from '@/components/policies/list/PoliciesPagination';
import { PolicyStatus } from '@/types/policy';

interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;
  guarantorType?: string;
  totalPrice?: number;
  packageId?: string;
  package?: {
    name: string;
    price: number;
  };
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  activatedAt?: string;
  tenant?: {
    id: string;
    fullName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    informationComplete: boolean;
    completedAt?: string;
  } | null;
  landlords?: Array<{
    id: string;
    fullName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    isCompany?: boolean;
    isPrimary?: boolean;
    informationComplete: boolean;
    completedAt?: string;
  }>;
  jointObligors?: Array<{
    id: string;
    fullName: string;
    email: string;
    informationComplete: boolean;
  }>;
  avals?: Array<{
    id: string;
    fullName: string;
    email: string;
    informationComplete: boolean;
  }>;
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
}

/**
 * Main policies list page
 * Entry point to the application - displays all policies with search, filtering, and pagination
 */
export default function PoliciesPage() {
  const { data: session } = useSession();
  const { search, status, page, setSearch, setStatus, setPage } = usePoliciesState();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch policies whenever URL params change
  useEffect(() => {
    fetchPolicies();
  }, [page, status, search]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (status !== 'all') {
        params.append('status', status);
      }

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/policies?${params}`);
      const data = await response.json();

      if (data.policies) {
        setPolicies(data.policies);
        setTotalPages(data.pagination.totalPages);
      } else if (data.success && data.data) {
        // Fallback for wrapped response
        setPolicies(data.data.policies || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto w-full">
      <PoliciesHeader />

      <PoliciesFilters
        searchTerm={search}
        statusFilter={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      <PoliciesList policies={policies} loading={loading} />

      <PoliciesPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
