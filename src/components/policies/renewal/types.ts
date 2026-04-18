import { GuarantorType } from '@/prisma/generated/prisma-client/enums';

export interface RenewalSourceSummary {
  policyId: string;
  policyNumber: string;
  guarantorType: GuarantorType;
  landlord: {
    id: string;
    displayName: string;
    documentCount: number;
  };
  tenant: {
    id: string;
    displayName: string;
    documentCount: number;
    referenceCount: number;
  } | null;
  jointObligors: Array<{
    id: string;
    displayName: string;
    documentCount: number;
    referenceCount: number;
  }>;
  avals: Array<{
    id: string;
    displayName: string;
    documentCount: number;
    referenceCount: number;
  }>;
}
