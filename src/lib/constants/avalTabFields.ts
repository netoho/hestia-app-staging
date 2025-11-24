import { Aval } from '@prisma/client';
import { AvalTypeEnum, AvalTab } from '../schemas/aval';

// ============================================
// TAB FIELD DEFINITIONS
// ============================================

/**
 * Maps database fields to their corresponding tabs for INDIVIDUAL Aval type
 */
export const AVAL_INDIVIDUAL_TAB_FIELDS = {
  personal: [
    'avalType',
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'nationality',
    'curp',
    'rfc',
    'passport',
    'email',
    'phone',
    'workPhone',
    'personalEmail',
    'workEmail',
    'addressId',
    'addressDetails',
    'address', // legacy field
    'relationshipToTenant',
  ] as (keyof Aval)[],

  employment: [
    'employmentStatus',
    'occupation',
    'employerName',
    'employerAddress', // legacy field
    'employerAddressId',
    'employerAddressDetails',
    'position',
    'monthlyIncome',
    'incomeSource',
  ] as (keyof Aval)[],

  property: [
    'hasPropertyGuarantee',
    'guaranteeMethod',
    'propertyAddress', // legacy field
    'guaranteePropertyAddressId',
    'guaranteePropertyDetails',
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
    'propertyTaxAccount',
    'propertyUnderLegalProceeding',
    'maritalStatus',
    'spouseName',
    'spouseRfc',
    'spouseCurp',
  ] as (keyof Aval)[],

  references: [
    'personalReferences',
    // Note: references are stored in separate table
  ] as (keyof Aval)[],

  documents: [
    'additionalInfo',
    'documents', // relation to ActorDocument
  ] as (keyof Aval)[],
} as const;

/**
 * Maps database fields to their corresponding tabs for COMPANY Aval type
 */
export const AVAL_COMPANY_TAB_FIELDS = {
  personal: [
    'avalType',
    'companyName',
    'companyRfc',
    'legalRepFirstName',
    'legalRepMiddleName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepPosition',
    'legalRepRfc',
    'legalRepPhone',
    'legalRepEmail',
    'email',
    'phone',
    'workPhone',
    'personalEmail',
    'workEmail',
    'addressId',
    'addressDetails',
    'address', // legacy field
    'relationshipToTenant',
  ] as (keyof Aval)[],

  property: [
    'hasPropertyGuarantee',
    'guaranteeMethod',
    'propertyAddress', // legacy field
    'guaranteePropertyAddressId',
    'guaranteePropertyDetails',
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
    'propertyTaxAccount',
    'propertyUnderLegalProceeding',
    'maritalStatus',
    'spouseName',
    'spouseRfc',
    'spouseCurp',
  ] as (keyof Aval)[],

  references: [
    'commercialReferences',
    // Note: references are stored in separate table
  ] as (keyof Aval)[],

  documents: [
    'additionalInfo',
    'documents', // relation to ActorDocument
  ] as (keyof Aval)[],
} as const;

// Combined mapping
export const AVAL_TAB_FIELDS = {
  INDIVIDUAL: AVAL_INDIVIDUAL_TAB_FIELDS,
  COMPANY: AVAL_COMPANY_TAB_FIELDS,
} as const;

// ============================================
// REQUIRED FIELDS BY TAB
// ============================================

/**
 * Required fields for each tab (INDIVIDUAL type)
 */
export const AVAL_INDIVIDUAL_REQUIRED_FIELDS = {
  personal: [
    'avalType',
    'firstName',
    'paternalLastName',
    'maternalLastName',
    'email',
    'phone',
    'addressDetails',
    'relationshipToTenant',
  ],
  employment: [], // All employment fields are optional for Aval
  property: [
    'hasPropertyGuarantee',
    'guaranteeMethod',
    'guaranteePropertyDetails',
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
  ],
  references: [
    'personalReferences', // Must have exactly 3
  ],
  documents: [], // All optional
} as const;

/**
 * Required fields for each tab (COMPANY type)
 */
export const AVAL_COMPANY_REQUIRED_FIELDS = {
  personal: [
    'avalType',
    'companyName',
    'companyRfc',
    'legalRepFirstName',
    'legalRepPaternalLastName',
    'legalRepMaternalLastName',
    'legalRepPosition',
    'email',
    'phone',
    'addressDetails',
    'relationshipToTenant',
  ],
  property: [
    'hasPropertyGuarantee',
    'guaranteeMethod',
    'guaranteePropertyDetails',
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
  ],
  references: [
    'commercialReferences', // Must have exactly 3
  ],
  documents: [], // All optional
} as const;

