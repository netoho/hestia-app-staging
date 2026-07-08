import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";

export interface PolicyListActor {
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

export interface PolicyListItem {
  id: string;
  policyNumber: string;
  internalCode?: string | null;
  status: PolicyStatus;
  propertyAddress?: { formattedAddress?: string | null } | null;
  propertyDetails?: { propertyAddressDetails?: { formattedAddress?: string | null } | null } | null;
  propertyType?: string | null;
  rentAmount: number;
  totalPrice?: number | null;
  createdAt: Date | string;
  package?: { name: string } | null;
  // Transition contract (S5b #169): plural `tenants` is canonical; legacy
  // singular `tenant` (first tenant) kept until consumers migrate.
  tenants?: PolicyListActor[];
  tenant?: PolicyListActor | null;
  landlords?: PolicyListActor[];
  jointObligors?: PolicyListActor[];
  avals?: PolicyListActor[];
  guarantorType?: string | null;
  [key: string]: unknown;
}
