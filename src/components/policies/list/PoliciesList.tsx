'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import PoliciesCards from './PoliciesCards';
import PoliciesTable from './PoliciesTable';
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
