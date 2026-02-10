'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft } from 'lucide-react';
import ActorSelectionDialog from './ActorSelectionDialog';

interface Policy {
  id: string;
  policyNumber: string;
  tenant?: {
    id: string;
    firstName?: string | null;
    middleName?: string | null;
    paternalLastName?: string | null;
    maternalLastName?: string | null;
    companyName?: string | null;
  } | null;
  jointObligors?: Array<{
    id: string;
    firstName?: string | null;
    middleName?: string | null;
    paternalLastName?: string | null;
    maternalLastName?: string | null;
    companyName?: string | null;
  }>;
  avals?: Array<{
    id: string;
    firstName?: string | null;
    middleName?: string | null;
    paternalLastName?: string | null;
    maternalLastName?: string | null;
    companyName?: string | null;
  }>;
}

interface InvestigationsHeaderProps {
  policy: Policy;
}

export default function InvestigationsHeader({ policy }: InvestigationsHeaderProps) {
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'ADMIN' || userRole === 'STAFF';

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        {/* Breadcrumb */}
        <Link
          href={`/dashboard/policies/${policy.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a {policy.policyNumber}
        </Link>

        {/* Title + Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Investigaciones</h1>
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Investigación
            </Button>
          )}
        </div>
      </div>

      <ActorSelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policy={policy}
      />
    </>
  );
}
