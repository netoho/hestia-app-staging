/**
 * Data transformation utilities for Aval data
 * Prepares form data for database storage
 */

import { AVAL_TAB_FIELDS } from '@/lib/constants/avalTabFields';
import { AvalType } from "@/prisma/generated/prisma-client/enums";

/**
 * Transform empty strings to null
 * React forms often produce empty strings, but DB expects null for empty fields
 */
export function emptyStringsToNull<T extends Record<string, any>>(data: T): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(data)) {
    if (value === '') {
      result[key as keyof T] = null as any;
    } else if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * Remove undefined fields from object
 * Prisma doesn't like undefined values
 */
export function removeUndefined<T extends Record<string, any>>(data: T): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * Process address fields for Aval
 * Handles nested address objects and prepares them for DB relations
 */
export function processAddressFields(data: any) {
  const result = { ...data };

  // Handle addressDetails (personal address)
  if (data.addressDetails && typeof data.addressDetails === 'object') {
    result.addressDetails = {
      ...emptyStringsToNull(data.addressDetails),
    };
  }

  // Handle employerAddressDetails
  if (data.employerAddressDetails && typeof data.employerAddressDetails === 'object') {
    result.employerAddressDetails = {
      ...emptyStringsToNull(data.employerAddressDetails),
    };
  }

  // Handle guaranteePropertyDetails (MANDATORY for Aval)
  if (data.guaranteePropertyDetails && typeof data.guaranteePropertyDetails === 'object') {
    result.guaranteePropertyDetails = {
      ...emptyStringsToNull(data.guaranteePropertyDetails),
    };
  }

  return result;
}

/**
 * Convert string booleans to actual booleans
 */
export function normalizeBooleans<T extends Record<string, any>>(data: T): T {
  const result = { ...data };

  for (const [key, value] of Object.entries(result)) {
    if (value === 'true') {
      result[key as keyof T] = true as any;
    } else if (value === 'false') {
      result[key as keyof T] = false as any;
    }
  }

  return result;
}

/**
 * Convert string numbers to actual numbers
 */
export function normalizeNumbers<T extends Record<string, any>>(data: T): T {
  const result = { ...data };

  // Fields that should be numbers for Aval
  const numberFields = [
    'monthlyIncome',
    'propertyValue', // IMPORTANT: Property value for guarantee
    'yearsOfRelationship', // For commercial references
  ];

  for (const field of numberFields) {
    if (field in result && typeof result[field as keyof T] === 'string') {
      const value = parseFloat(result[field as keyof T] as string);
      if (!isNaN(value)) {
        result[field as keyof T] = value as any;
      }
    }
  }

  return result;
}

/**
 * Handle Aval-specific field mappings
 * CRITICAL: Enforces mandatory property guarantee and other Aval-specific rules
 */
export function mapAvalFields(data: any, avalType: AvalType) {
  const result = { ...data };

  // CRITICAL: Aval ALWAYS has property guarantee
  result.hasPropertyGuarantee = true;
  result.guaranteeMethod = 'property';

  // Handle legacy isCompany field if present
  if ('isCompany' in result) {
    result.avalType = result.isCompany ? 'COMPANY' : 'INDIVIDUAL';
    delete result.isCompany;
  } else {
    // Ensure avalType is set
    result.avalType = avalType;
  }

  // Map legal rep fields for companies
  if (avalType === 'COMPANY' && data.firstName) {
    // Form might send legal rep fields without prefix
    result.legalRepFirstName = result.legalRepFirstName || result.firstName;
    result.legalRepMiddleName = result.legalRepMiddleName || result.middleName;
    result.legalRepPaternalLastName = result.legalRepPaternalLastName || result.paternalLastName;
    result.legalRepMaternalLastName = result.legalRepMaternalLastName || result.maternalLastName;

    // Clear individual name fields for company
    delete result.firstName;
    delete result.middleName;
    delete result.paternalLastName;
    delete result.maternalLastName;
  }

  // Handle marriage information validation
  // If married (joint or separate property), ensure spouse info exists
  if (result.maritalStatus === 'married_joint' || result.maritalStatus === 'married_separate') {
    // Just ensure the fields are present; validation will check they're filled
    if (!result.spouseName && !result.spouseRfc && !result.spouseCurp) {
      console.warn('Married status detected but spouse information is missing');
    }
  }

  return result;
}

/**
 * Filter fields by tab
 * Only include fields that belong to the specified tab
 */
export function filterFieldsByTab(
  data: any,
  avalType: AvalType,
  tabName: string
): any {
  const tabFields = AVAL_TAB_FIELDS[avalType][tabName as keyof typeof AVAL_TAB_FIELDS[typeof avalType]];

  if (!tabFields) {
    console.warn(`No field configuration for tab: ${tabName}`);
    return data;
  }

  const filtered: any = {};

  // Include only fields that belong to this tab
  for (const field of tabFields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }

  // Special handling for nested objects and relations
  if (tabName === 'personal') {
    if (data.addressDetails) filtered.addressDetails = data.addressDetails;
  }

  if (tabName === 'employment') {
    if (data.employerAddressDetails) filtered.employerAddressDetails = data.employerAddressDetails;
  }

  if (tabName === 'property') {
    if (data.guaranteePropertyDetails) filtered.guaranteePropertyDetails = data.guaranteePropertyDetails;
    // Ensure property guarantee fields are always included
    filtered.hasPropertyGuarantee = true;
    filtered.guaranteeMethod = 'property';
  }

  if (tabName === 'references') {
    if (data.personalReferences) filtered.personalReferences = data.personalReferences;
    if (data.commercialReferences) filtered.commercialReferences = data.commercialReferences;
  }

  return filtered;
}

/**
 * Validate and prepare references for Aval
 * CRITICAL: Aval requires EXACTLY 3 references
 */
export function prepareReferencesForDB(
  references: any[],
  type: 'personal' | 'commercial'
): any {
  if (!references || references.length === 0) {
    return undefined;
  }

  // CRITICAL: Aval requires exactly 3 references
  if (references.length !== 3) {
    console.warn(`Aval requires exactly 3 references, but got ${references.length}`);
    // Don't throw here, let validation handle it
  }

  // Clean each reference
  const cleaned = references.map(ref => {
    const cleanRef = emptyStringsToNull(removeUndefined(ref));

    // For commercial references, ensure contact fields are properly named
    if (type === 'commercial' && !cleanRef.contactFirstName && cleanRef.firstName) {
      return {
        companyName: cleanRef.companyName,
        contactFirstName: cleanRef.firstName,
        contactMiddleName: cleanRef.middleName,
        contactPaternalLastName: cleanRef.paternalLastName,
        contactMaternalLastName: cleanRef.maternalLastName,
        phone: cleanRef.phone,
        email: cleanRef.email,
        relationship: cleanRef.relationship,
        yearsOfRelationship: cleanRef.yearsOfRelationship,
      };
    }

    return cleanRef;
  });

  // Return in Prisma's expected format for nested creates
  return {
    create: cleaned,
  };
}

/**
 * Validate marriage information consistency
 */
export function validateMarriageInfo(data: any): boolean {
  const { maritalStatus, spouseName, spouseRfc, spouseCurp } = data;

  // If married with property, spouse info is required
  if (maritalStatus === 'married_joint' || maritalStatus === 'married_separate') {
    if (!spouseName) {
      console.error('Spouse name is required for married status');
      return false;
    }
    // RFC and CURP are optional but recommended
  }

  return true;
}

/**
 * Main function to prepare Aval data for database
 * Enforces all Aval-specific requirements
 */
export function prepareAvalForDB(
  data: any,
  options: {
    avalType: AvalType;
    isPartial?: boolean;
    tabName?: string;
  }
): any {
  let prepared = { ...data };

  // Step 1: Filter by tab if specified
  if (options.tabName) {
    prepared = filterFieldsByTab(prepared, options.avalType, options.tabName);
  }

  // Step 2: Map fields based on Aval type and enforce requirements
  prepared = mapAvalFields(prepared, options.avalType);

  // Step 3: Normalize data types
  prepared = normalizeBooleans(prepared);
  prepared = normalizeNumbers(prepared);

  // Step 4: Process address fields
  prepared = processAddressFields(prepared);

  // Step 5: Convert empty strings to null
  prepared = emptyStringsToNull(prepared);

  // Step 6: Remove undefined values
  prepared = removeUndefined(prepared);

  // Step 7: Handle references if present
  if (prepared.personalReferences) {
    prepared.personalReferences = prepareReferencesForDB(
      prepared.personalReferences,
      'personal'
    );
  }
  if (prepared.commercialReferences) {
    prepared.commercialReferences = prepareReferencesForDB(
      prepared.commercialReferences,
      'commercial'
    );
  }

  // Step 8: Validate marriage information consistency
  if (!options.isPartial && prepared.maritalStatus) {
    validateMarriageInfo(prepared);
  }

  // Step 9: Add metadata if not partial
  if (!options.isPartial) {
    prepared.informationComplete = true;
    prepared.completedAt = new Date();
  }

  return prepared;
}

/**
 * Helper to check if Aval has all required information
 */
export function isAvalComplete(data: any): boolean {
  // Check for mandatory property guarantee
  if (!data.hasPropertyGuarantee || data.guaranteeMethod !== 'property') {
    return false;
  }

  // Check for property details
  if (!data.propertyValue || !data.propertyDeedNumber || !data.propertyRegistry) {
    return false;
  }

  // Check for exactly 3 references
  const references = data.avalType === 'COMPANY'
    ? data.commercialReferences
    : data.personalReferences;

  if (!references || references.length !== 3) {
    return false;
  }

  // Check marriage info if applicable
  if (data.maritalStatus === 'married_joint' || data.maritalStatus === 'married_separate') {
    if (!data.spouseName) {
      return false;
    }
  }

  return true;
}
