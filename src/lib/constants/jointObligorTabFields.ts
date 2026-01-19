/**
 * Joint Obligor Tab Field Configuration
 * Maps database fields to their respective tabs
 * Single source of truth for joint obligor form structure
 */

import { JointObligor } from "@/prisma/generated/prisma-client";

/**
 * Joint Obligor tab field mapping - matches actual database fields
 * These field names must match the Prisma schema exactly
 *
 * Tabs:
 * - INDIVIDUAL: personal, employment, guarantee, references, documents
 * - COMPANY: personal, guarantee, references, documents (no employment)
 */
export const JOINT_OBLIGOR_TAB_FIELDS = {
  INDIVIDUAL: {
    personal: [
      'jointObligorType',
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
      'relationshipToTenant',
      // Contact
      'email',
      'phone',
      'workPhone',
      'personalEmail',
      'workEmail',
      // Address
      'address',
      'addressDetails',
    ] as (keyof JointObligor)[],

    employment: [
      'employmentStatus',
      'occupation',
      'employerName',
      'employerAddress',
      'employerAddressDetails',
      'position',
      'monthlyIncome',
      'incomeSource',
    ] as (keyof JointObligor)[],

    guarantee: [
      'guaranteeMethod',
      'hasPropertyGuarantee',
      // Property guarantee fields
      'propertyAddress',
      'guaranteePropertyDetails',
      'propertyValue',
      'propertyDeedNumber',
      'propertyRegistry',
      'propertyTaxAccount',
      'propertyUnderLegalProceeding',
      // Marriage info (for property guarantee)
      'maritalStatus',
      'spouseName',
      'spouseRfc',
      'spouseCurp',
      // Income guarantee fields
      'bankName',
      'accountHolder',
      'hasProperties',
    ] as (keyof JointObligor)[],

    references: [
      'personalReferences',
    ] as (keyof JointObligor)[],

    documents: [
      'additionalInfo',
    ] as (keyof JointObligor)[],
  },

  COMPANY: {
    personal: [
      'jointObligorType',
      // Company fields
      'companyName',
      'companyRfc',
      // Legal representative
      'legalRepFirstName',
      'legalRepMiddleName',
      'legalRepPaternalLastName',
      'legalRepMaternalLastName',
      'legalRepPosition',
      'legalRepRfc',
      'legalRepPhone',
      'legalRepEmail',
      // Contact
      'email',
      'phone',
      'workPhone',
      'personalEmail',
      'workEmail',
      // Address
      'address',
      'addressDetails',
      'relationshipToTenant',
    ] as (keyof JointObligor)[],

    guarantee: [
      'guaranteeMethod',
      'hasPropertyGuarantee',
      // Property guarantee fields
      'propertyAddress',
      'guaranteePropertyDetails',
      'propertyValue',
      'propertyDeedNumber',
      'propertyRegistry',
      'propertyTaxAccount',
      'propertyUnderLegalProceeding',
      // Income guarantee fields
      'bankName',
      'accountHolder',
      'hasProperties',
    ] as (keyof JointObligor)[],

    references: [
      'commercialReferences',
    ] as (keyof JointObligor)[],

    documents: [
      'additionalInfo',
    ] as (keyof JointObligor)[],
  },
} as const;

/**
 * Required fields for each tab (INDIVIDUAL type)
 */
export const JOINT_OBLIGOR_INDIVIDUAL_REQUIRED_FIELDS = {
  personal: [
    'jointObligorType',
    'firstName',
    'paternalLastName',
    'maternalLastName',
    'email',
    'phone',
    'addressDetails',
    'relationshipToTenant',
  ],
  employment: [], // Employment fields optional for Joint Obligor
  guarantee: [
    'guaranteeMethod',
  ],
  references: [
    'personalReferences', // Must have 3 references
  ],
  documents: [], // Optional
} as const;

/**
 * Required fields for each tab (COMPANY type)
 */
