/**
 * Tab-to-Fields Mapping for Actor Form Wizards
 *
 * This file provides a unified entry point for tab field configurations.
 * For detailed INDIVIDUAL/COMPANY configurations, use the individual files:
 * - landlordTabFields.ts
 * - tenantTabFields.ts
 * - avalTabFields.ts
 * - jointObligorTabFields.ts
 *
 * This file maintains simplified configs for backwards compatibility.
 */

// Re-export from individual files for detailed INDIVIDUAL/COMPANY support
export {
  LANDLORD_TAB_FIELDS as LANDLORD_TAB_FIELDS_TYPED,
  filterLandlordFieldsByTab,
  getLandlordTabFields,
  isLandlordTabComplete,
  getLandlordFormProgress,
} from './landlordTabFields';

export {
  TENANT_TAB_FIELDS as TENANT_TAB_FIELDS_TYPED,
  filterTenantFieldsByTab,
  getTenantTabFields,
  isTenantTabComplete,
} from './tenantTabFields';

export {
  AVAL_TAB_FIELDS as AVAL_TAB_FIELDS_TYPED,
  filterAvalFieldsByTab,
  getAvalTabFields,
  isAvalTabComplete,
  calculateAvalCompletionPercentage,
} from './avalTabFields';

export {
  JOINT_OBLIGOR_TAB_FIELDS as JOINT_OBLIGOR_TAB_FIELDS_TYPED,
  filterJointObligorFieldsByTab,
  getJointObligorTabFields,
  isJointObligorTabComplete,
  calculateJointObligorCompletionPercentage,
} from './jointObligorTabFields';

export type ActorType = 'landlord' | 'tenant' | 'aval' | 'jointObligor';

/**
 * Type-safe tab field configuration
 * Allows explicit handling of different tab types
 */
export type TabFieldConfig =
  | { type: 'fields'; fields: readonly string[] }
  | { type: 'complex'; handler: 'references' | 'documents' }
  | { type: 'skip' };  // For tabs that should skip filtering

/**
 * Landlord Tab Fields
 *
 * Tabs: owner-info, property-info, financial-info, documents
 */