// Combined required fields
export const AVAL_REQUIRED_FIELDS = {
  INDIVIDUAL: AVAL_INDIVIDUAL_REQUIRED_FIELDS,
  COMPANY: AVAL_COMPANY_REQUIRED_FIELDS,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get tab fields for a specific Aval type and tab
 */
export function getAvalTabFields(
  avalType: AvalTypeEnum,
  tab: AvalTab
): readonly (keyof Aval)[] | undefined {
  const fields = AVAL_TAB_FIELDS[avalType];
  if (!fields) return undefined;

  return (fields as any)[tab];
}

/**
 * Get required fields for a specific Aval type and tab
 */
export function getAvalRequiredFields(
  avalType: AvalTypeEnum,
  tab: AvalTab
): readonly string[] | undefined {
  const fields = AVAL_REQUIRED_FIELDS[avalType];
  if (!fields) return undefined;

  return (fields as any)[tab];
}

/**
 * Filter Aval data to only include fields for a specific tab
 */
export function filterAvalFieldsByTab(
  data: Partial<Aval>,
  avalType: AvalTypeEnum,
  tab: AvalTab
): Partial<Aval> {
  const tabFields = getAvalTabFields(avalType, tab);
  if (!tabFields) return {};

  const filtered: any = {};

  for (const field of tabFields) {
    if (field in data) {
      filtered[field] = (data as any)[field];
    }
  }

  // Handle special cases for nested data
  if (tab === 'personal' && 'addressDetails' in data) {
    filtered.addressDetails = data.addressDetails;
  }
  if (tab === 'employment' && 'employerAddressDetails' in data) {
    filtered.employerAddressDetails = data.employerAddressDetails;
  }
  if (tab === 'property' && 'guaranteePropertyDetails' in data) {
    filtered.guaranteePropertyDetails = data.guaranteePropertyDetails;
  }
  if (tab === 'references') {
    if (avalType === 'INDIVIDUAL' && 'personalReferences' in data) {
      filtered.personalReferences = data.personalReferences;
    }
    if (avalType === 'COMPANY' && 'commercialReferences' in data) {
      filtered.commercialReferences = data.commercialReferences;
    }
  }

  return filtered;
}

/**
 * Check if a tab has all required fields filled
 */
export function isAvalTabComplete(
  data: Partial<Aval>,
  avalType: AvalTypeEnum,
  tab: AvalTab
): boolean {
  const requiredFields = getAvalRequiredFields(avalType, tab);
  if (!requiredFields) return true;

  for (const field of requiredFields) {
    const value = (data as any)[field];

    // Special handling for references - must have exactly 3
    if (field === 'personalReferences') {
      if (!Array.isArray(value) || value.length !== 3) {
        return false;
      }
    } else if (field === 'commercialReferences') {
      if (!Array.isArray(value) || value.length !== 3) {
        return false;
      }
    } else if (field === 'addressDetails' || field === 'guaranteePropertyDetails') {
      // Check if address object exists and has required fields
      if (!value || typeof value !== 'object') {
        return false;
      }
      // Basic address validation
      const addr = value as any;
      if (!addr.street || !addr.exteriorNumber || !addr.neighborhood ||
          !addr.postalCode || !addr.municipality || !addr.city || !addr.state) {
        return false;
      }
    } else {
      // Regular field check
      if (value === null || value === undefined || value === '') {
        return false;
      }
    }
  }

  // Additional validation for property tab - check marriage info if married
  if (tab === 'property') {
    const maritalStatus = (data as any).maritalStatus;
    if (maritalStatus === 'married_joint' || maritalStatus === 'married_separate') {
      if (!(data as any).spouseName) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get all tabs for an Aval type
 */
export function getAvalTabs(avalType: AvalTypeEnum): readonly string[] {
  if (avalType === 'INDIVIDUAL') {
    return ['personal', 'employment', 'property', 'references', 'documents'] as const;
  } else {
    return ['personal', 'property', 'references', 'documents'] as const;
  }
}

/**
 * Get the next incomplete tab for an Aval
 */
export function getNextIncompleteAvalTab(
  data: Partial<Aval>,
  avalType: AvalTypeEnum
): AvalTab | null {
  const tabs = getAvalTabs(avalType);

  for (const tab of tabs) {
    if (!isAvalTabComplete(data, avalType, tab as AvalTab)) {
      return tab as AvalTab;
    }
  }

  return null;
}

/**
 * Calculate completion percentage for an Aval
 */
export function calculateAvalCompletionPercentage(
  data: Partial<Aval>,
  avalType: AvalTypeEnum
): number {
  const tabs = getAvalTabs(avalType);
  const completedTabs = tabs.filter(tab =>
    isAvalTabComplete(data, avalType, tab as AvalTab)
  );

  return Math.round((completedTabs.length / tabs.length) * 100);
}