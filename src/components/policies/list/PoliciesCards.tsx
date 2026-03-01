'use client';

import { useRouter } from 'next/navigation';
import PolicyCard from './PolicyCard';
import { PolicyListItem } from './types';

interface PoliciesCardsProps {
  policies: PolicyListItem[];
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
