'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';
import { RenewalFlow } from '@/components/policies/renewal/RenewalFlow';
import type { RenewalSourceSummary } from '@/components/policies/renewal/types';
import { formatFullName } from '@/lib/utils/names';
import { RefreshCw } from 'lucide-react';
import { GuarantorType } from '@/prisma/generated/prisma-client/enums';

interface RenewPageProps {
  params: Promise<{ id: string }>;
}

function displayNameFor(
  actor:
    | {
        firstName?: string | null;
        middleName?: string | null;
        paternalLastName?: string | null;
        maternalLastName?: string | null;
        companyName?: string | null;
      }
    | null
    | undefined,
  fallback: string,
): string {
  if (!actor) return fallback;
  if (actor.companyName) return actor.companyName;
  const full = formatFullName({
    firstName: actor.firstName,
    middleName: actor.middleName,
    paternalLastName: actor.paternalLastName,
    maternalLastName: actor.maternalLastName,
  });
  return full || fallback;
}

export default function PolicyRenewPage({ params }: RenewPageProps) {
  const { id: policyId } = use(params);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const { data: policy, isLoading } = trpc.policy.getById.useQuery(
    { id: policyId },
    { enabled: !!policyId },
  );

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaffOrAdmin = role === 'ADMIN' || role === 'STAFF';

  if (!isStaffOrAdmin) {
    router.replace(`/dashboard/policies/${policyId}`);
    return null;
  }

  if (!policy) {
    return (
      <div className="container mx-auto p-8">
        <p>Protección no encontrada</p>
      </div>
    );
  }

  if (policy.status !== 'ACTIVE' && policy.status !== 'EXPIRED') {
    router.replace(`/dashboard/policies/${policyId}`);
    return null;
  }

  if (policy.renewedToId) {
    router.replace(`/dashboard/policies/${policyId}`);
    return null;
  }

  const primaryLandlord = policy.landlords.find((l: any) => l.isPrimary) || policy.landlords[0];

  const source: RenewalSourceSummary = {
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    guarantorType: policy.guarantorType as GuarantorType,
    landlord: {
      id: primaryLandlord.id,
      displayName: displayNameFor(primaryLandlord, 'Arrendador'),
      documentCount: primaryLandlord.documents?.length ?? 0,
    },
    tenant: policy.tenant
      ? {
          id: policy.tenant.id,
          displayName: displayNameFor(policy.tenant, 'Arrendatario'),
          documentCount: policy.tenant.documents?.length ?? 0,
          referenceCount:
            (policy.tenant.personalReferences?.length ?? 0) +
            (policy.tenant.commercialReferences?.length ?? 0),
        }
      : null,
    jointObligors: (policy.jointObligors ?? []).map((jo: any) => ({
      id: jo.id,
      displayName: displayNameFor(jo, 'Obligado Solidario'),
      documentCount: jo.documents?.length ?? 0,
      referenceCount:
        (jo.personalReferences?.length ?? 0) + (jo.commercialReferences?.length ?? 0),
    })),
    avals: (policy.avals ?? []).map((av: any) => ({
      id: av.id,
      displayName: displayNameFor(av, 'Aval'),
      documentCount: av.documents?.length ?? 0,
      referenceCount:
        (av.personalReferences?.length ?? 0) + (av.commercialReferences?.length ?? 0),
    })),
  };

  return <RenewalFlow source={source} sourcePolicyId={policyId} />;
}
