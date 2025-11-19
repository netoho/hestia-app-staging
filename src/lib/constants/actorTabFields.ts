/**
 * Tab-to-Fields Mapping for Actor Form Wizards
 *
 * Defines which form fields belong to which tab for each actor type.
 * Used to filter partial saves so only relevant fields are sent to backend.
 *
 * This prevents validation errors on unfilled tabs when saving the current tab.
 */

export type ActorType = 'landlord' | 'tenant' | 'aval' | 'jointObligor';

/**
 * Landlord Tab Fields
 *
 * Tabs: owner-info, bank-info, property-info, financial-info, documents
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
    'phoneNumber',
    'email',
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
    'legalRepPhoneNumber',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
    // Co-ownership
    'ownershipPercentage',
  ],
  'bank-info': [
    'bankName',
    'accountNumber',
    'clabe',
    'accountHolderName',
  ],
  'property-info': [
    'propertyDeedNumber',
    'propertyRegistryFolio',
    'propertyValue',
    'hasPropertyGuarantee',
  ],
  'financial-info': [
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
    'phoneNumber',
    'email',
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
    'legalRepPhoneNumber',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  employment: [
    'occupation',
    'employerName',
    'employerPhoneNumber',
    'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
    'additionalIncomeAmount',
    'yearsAtJob',
    'employerAddressDetails',
  ],
  rental: [
    'previousAddress',
    'previousLandlordName',
    'previousLandlordPhone',
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
    'phoneNumber',
    'email',
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
    'legalRepPhoneNumber',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  employment: [
    'occupation',
    'employerName',
    'employerPhoneNumber',
    'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
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
    'phoneNumber',
    'email',
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
    'legalRepPhoneNumber',
    'legalRepEmail',
    // Company fields
    'companyName',
    // Address
    'addressDetails',
  ],
  employment: [
    'occupation',
    'employerName',
    'employerPhoneNumber',
    'monthlyIncome',
    'hasAdditionalIncome',
    'additionalIncomeSource',
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
  const tabFields = getTabFields(actorType, tabName);

  // If no field mapping exists for this tab, return all data (backwards compatible)
  if (!tabFields || tabFields.length === 0) {
    return formData;
  }

  const filtered: Record<string, any> = {};

  tabFields.forEach((field) => {
    const value = formData[field];
    // Only include fields that are defined and not empty string
    if (value !== undefined && value !== '') {
      filtered[field] = value;
    }
  });

  return filtered as Partial<T>;
}
