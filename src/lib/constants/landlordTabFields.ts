/**
 * Landlord Tab Field Configuration
 * Maps database fields to their respective tabs
 * Single source of truth for landlord form structure
 */

/**
 * Landlord tab field mapping - matches actual database fields
 * These field names must match the Prisma schema exactly
 */
export const LANDLORD_TAB_FIELDS = {
  INDIVIDUAL: {
    'owner-info': [
      // Name fields (Mexican naming convention)
      'firstName',
      'middleName',
      'paternalLastName',
      'maternalLastName',
      // Identification
      'nationality',
      'curp',
      'rfc',
      'dateOfBirth',
      'maritalStatus',
      // Contact
      'email',
      'phone',
      'personalEmail',
      'workEmail',
      'workPhone',
      // Address
      'address',
      'addressDetails',
      // Multi-landlord specific
      'isPrimary',
    ],
    'bank-info': [
      'bankName',
      'accountNumber',
      'clabe',
      'accountHolder',
    ],
    'property-info': [
      'propertyDeedNumber',
      'propertyRegistryFolio',
      'propertyValue',
    ],
    'financial-info': [
      'requiresCFDI',
      'cfdiData',
      'hasIVA',
      'issuesTaxReceipts',
      'monthlyIncome',
      'hasAdditionalIncome',
      'additionalIncomeSource',
      'additionalIncomeAmount',
    ],
    'documents': [
      'additionalInfo',
      'hasRequiredDocuments',
    ],
  },
  COMPANY: {
    'owner-info': [
      // Company fields
      'companyName',
      'companyRfc',
      'businessType',
      // Legal representative (using 'legalRep' prefix as in DB)
      'legalRepFirstName',
      'legalRepMiddleName',
      'legalRepPaternalLastName',
      'legalRepMaternalLastName',
      'legalRepPosition',
      'legalRepRfc',
      'legalRepCurp',
      'legalRepPhone',
      'legalRepEmail',
      'legalRepNationality',
      // Company contact
      'email',
      'phone',
      'personalEmail',
      'workEmail',
      'workPhone',
      // Company address
      'address',
      'addressDetails',
      // Multi-landlord specific
      'isPrimary',
    ],
    'bank-info': [
      'bankName',
      'accountNumber',
      'clabe',
      'accountHolder',
    ],
    'property-info': [
      'propertyDeedNumber',
      'propertyRegistryFolio',
      'propertyValue',
    ],
    'financial-info': [
      'requiresCFDI',
      'cfdiData',
      'hasIVA',
      'issuesTaxReceipts',
      'monthlyIncome',
    ],
    'documents': [
      'additionalInfo',
      'hasRequiredDocuments',
    ],
  },
} as const;

/**
 * Get fields for a specific tab and landlord type
 */
export function getLandlordTabFields(
  isCompany: boolean,
  tabName: string
): readonly string[] | undefined {
  const landlordType = isCompany ? 'COMPANY' : 'INDIVIDUAL';
  const config = LANDLORD_TAB_FIELDS[landlordType];
  if (!config) return undefined;

  return config[tabName as keyof typeof config];
}

/**
 * Check if a field belongs to a specific tab
 */
export function isFieldInTab(
  field: string,
  isCompany: boolean,
  tabName: string
): boolean {
  const tabFields = getLandlordTabFields(isCompany, tabName);
  return tabFields ? tabFields.includes(field) : false;
}

/**
 * Get all tabs for a landlord type
 */
export function getLandlordTabs(isCompany: boolean): string[] {
  const landlordType = isCompany ? 'COMPANY' : 'INDIVIDUAL';
  return Object.keys(LANDLORD_TAB_FIELDS[landlordType]);
}

/**
 * Filter form data to only include fields for a specific tab
 */
