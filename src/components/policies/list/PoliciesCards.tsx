'use client';

import { useRouter } from 'next/navigation';
import PolicyCard from './PolicyCard';
import { PolicyStatus } from '@/types/policy';

interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  propertyAddress: string;
  propertyType?: string;
  rentAmount: number;
  totalPrice?: number;
  createdAt: string;
  package?: {
    name: string;
  };
  tenant?: {
    fullName?: string;
    companyName?: string;
    informationComplete: boolean;
  } | null;
  landlords?: Array<{
    fullName?: string;
    companyName?: string;
    isPrimary?: boolean;
    informationComplete: boolean;
  }>;
  jointObligors?: Array<{
    informationComplete: boolean;
  }>;
  avals?: Array<{
    informationComplete: boolean;
  }>;
  guarantorType?: string;
}

interface PoliciesCardsProps {
  policies: Policy[];
}

/**
 * Mobile card view container for policies list
 */
export default function PoliciesCards({ policies }: PoliciesCardsProps) {
  const router = useRouter();

  return (
    <div className="lg:hidden space-y-4">
      {policies.map((policy) => (
        <PolicyCard
          key={policy.id}
          policy={policy}
          onView={(id) => router.push(`/dashboard/policies/${id}`)}
        />
      ))}
    </div>
  );
}
