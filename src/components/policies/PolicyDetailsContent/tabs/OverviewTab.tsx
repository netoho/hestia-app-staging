'use client';

import PropertyCard from '@/components/policies/details/PropertyCard';
import PricingCard from '@/components/policies/details/PricingCard';
import TimelineCard from '@/components/policies/details/TimelineCard';

interface OverviewTabProps {
  policy: {
    propertyAddress: string;
    propertyType?: string;
    propertyDescription?: string;
    rentAmount?: number;
    contractLength?: number;
    propertyDetails?: any;
    package?: string;
    totalPrice?: number;
    tenantPercentage?: number;
    landlordPercentage?: number;
    guarantorType?: string;
    createdAt: string;
    submittedAt?: string;
    approvedAt?: string;
    activatedAt?: string;
  };
  policyId: string;
}

export function OverviewTab({ policy, policyId }: OverviewTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PropertyCard
          propertyAddress={policy.propertyAddress}
          propertyType={policy.propertyType}
          propertyDescription={policy.propertyDescription}
          rentAmount={policy.rentAmount}
          contractLength={policy.contractLength}
          propertyDetails={policy.propertyDetails}
          policyId={policyId}
        />
        <PricingCard
          package={policy.package}
          totalPrice={policy.totalPrice}
          tenantPercentage={policy.tenantPercentage}
          landlordPercentage={policy.landlordPercentage}
          guarantorType={policy.guarantorType}
          policyId={policyId}
        />
      </div>
      <TimelineCard
        createdAt={policy.createdAt}
        submittedAt={policy.submittedAt}
        approvedAt={policy.approvedAt}
        activatedAt={policy.activatedAt}
      />
    </div>
  );
}

export default OverviewTab;