export const JOINT_OBLIGOR_COMPANY_REQUIRED_FIELDS = {
  personal: [
    'jointObligorType',
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
  guarantee: [
    'guaranteeMethod',
  ],
  references: [
    'commercialReferences', // Must have 3 references
  ],
  documents: [], // Optional
} as const;

// Combined required fields
export const JOINT_OBLIGOR_REQUIRED_FIELDS = {
  INDIVIDUAL: JOINT_OBLIGOR_INDIVIDUAL_REQUIRED_FIELDS,
  COMPANY: JOINT_OBLIGOR_COMPANY_REQUIRED_FIELDS,
} as const;

// Type definitions
export type JointObligorTypeEnum = 'INDIVIDUAL' | 'COMPANY';
export type JointObligorTab = 'personal' | 'employment' | 'guarantee' | 'references' | 'documents';

/**
 * Get tab fields for a specific Joint Obligor type and tab
 */
export function getJointObligorTabFields(
  jointObligorType: JointObligorTypeEnum,
  tab: JointObligorTab
): readonly (keyof JointObligor)[] | undefined {
  const fields = JOINT_OBLIGOR_TAB_FIELDS[jointObligorType];
  if (!fields) return undefined;

  return (fields as any)[tab];
}

/**
 * Get required fields for a specific Joint Obligor type and tab
 */
export function getJointObligorRequiredFields(
  jointObligorType: JointObligorTypeEnum,
  tab: JointObligorTab
): readonly string[] | undefined {
  const fields = JOINT_OBLIGOR_REQUIRED_FIELDS[jointObligorType];
  if (!fields) return undefined;

  return (fields as any)[tab];
}

/**
 * Filter Joint Obligor data to only include fields for a specific tab
 */
export function filterJointObligorFieldsByTab(
  data: Partial<JointObligor>,
  jointObligorType: JointObligorTypeEnum,
  tab: JointObligorTab
): Partial<JointObligor> {
  const tabFields = getJointObligorTabFields(jointObligorType, tab);
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
  if (tab === 'guarantee' && 'guaranteePropertyDetails' in data) {
    filtered.guaranteePropertyDetails = data.guaranteePropertyDetails;
  }
  if (tab === 'references') {
    if (jointObligorType === 'INDIVIDUAL' && 'personalReferences' in data) {
      filtered.personalReferences = data.personalReferences;
    }
    if (jointObligorType === 'COMPANY' && 'commercialReferences' in data) {
      filtered.commercialReferences = data.commercialReferences;
    }
  }

  return filtered;
}

/**
 * Check if a tab has all required fields filled
 */
export function isJointObligorTabComplete(
  data: Partial<JointObligor>,
  jointObligorType: JointObligorTypeEnum,
  tab: JointObligorTab
): boolean {
  const requiredFields = getJointObligorRequiredFields(jointObligorType, tab);
  if (!requiredFields) return true;

  for (const field of requiredFields) {
    const value = (data as any)[field];

    // Special handling for references - must have exactly 3
    if (field === 'personalReferences' || field === 'commercialReferences') {
      if (!Array.isArray(value) || value.length !== 3) {
        return false;
      }
    } else if (field === 'addressDetails' || field === 'guaranteePropertyDetails') {
      // Check if address object exists and has required fields
      if (!value || typeof value !== 'object') {
        return false;
      }
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

  // Additional validation for guarantee tab
  if (tab === 'guarantee') {
    const guaranteeMethod = (data as any).guaranteeMethod;
    if (guaranteeMethod === 'property') {
      // Property guarantee requires property fields
      if (!(data as any).guaranteePropertyDetails || !(data as any).propertyValue) {
        return false;
      }
      // Check marriage info if married
      const maritalStatus = (data as any).maritalStatus;
      if (maritalStatus === 'married_joint' || maritalStatus === 'married_separate') {
        if (!(data as any).spouseName) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Get all tabs for a Joint Obligor type
 */
export function getJointObligorTabs(jointObligorType: JointObligorTypeEnum): readonly JointObligorTab[] {
  if (jointObligorType === 'INDIVIDUAL') {
    return ['personal', 'employment', 'guarantee', 'references', 'documents'] as const;
  } else {
    return ['personal', 'guarantee', 'references', 'documents'] as const;
  }
}

/**
 * Get the next incomplete tab for a Joint Obligor
 */
export function getNextIncompleteJointObligorTab(
  data: Partial<JointObligor>,
  jointObligorType: JointObligorTypeEnum
): JointObligorTab | null {
  const tabs = getJointObligorTabs(jointObligorType);

  for (const tab of tabs) {
    if (!isJointObligorTabComplete(data, jointObligorType, tab)) {
      return tab;
    }
  }

  return null;
}

/**
 * Calculate completion percentage for a Joint Obligor
 */
export function calculateJointObligorCompletionPercentage(
  data: Partial<JointObligor>,
  jointObligorType: JointObligorTypeEnum
): number {
  const tabs = getJointObligorTabs(jointObligorType);
  const completedTabs = tabs.filter(tab =>
    isJointObligorTabComplete(data, jointObligorType, tab)
  );

  return Math.round((completedTabs.length / tabs.length) * 100);
}