export const LANDLORD_TAB_FIELDS = {
  'owner-info': [
    // Person fields
    'actorType',
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'nationality',
    'curp',
    'rfc',
    'dateOfBirth',
    'phone',
    'workPhone',
    'email',
    'personalEmail',
    'workEmail',
    'maritalStatus',
    // Legal representative (for companies)
    'legalRepFirstName',
    'legalRepMiddleName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepNationality',
    'legalRepCurp',
    'legalRepRfc',
    'legalRepDateOfBirth',
    'legalRepPhone',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  'property-info': [
    'propertyDeedNumber',
    'propertyRegistryFolio',
    'propertyValue',
    'hasPropertyGuarantee',
  ],
  'financial-info': [
    'bankName',
    'accountNumber',
    'clabe',
    'accountHolder',
    'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
    'additionalIncomeAmount',
  ],
  documents: [], // Documents handled separately
} as const;

/**
 * Tenant Tab Fields
 *
 * Person tabs: personal, employment, rental, references, documents
 * Company tabs: personal, references, documents
 */
export const TENANT_TAB_FIELDS = {
  personal: [
    // Person/Company toggle
    'actorType',
    // Person fields
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'nationality',
    'curp',
    'rfc',
    'dateOfBirth',
    'phone',
    'email',
    'workPhone',
    'personalEmail',
    'workEmail',
    'maritalStatus',
    // Legal representative (for companies)
    'legalRepFirstName',
    'legalRepMiddleName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepNationality',
    'legalRepCurp',
    'legalRepRfc',
    'legalRepDateOfBirth',
    'legalRepPhone',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  employment: [
    'occupation',
    'employmentStatus',
    'position',
    'employerName',
        'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
    'incomeSource',
    'additionalIncomeAmount',
    'yearsAtJob',
    'employerAddressDetails',
  ],
  rental: [
    'previousAddress',
    'previousLandlordName',
    'previousLandlordPhone',
    'previousLandlordEmail',
    'previousRentAmount',
    'rentalHistoryYears',
    'previousRentalAddressDetails',
    'reasonForMoving',
    'numberOfOccupants',
    'hasPets',
    'petDescription',
  ],
  references: [], // References handled separately via useActorReferences
  documents: [], // Documents handled separately
} as const;

/**
 * Aval Tab Fields
 *
 * Person tabs: personal, employment, property, references, documents
 * Company tabs: personal, property, references, documents
 */
export const AVAL_TAB_FIELDS = {
  personal: [
    // Person/Company toggle
    'actorType',
    // Person fields
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'nationality',
    'curp',
    'rfc',
    'dateOfBirth',
    'phone',
    'email',
    'personalEmail',
    'workEmail',
    'maritalStatus',
    // Legal representative (for companies)
    'legalRepFirstName',
    'legalRepMiddleName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepNationality',
    'legalRepCurp',
    'legalRepRfc',
    'legalRepDateOfBirth',
    'legalRepPhone',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  employment: [
    'occupation',
    'employmentStatus',
    'position',
    'employerName',
        'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
    'incomeSource',
    'additionalIncomeAmount',
    'yearsAtJob',
    'employerAddressDetails',
  ],
  property: [
    'propertyAddress',
    'propertyDeedNumber',
    'propertyRegistryFolio',
    'propertyValue',
    'hasPropertyGuarantee', // Always true for Aval
    'propertyOwnershipStatus',
    'propertyType',
  ],
  references: [], // References handled separately via useActorReferences
  documents: [], // Documents handled separately
} as const;

/**
 * Joint Obligor Tab Fields
 *
 * Person tabs: personal, employment, guarantee, references, documents
 * Company tabs: personal, guarantee, references, documents
 */
export const JOINT_OBLIGOR_TAB_FIELDS = {
  personal: [
    // Person/Company toggle
    'actorType',
    // Person fields
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'nationality',
    'curp',
    'rfc',
    'dateOfBirth',
    'phone',
    'email',
    'personalEmail',
    'workEmail',
    'maritalStatus',
    // Legal representative (for companies)
    'legalRepFirstName',
    'legalRepMiddleName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepNationality',
    'legalRepCurp',
    'legalRepRfc',
    'legalRepDateOfBirth',
    'legalRepPhone',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  employment: [
    'occupation',
    'employmentStatus',
    'position',
    'employerName',
        'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
    'incomeSource',
    'additionalIncomeAmount',
    'yearsAtJob',
    'employerAddressDetails',
  ],
  guarantee: [
    'guaranteeMethod', // 'property' | 'income'
    // Property guarantee fields
    'propertyAddress',
    'propertyDeedNumber',
    'propertyRegistryFolio',
    'propertyValue',
    'hasPropertyGuarantee',
    'propertyOwnershipStatus',
    'propertyType',
    // Income guarantee fields (uses employment data)
  ],
  references: [], // References handled separately via useActorReferences
  documents: [], // Documents handled separately
} as const;

/**
 * Unified tab fields map
 */
export const ACTOR_TAB_FIELDS = {
  landlord: LANDLORD_TAB_FIELDS,
  tenant: TENANT_TAB_FIELDS,
  aval: AVAL_TAB_FIELDS,
  jointObligor: JOINT_OBLIGOR_TAB_FIELDS,
} as const;

/**
 * Type helper for tab names per actor
 */
export type LandlordTab = keyof typeof LANDLORD_TAB_FIELDS;
export type TenantTab = keyof typeof TENANT_TAB_FIELDS;
export type AvalTab = keyof typeof AVAL_TAB_FIELDS;
export type JointObligorTab = keyof typeof JOINT_OBLIGOR_TAB_FIELDS;

/**
 * Get fields for a specific tab
 *
 * @param actorType - The actor type
 * @param tabName - The tab name
 * @returns Array of field names for that tab, or undefined if not found
 */
export function getTabFields(actorType: ActorType, tabName: string): readonly string[] | undefined {
  const tabFields = ACTOR_TAB_FIELDS[actorType];
  if (!tabFields) return undefined;

  return tabFields[tabName as keyof typeof tabFields];
}

/**
 * Check if a tab is a complex tab (references, documents) that requires special handling
 */
export function isComplexTab(tabName: string): boolean {
  return tabName === 'references' || tabName === 'documents';
}

/**
 * Filter form data to only include fields for a specific tab
 *
 * @param formData - The complete form data object
 * @param actorType - The actor type
 * @param tabName - The tab name
 * @returns Filtered object with only tab-relevant fields
 */
export function filterFieldsByTab<T extends Record<string, any>>(
  formData: T,
  actorType: ActorType,
  tabName: string
): Partial<T> {
  // Complex tabs (references, documents) are handled separately
  // Return empty object to avoid sending unrelated fields
  if (isComplexTab(tabName)) {
    // Don't include regular form fields for complex tabs
    // References and documents are added separately in the submission hook
    return {};
  }

  const tabFields = getTabFields(actorType, tabName);

  // If no field mapping exists for this tab, return all data (backwards compatible)
  if (!tabFields || tabFields.length === 0) {
    return formData;
  }

  const filtered: Record<string, any> = {};

  tabFields.forEach((field) => {
    // Include field if it exists in formData, even if value is null/empty/0/false
    // Using 'in' operator to check for key existence, not value
    if (field in formData) {
      filtered[field] = formData[field];
    }
  });

  return filtered as Partial<T>;
}
