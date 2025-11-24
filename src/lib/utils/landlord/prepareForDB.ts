/**
 * Data transformation utilities for landlord data
 * Prepares form data for database storage
 * Handles multi-landlord scenarios and Policy field mapping
 */

import { LANDLORD_TAB_FIELDS } from '@/lib/constants/landlordTabFields';
import { emptyStringsToNull } from '@/lib/utils/dataTransform';

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
 * Process address fields for landlord
 * Handles nested address objects and prepares them for DB relations
 */
export function processAddressFields(data: any) {
  const result = { ...data };

  // Handle addressDetails
  if (data.addressDetails && typeof data.addressDetails === 'object') {
    result.addressDetails = {
      ...emptyStringsToNull(data.addressDetails),
    };
  }

  // Handle propertyAddressDetails (for property info)
  if (data.propertyAddressDetails && typeof data.propertyAddressDetails === 'object') {
    result.propertyAddressDetails = {
      ...emptyStringsToNull(data.propertyAddressDetails),
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
    'propertyValue',
    'monthlyIncome',
    'additionalIncomeAmount',
    'parkingSpaces',
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
 * Extract fields that belong to Policy table
 * Some financial fields are stored on Policy, not Landlord
 */
export function extractPolicyFields(data: any): {
  landlordData: any;
  policyData: any;
} {
  const policyFields = [
    'hasIVA',
    'issuesTaxReceipts',
    'securityDeposit',
    'maintenanceFee',
    'rentIncreasePercentage',
    'paymentMethod',
  ];

  const landlordData = { ...data };
  const policyData: any = {};

  // Move policy fields to separate object
  for (const field of policyFields) {
    if (field in landlordData) {
      policyData[field] = landlordData[field];
      delete landlordData[field];
    }
  }

  return { landlordData, policyData };
}

/**
 * Handle landlord-specific field mappings
 */
export function mapLandlordFields(data: any, isCompany: boolean) {
  const result = { ...data };

  // Map legal rep fields for companies
  if (isCompany) {
    // Ensure legal rep fields have correct prefix
    if (data.firstName && !data.legalRepFirstName) {
      result.legalRepFirstName = data.firstName;
      result.legalRepMiddleName = data.middleName;
      result.legalRepPaternalLastName = data.paternalLastName;
      result.legalRepMaternalLastName = data.maternalLastName;

      // Clear individual name fields for company
      delete result.firstName;
      delete result.middleName;
      delete result.paternalLastName;
      delete result.maternalLastName;
    }
  }

  // Ensure isCompany is set as boolean
  result.isCompany = Boolean(isCompany);

  // Set default for isPrimary if not specified
  if (result.isPrimary === undefined) {
    result.isPrimary = false;
  }

  return result;
}

/**
 * Filter fields by tab
 * Only include fields that belong to the specified tab
 */
export function filterFieldsByTab(
  data: any,
  isCompany: boolean,
  tabName: string
): any {
  const landlordType = isCompany ? 'COMPANY' : 'INDIVIDUAL';
  const tabFields = LANDLORD_TAB_FIELDS[landlordType][tabName as keyof typeof LANDLORD_TAB_FIELDS[typeof landlordType]];

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

  // Always include isCompany and isPrimary for context
  filtered.isCompany = data.isCompany;
  filtered.isPrimary = data.isPrimary;

  return filtered;
}

/**
 * Validate multi-landlord constraints
 * Ensures only one primary landlord exists
 */
export function validateMultiLandlords(landlords: any[]): {
  valid: boolean;
  error?: string;
} {
  const primaryCount = landlords.filter(l => l.isPrimary).length;

  if (primaryCount === 0) {
    return {
      valid: false,
      error: 'Al menos un arrendador debe ser designado como principal',
    };
  }

  if (primaryCount > 1) {
    return {
      valid: false,
      error: 'Solo puede haber un arrendador principal',
    };
  }

  return { valid: true };
}

/**
 * Main function to prepare landlord data for database
 */
export function prepareLandlordForDB(
  data: any,
  options: {
    isCompany: boolean;
    isPartial?: boolean;
    tabName?: string;
  }
): {
  landlordData: any;
  policyData?: any;
} {
  let prepared = { ...data };

  // Step 1: Filter by tab if specified
  if (options.tabName) {
    prepared = filterFieldsByTab(prepared, options.isCompany, options.tabName);
  }

  // Step 2: Map fields based on landlord type
  prepared = mapLandlordFields(prepared, options.isCompany);

  // Step 3: Normalize data types
  prepared = normalizeBooleans(prepared);
  prepared = normalizeNumbers(prepared);

  // Step 4: Process address fields
  prepared = processAddressFields(prepared);

  // Step 5: Convert empty strings to null
  prepared = emptyStringsToNull(prepared);

  // Step 6: Remove undefined values
  prepared = removeUndefined(prepared);

  // Step 7: Extract policy fields (financial data)
  const { landlordData, policyData } = extractPolicyFields(prepared);

  // Step 8: Add metadata if not partial
  if (!options.isPartial) {
    landlordData.informationComplete = true;
    landlordData.completedAt = new Date();
  }

  return {
    landlordData,
    policyData: Object.keys(policyData).length > 0 ? policyData : undefined,
  };
}

/**
 * Prepare multiple landlords for database
 * Handles array of landlords for co-ownership scenarios
 */
export function prepareMultiLandlordsForDB(
  landlords: any[],
  options: {
    isPartial?: boolean;
  } = {}
): {
  landlords: any[];
  policyData?: any;
  error?: string;
} {
  if (!landlords || landlords.length === 0) {
    return {
      landlords: [],
      error: 'No se proporcionaron arrendadores',
    };
  }

  // Validate multi-landlord constraints
  const validation = validateMultiLandlords(landlords);
  if (!validation.valid) {
    return {
      landlords: [],
      error: validation.error,
    };
  }

  const preparedLandlords: any[] = [];
  let consolidatedPolicyData: any = {};

  // Process each landlord
  for (const landlord of landlords) {
    const { landlordData, policyData } = prepareLandlordForDB(landlord, {
      isCompany: Boolean(landlord.isCompany),
      isPartial: options.isPartial,
    });

    preparedLandlords.push(landlordData);

    // Consolidate policy data (should be same for all, take from primary)
    if (policyData && landlord.isPrimary) {
      consolidatedPolicyData = { ...consolidatedPolicyData, ...policyData };
    }
  }

  return {
    landlords: preparedLandlords,
    policyData: Object.keys(consolidatedPolicyData).length > 0
      ? consolidatedPolicyData
      : undefined,
  };
}

/**
 * Prepare property details for database
 * Special handling for property-specific data that goes to PropertyDetails table
 */
export function preparePropertyDetailsForDB(propertyData: any): any {
  if (!propertyData) {
    return undefined;
  }

  let prepared = { ...propertyData };

  // Normalize booleans for property utilities
  const booleanFields = [
    'isFurnished',
    'hasPhone',
    'hasElectricity',
    'hasWater',
    'hasGas',
    'hasCableTV',
    'hasInternet',
    'utilitiesInLandlordName',
    'hasInventory',
    'hasRules',
    'petsAllowed',
  ];

  for (const field of booleanFields) {
    if (prepared[field] === 'true') prepared[field] = true;
    if (prepared[field] === 'false') prepared[field] = false;
  }

  // Normalize numbers
  if (typeof prepared.parkingSpaces === 'string') {
    prepared.parkingSpaces = parseInt(prepared.parkingSpaces, 10) || 0;
  }

  // Process address
  prepared = processAddressFields(prepared);

  // Clean data
  prepared = emptyStringsToNull(prepared);
  prepared = removeUndefined(prepared);

  return prepared;
}