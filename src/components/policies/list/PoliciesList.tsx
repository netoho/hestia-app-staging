'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import PoliciesCards from './PoliciesCards';
import PoliciesTable from './PoliciesTable';
import { PolicyStatus } from '@/lib/enums';

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
    email: string;
    informationComplete: boolean;
  } | null;
  landlords?: Array<{
    fullName?: string;
    companyName?: string;
    email: string;
    isPrimary?: boolean;
    informationComplete: boolean;
  }>;
  jointObligors?: Array<{
    fullName: string;
    informationComplete: boolean;
  }>;
  avals?: Array<{
    fullName: string;
    informationComplete: boolean;
  }>;
  guarantorType?: string;
}

interface PoliciesListProps {
  policies: Policy[];
  loading: boolean;
}

/**
 * Main list component that handles loading, empty state, and view switching
 */
export default function PoliciesList({ policies, loading }: PoliciesListProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Empty state
  if (policies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No se encontraron protecciones</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render both mobile and desktop views
  return (
    <>
      <PoliciesCards policies={policies} />
      <PoliciesTable policies={policies} />
    </>
  );
}