export function filterLandlordFieldsByTab<T extends Record<string, any>>(
  formData: T,
  isCompany: boolean,
  tabName: string
): Partial<T> {
  const tabFields = getLandlordTabFields(isCompany, tabName);

  if (!tabFields || tabFields.length === 0) {
    return {};
  }

  const filtered: Record<string, any> = {};

  tabFields.forEach((field) => {
    // Include field if it exists in formData, even if value is null/empty/0/false
    if (field in formData) {
      filtered[field] = formData[field];
    }
  });

  // Special handling for nested objects
  if (tabName === 'owner-info') {
    if ('addressDetails' in formData) {
      filtered['addressDetails'] = formData['addressDetails'];
    }
  }

  return filtered as Partial<T>;
}

/**
 * Validation rules per tab
 * Defines which fields are required for each tab
 */
export const LANDLORD_TAB_REQUIRED_FIELDS = {
  INDIVIDUAL: {
    'owner-info': [
      'firstName',
      'paternalLastName',
      'maternalLastName',
      'nationality',
      'email',
      'phone',
      'address',
    ],
    'bank-info': [], // Only required for primary landlord
    'property-info': [
      'propertyDeedNumber',
      'propertyRegistryFolio',
    ],
    'financial-info': [], // All financial fields are optional
    'documents': [], // All document fields are optional
  },
  COMPANY: {
    'owner-info': [
      'companyName',
      'companyRfc',
      'legalRepFirstName',
      'legalRepPaternalLastName',
      'legalRepMaternalLastName',
      'legalRepPosition',
      'legalRepPhone',
      'legalRepEmail',
      'email',
      'phone',
      'address',
    ],
    'bank-info': [], // Only required for primary landlord
    'property-info': [
      'propertyDeedNumber',
      'propertyRegistryFolio',
    ],
    'financial-info': [], // All financial fields are optional
    'documents': [], // All document fields are optional
  },
} as const;

/**
 * Special validation for primary landlord
 * Primary landlord has additional requirements
 */
export const PRIMARY_LANDLORD_REQUIRED_FIELDS = {
  'bank-info': [
    'bankName',
    'accountNumber',
    'clabe',
    'accountHolder',
  ],
  'financial-info': [
    'requiresCFDI',
  ],
};

/**
 * Check if all required fields for a tab are filled
 */
export function isLandlordTabComplete(
  formData: Record<string, any>,
  isCompany: boolean,
  tabName: string,
  isPrimary: boolean = false
): boolean {
  const landlordType = isCompany ? 'COMPANY' : 'INDIVIDUAL';
  let requiredFields = LANDLORD_TAB_REQUIRED_FIELDS[landlordType][tabName as keyof typeof LANDLORD_TAB_REQUIRED_FIELDS[typeof landlordType]];

  // Add primary landlord requirements if applicable
  if (isPrimary && PRIMARY_LANDLORD_REQUIRED_FIELDS[tabName as keyof typeof PRIMARY_LANDLORD_REQUIRED_FIELDS]) {
    requiredFields = [
      ...requiredFields,
      ...PRIMARY_LANDLORD_REQUIRED_FIELDS[tabName as keyof typeof PRIMARY_LANDLORD_REQUIRED_FIELDS],
    ];
  }

  if (!requiredFields || requiredFields.length === 0) {
    return true; // No required fields means tab is complete
  }

  return requiredFields.every(field => {
    const value = formData[field];
    // Check if field has a value (not null, undefined, or empty string)
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Get progress percentage for landlord form completion
 */
export function getLandlordFormProgress(
  formData: Record<string, any>,
  isCompany: boolean,
  isPrimary: boolean = false
): number {
  const tabs = getLandlordTabs(isCompany);
  const completedTabs = tabs.filter(tab =>
    isLandlordTabComplete(formData, isCompany, tab, isPrimary)
  ).length;

  return Math.round((completedTabs / tabs.length) * 100);
}

/**
 * Type for landlord tab names
 */
export type LandlordTabName = 'owner-info' | 'bank-info' | 'property-info' | 'financial-info' | 'documents';

/**
 * Type for landlord types
 */
export type LandlordType = 'INDIVIDUAL' | 'COMPANY';