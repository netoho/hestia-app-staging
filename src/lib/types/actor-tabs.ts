/**
 * Type-safe tab data definitions for actor forms
 * These types ensure that we know exactly which fields belong to each tab
 */

import type { ActorType } from '@/lib/constants/actorTabFields';

// ============================================================================
// TENANT TAB TYPES
// ============================================================================

export type TenantPersonalTabData = {
  tabName: 'personal';
  firstName: string;
  middleName?: string | null;
  paternalLastName: string;
  maternalLastName?: string | null;
  rfc?: string | null;
  curp?: string | null;
  email: string;
  phone: string;
  personalEmail?: string | null;
  workPhone?: string | null;
};

export type TenantEmploymentTabData = {
  tabName: 'employment';
  occupation?: string | null;
  employerName?: string | null;
  monthlyIncome?: number | null;
  workEmail?: string | null;
  employerAddressDetails?: any;
};

export type TenantRentalTabData = {
  tabName: 'rental';
  currentRentAmount?: number | null;
  timeAtCurrentAddress?: string | null;
  previousLandlordName?: string | null;
  previousLandlordPhone?: string | null;
  previousRentalAddressDetails?: any;
};

export type TenantReferencesTabData = {
  tabName: 'references';
  references?: Array<{
    firstName: string;
    middleName?: string | null;
    paternalLastName: string;
    maternalLastName: string;
    phone: string;
    email?: string | null;
    relationship: string;
    occupation?: string | null;
    address?: string | null;
  }>;
  commercialReferences?: Array<{
    companyName: string;
    contactFirstName: string;
    contactMiddleName?: string | null;
    contactPaternalLastName: string;
    contactMaternalLastName: string;
    phone: string;
    email?: string | null;
    relationship: string;
    yearsOfRelationship?: number | null;
  }>;
};

export type TenantDocumentsTabData = {
  tabName: 'documents';
  documents?: Array<{
    type: string;
    url: string;
    uploadedAt: Date;
  }>;
};

// Union type for all tenant tabs
export type TenantTabData =
  | TenantPersonalTabData
  | TenantEmploymentTabData
  | TenantRentalTabData
  | TenantReferencesTabData
  | TenantDocumentsTabData;

// ============================================================================
// LANDLORD TAB TYPES
// ============================================================================

export type LandlordOwnerInfoTabData = {
  tabName: 'owner-info';
  firstName?: string;
  middleName?: string | null;
  paternalLastName?: string;
  maternalLastName?: string | null;
  companyName?: string;
  companyRfc?: string;
  legalRepFirstName?: string;
  legalRepMiddleName?: string | null;
  legalRepPaternalLastName?: string;
  legalRepMaternalLastName?: string | null;
  email: string;
  phone: string;
  rfc?: string | null;
  curp?: string | null;
};

export type LandlordBankInfoTabData = {
  tabName: 'bank-info';
  bankName?: string | null;
  accountNumber?: string | null;
  clabe?: string | null;
  accountHolder?: string | null;
  requiresCFDI?: boolean;
  cfdiData?: any;
};

export type LandlordPropertyInfoTabData = {
  tabName: 'property-info';
  propertyDeedNumber?: string | null;
  propertyRegistryFolio?: string | null;
  propertyAddress?: string | null;
  propertyDetails?: any;
};

export type LandlordFinancialInfoTabData = {
  tabName: 'financial-info';
  monthlyRentAmount?: number;
  securityDeposit?: number;
  maintenanceFee?: number | null;
  parkingFee?: number | null;
  paymentFrequency?: string;
};

export type LandlordDocumentsTabData = {
  tabName: 'documents';
  documents?: Array<{
    type: string;
    url: string;
    uploadedAt: Date;
  }>;
};

// Union type for all landlord tabs
export type LandlordTabData =
  | LandlordOwnerInfoTabData
  | LandlordBankInfoTabData
  | LandlordPropertyInfoTabData
  | LandlordFinancialInfoTabData
  | LandlordDocumentsTabData;

// ============================================================================
// HELPER TYPES
// ============================================================================

// Map actor types to their tab data types
export type ActorTabDataMap = {
  tenant: TenantTabData;
  landlord: LandlordTabData;
  // TODO: Add aval and jointObligor types
};

// Extract tab names for a specific actor type
export type TabNamesForActor<T extends keyof ActorTabDataMap> =
  ActorTabDataMap[T]['tabName'];

// Type guard to check if data is for a specific tab
export function isTabData<T extends TenantTabData | LandlordTabData>(
  data: any,
  tabName: string
): data is Extract<T, { tabName: typeof tabName }> {
  return data?.tabName === tabName;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Type-safe tab save in service
 *
 * ```typescript
 * // In TenantService
 * public async saveTab(
 *   id: string,
 *   tabData: TenantTabData,
 *   options?: SaveOptions
 * ): AsyncResult<TenantWithRelations> {
 *   // TypeScript knows exactly which fields are valid for this tab!
 *   const { tabName, ...fieldData } = tabData;
 *
 *   // Tab-specific validation
 *   if (isTabData<TenantTabData>(tabData, 'personal')) {
 *     // TypeScript knows this is TenantPersonalTabData
 *     if (!tabData.firstName || !tabData.paternalLastName) {
 *       return Result.error(new ServiceError(...));
 *     }
 *   }
 *
 *   return this.save(id, fieldData, true, options?.skipValidation, tabName);
 * }
 * ```
 *
 * Example: Type-safe form submission
 *
 * ```typescript
 * // In form component
 * const submitPersonalTab = (data: TenantPersonalTabData) => {
 *   // TypeScript ensures all required personal fields are present
 *   return trpc.actor.update.mutate({
 *     type: 'tenant',
 *     identifier: token,
 *     data: {
 *       ...data,
 *       partial: true,
 *       tabName: 'personal'
 *     }
 *   });
 * };
 * ```
 */