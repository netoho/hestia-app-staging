/**
 * Data transformation utilities for tenant data
 * Prepares form data for database storage
 */

import { TENANT_TAB_FIELDS } from '@/lib/schemas/tenant';

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
 * Process address fields
 * Handles nested address objects and prepares them for DB relations
 */
export function processAddressFields(data: any) {
  const result = { ...data };

  // Handle addressDetails
  if (data.addressDetails && typeof data.addressDetails === 'object') {
    // If we have address details, we'll need to create/update the address record
    // For now, just ensure it's properly structured
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

  // Handle previousRentalAddressDetails
  if (data.previousRentalAddressDetails && typeof data.previousRentalAddressDetails === 'object') {
    result.previousRentalAddressDetails = {
      ...emptyStringsToNull(data.previousRentalAddressDetails),
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

  // Fields that should be numbers
  const numberFields = [
    'monthlyIncome',
    'additionalIncomeAmount',
    'previousRentAmount',
    'rentalHistoryYears',
    'numberOfOccupants',
    'yearsAtJob',
    'employeeCount',
    'yearsInBusiness',
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
 * Handle tenant-specific field mappings
 */
export function mapTenantFields(data: any, isCompany: boolean) {
  const result = { ...data };

  // Map legal rep fields for companies
  if (isCompany && data.firstName) {
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

  // Ensure tenantType is set
  result.tenantType = isCompany ? 'COMPANY' : 'INDIVIDUAL';

  return result;
}

/**
 * Filter fields by tab
 * Only include fields that belong to the specified tab
 */
export function filterFieldsByTab(
  data: any,
  tenantType: 'INDIVIDUAL' | 'COMPANY',
  tabName: string
): any {
  const tabFields = TENANT_TAB_FIELDS[tenantType][tabName as keyof typeof TENANT_TAB_FIELDS[typeof tenantType]];

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

  // Special handling for nested objects
  if (tabName === 'references') {
    if (data.personalReferences) filtered.personalReferences = data.personalReferences;
    if (data.commercialReferences) filtered.commercialReferences = data.commercialReferences;
  }

  return filtered;
}

/**
 * Main function to prepare tenant data for database
 */
export function prepareTenantForDB(
  data: any,
  options: {
    tenantType: 'INDIVIDUAL' | 'COMPANY';
    isPartial?: boolean;
    tabName?: string;
  }
): any {
  let prepared = { ...data };

  // Step 1: Filter by tab if specified
  if (options.tabName) {
    prepared = filterFieldsByTab(prepared, options.tenantType, options.tabName);
  }

  // Step 2: Map fields based on tenant type
  prepared = mapTenantFields(prepared, options.tenantType === 'COMPANY');

  // Step 3: Normalize data types
  prepared = normalizeBooleans(prepared);
  prepared = normalizeNumbers(prepared);

  // Step 4: Process address fields
  prepared = processAddressFields(prepared);

  // Step 5: Convert empty strings to null
  prepared = emptyStringsToNull(prepared);

  // Step 6: Remove undefined values
  prepared = removeUndefined(prepared);

  // Step 7: Add metadata if not partial
  if (!options.isPartial) {
    prepared.informationComplete = true;
    prepared.completedAt = new Date();
  }

  return prepared;
}

/**
 * Prepare references for database
 * Handles the special structure needed for Prisma relations
 */
export function prepareReferencesForDB(
  references: any[],
  type: 'personal' | 'commercial'
): any {
  if (!references || references.length === 0) {
    return undefined;
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