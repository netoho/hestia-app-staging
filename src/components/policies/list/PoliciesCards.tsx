'use client';

import { useRouter } from 'next/navigation';
import PolicyCard from './PolicyCard';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";

interface Actor {
  firstName?: string | null;
  middleName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  informationComplete: boolean;
  isPrimary?: boolean;
  [key: string]: unknown;
}

interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  propertyAddress?: { formattedAddress?: string | null } | null;
  propertyDetails?: { propertyAddressDetails?: { formattedAddress?: string | null } | null } | null;
  propertyType?: string | null;
  rentAmount: number;
  totalPrice?: number | null;
  createdAt: Date | string;
  package?: { name: string } | null;
  tenant?: Actor | null;
  landlords?: Actor[];
  jointObligors?: Actor[];
  avals?: Actor[];
  guarantorType?: string | null;
  [key: string]: unknown;
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
