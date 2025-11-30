/**
 * Type definitions for type-safe actor services
 */

import {
  Landlord,
  Tenant,
  Aval,
  JointObligor,
  PropertyAddress,
  PersonalReference,
  CommercialReference,
  Policy,
  Prisma
} from "@/prisma/generated/prisma-client/enums";

// Prisma model types with relations
export type LandlordWithRelations = Landlord & {
  addressDetails?: PropertyAddress | null;
  policy?: Policy | null;
  personalReferences?: PersonalReference[];
  commercialReferences?: CommercialReference[];
};

export type TenantWithRelations = Tenant & {
  addressDetails?: PropertyAddress | null;
  employerAddressDetails?: PropertyAddress | null;
  previousRentalAddress?: PropertyAddress | null;
  policy?: Policy | null;
  personalReferences?: PersonalReference[];
  commercialReferences?: CommercialReference[];
};

export type AvalWithRelations = Aval & {
  addressDetails?: PropertyAddress | null;
  employerAddressDetails?: PropertyAddress | null;
  guaranteePropertyDetails?: PropertyAddress | null;
  policy?: Policy | null;
  personalReferences?: PersonalReference[];
  commercialReferences?: CommercialReference[];
};

export type JointObligorWithRelations = JointObligor & {
  addressDetails?: PropertyAddress | null;
  employerAddressDetails?: PropertyAddress | null;
  guaranteePropertyDetails?: PropertyAddress | null;
  policy?: Policy | null;
  personalReferences?: PersonalReference[];
  commercialReferences?: CommercialReference[];
};

// Map of actor types to their Prisma models
export interface ActorModelMap {
  landlord: LandlordWithRelations;
  tenant: TenantWithRelations;
  aval: AvalWithRelations;
  jointObligor: JointObligorWithRelations;
}

// Type to get the model type from the actor type
export type ActorModel<T extends keyof ActorModelMap> = ActorModelMap[T];

// Prisma delegate types for each actor
export type LandlordDelegate = Prisma.LandlordDelegate;
export type TenantDelegate = Prisma.TenantDelegate;
export type AvalDelegate = Prisma.AvalDelegate;
export type JointObligorDelegate = Prisma.JointObligorDelegate;

// Map actor types to their Prisma delegates
export interface ActorDelegateMap {
  landlord: LandlordDelegate;
  tenant: TenantDelegate;
  aval: AvalDelegate;
  jointObligor: JointObligorDelegate;
}

// Type to get the delegate from the actor type
export type ActorDelegate<T extends keyof ActorDelegateMap> = ActorDelegateMap[T];

// Input types for references
export interface PersonalReferenceInput {
  firstName: string;
  middleName?: string | null;
  paternalLastName: string;
  maternalLastName: string;
  phone: string;
  email?: string | null;
  relationship: string;
  occupation?: string | null;
  address?: string | null;
}

export interface CommercialReferenceInput {
  companyName: string;
  contactFirstName: string;
  contactMiddleName?: string | null;
  contactPaternalLastName: string;
  contactMaternalLastName: string;
  phone: string;
  email?: string | null;
  relationship: string;
  yearsOfRelationship?: number | null;
}

// Actor type literal type
export type ActorTypeLiteral = keyof ActorModelMap;

// Helper type to extract table names as literal types
export type ActorTableName = 'landlord' | 'tenant' | 'aval' | 'jointObligor';

// Type guard functions
export function isLandlord(actor: unknown): actor is Landlord {
  return (actor as any)?.__typename === 'Landlord' ||
         (actor as any)?.id && !('tenantType' in (actor as any));
}

export function isTenant(actor: unknown): actor is Tenant {
  return (actor as any)?.__typename === 'Tenant' ||
         (actor as any)?.tenantType !== undefined;
}

export function isAval(actor: unknown): actor is Aval {
  return (actor as any)?.__typename === 'Aval' ||
         (actor as any)?.guaranteePropertyId !== undefined;
}

export function isJointObligor(actor: unknown): actor is JointObligor {
  return (actor as any)?.__typename === 'JointObligor' ||
         (actor as any)?.relationshipToTenant !== undefined;
}
