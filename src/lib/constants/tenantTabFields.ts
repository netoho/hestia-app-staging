/**
 * Tenant Tab Field Configuration
 * Maps database fields to their respective tabs
 * Single source of truth for tenant form structure
 */

/**
 * Tenant tab field mapping - matches actual database fields
 * These field names must match the Prisma schema exactly
 */
export const TENANT_TAB_FIELDS = {
  INDIVIDUAL: {
    personal: [
      // Name fields (Mexican naming convention)
      'firstName',
      'middleName',
      'paternalLastName',
      'maternalLastName',
      // Identification
      'nationality',
      'curp',
      'rfc',
      'passport',
      // Contact
      'email',
      'phone',              // Note: DB uses 'phone' not 'phoneNumber'
      'personalEmail',
      'workEmail',
      'workPhone',
      // Address
      'currentAddress',
      'addressDetails',     // Nested object for address components
    ],
    employment: [
      'employmentStatus',
      'occupation',
      'employerName',       // Note: DB uses 'employerName' not 'companyWorkName'
      'employerAddress',    // Note: DB uses 'employerAddress' not 'companyWorkAddress'
      'employerAddressDetails',
      'position',
      'monthlyIncome',
      'incomeSource',
      // These fields are missing in current actorTabFields but exist in DB:
      'yearsAtJob',
      'hasAdditionalIncome',
      'additionalIncomeSource',
      'additionalIncomeAmount',
    ],
    rental: [
      'previousLandlordName',
      'previousLandlordPhone',
      'previousLandlordEmail',
      'previousRentAmount',
      'previousRentalAddress',     // Note: DB uses 'previousRentalAddress' not 'previousAddress'
      'previousRentalAddressDetails',
      'rentalHistoryYears',
      'reasonForMoving',            // Missing in current config but useful
      'numberOfOccupants',          // Missing in current config
      'hasPets',                    // Missing in current config
      'petDescription',             // Note: DB uses 'petDescription' not 'petDetails'
    ],
    references: [
      'personalReferences',         // Array of references (handled separately)
    ],
    documents: [
      'additionalInfo',            // Missing in current config but exists in DB
      'paymentMethod',
      'requiresCFDI',
      'cfdiData',
    ],
  },
  COMPANY: {
    personal: [
      // Company fields
      'companyName',
      'companyRfc',
      // Legal representative (using 'legalRep' prefix as in DB)
      'legalRepFirstName',
      'legalRepMiddleName',
      'legalRepPaternalLastName',
      'legalRepMaternalLastName',
      'legalRepId',
      'legalRepPosition',
      'legalRepRfc',
      'legalRepPhone',
      'legalRepEmail',
      // Company contact
      'email',
      'phone',
      'personalEmail',
      'workEmail',
      'workPhone',
      // Company address
      'currentAddress',
      'addressDetails',
      // Additional company fields (optional)
      'businessType',
      'employeeCount',
      'yearsInBusiness',
    ],
    references: [
      'commercialReferences',      // Array of commercial references
    ],
    documents: [
      'additionalInfo',
      'paymentMethod',
      'requiresCFDI',
      'cfdiData',
    ],
  },
} as const;

/**
 * Get fields for a specific tab and tenant type
 */
export function getTenantTabFields(
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string
): readonly string[] | undefined {
  const config = TENANT_TAB_FIELDS[tenantType];
  if (!config) return undefined;

  return config[tabName as keyof typeof config];
}

/**
 * Check if a field belongs to a specific tab
 */
export function isFieldInTab(
  field: string,
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string
): boolean {
  const tabFields = getTenantTabFields(tenantType, tabName);
  return tabFields ? tabFields.includes(field) : false;
}

/**
 * Get all tabs for a tenant type
 */
export function getTenantTabs(tenantType: 'INDIVIDUAL' | 'COMPANY'): string[] {
  return Object.keys(TENANT_TAB_FIELDS[tenantType]);
}

/**
 * Filter form data to only include fields for a specific tab
 */
export function filterTenantFieldsByTab<T extends Record<string, any>>(
  formData: T,
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string
): Partial<T> {
  const tabFields = getTenantTabFields(tenantType, tabName);

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
  if (tabName === 'personal' || tabName === 'employment' || tabName === 'rental') {
    // Include address details if they exist
    const addressField = tabName === 'personal' ? 'addressDetails' :
                        tabName === 'employment' ? 'employerAddressDetails' :
                        'previousRentalAddressDetails';

    if (addressField in formData) {
      filtered[addressField] = formData[addressField];
    }
  }

  return filtered as Partial<T>;
}

/**
 * Validation rules per tab
 * Defines which fields are required for each tab
 */
export const TENANT_TAB_REQUIRED_FIELDS = {
  INDIVIDUAL: {
    personal: [
      'firstName',
      'paternalLastName',
      'maternalLastName',
      'nationality',
      'email',
      'phone',
      'currentAddress',
    ],
    employment: [
      'employmentStatus',
      'occupation',
      'employerName',
      'employerAddress',
      'monthlyIncome',
    ],
    rental: [], // All rental history fields are optional
    references: ['personalReferences'], // At least 1 reference
    documents: [], // All document fields are optional
  },
  COMPANY: {
    personal: [
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
      'currentAddress',
    ],
    references: ['commercialReferences'], // At least 1 reference
    documents: [], // All document fields are optional
  },
} as const;

/**
 * Check if all required fields for a tab are filled
 */
export function isTenantTabComplete(
  formData: Record<string, any>,
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string
): boolean {
  const requiredFields = TENANT_TAB_REQUIRED_FIELDS[tenantType][tabName as keyof typeof TENANT_TAB_REQUIRED_FIELDS[typeof tenantType]];

  if (!requiredFields || requiredFields.length === 0) {
    return true; // No required fields means tab is complete
  }

  return requiredFields.every(field => {
    const value = formData[field];

    // Special handling for arrays (references)
    if (field === 'personalReferences' || field === 'commercialReferences') {
      return Array.isArray(value) && value.length > 0;
    }

    // Check if field has a value (not null, undefined, or empty string)
    return value !== null && value !== undefined && value !== '';
  });
}