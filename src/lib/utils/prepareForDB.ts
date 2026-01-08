/**
 * Consolidated data transformation for all actor types
 * Prepares form data for database storage
 */

import {
  emptyStringsToNull,
  removeUndefined,
  normalizeBooleans,
  normalizeNumbers,
} from './dataTransform';

// Re-export base transforms for backwards compatibility
export { emptyStringsToNull, removeUndefined, normalizeBooleans, normalizeNumbers };

// ============================================================================
// Actor Type Configuration
// ============================================================================

export type ActorType = 'landlord' | 'tenant' | 'aval' | 'jointObligor';

interface ActorConfig {
  numberFields: string[];
  addressFields: string[];
  typeField: string;
  typeValues: { individual: string; company: string };
}

const ACTOR_CONFIGS: Record<ActorType, ActorConfig> = {
  landlord: {
    numberFields: ['propertyValue', 'monthlyIncome', 'additionalIncomeAmount', 'parkingSpaces'],
    addressFields: ['addressDetails', 'propertyAddressDetails'],
    typeField: 'isCompany',
    typeValues: { individual: 'false', company: 'true' },
  },
  tenant: {
    numberFields: ['monthlyIncome', 'additionalIncomeAmount', 'previousRentAmount', 'rentalHistoryYears', 'numberOfOccupants', 'yearsAtJob', 'employeeCount', 'yearsInBusiness'],
    addressFields: ['addressDetails', 'employerAddressDetails', 'previousRentalAddressDetails'],
    typeField: 'tenantType',
    typeValues: { individual: 'INDIVIDUAL', company: 'COMPANY' },
  },
  aval: {
    numberFields: ['monthlyIncome', 'propertyValue', 'yearsOfRelationship'],
    addressFields: ['addressDetails', 'employerAddressDetails', 'guaranteePropertyDetails'],
    typeField: 'avalType',
    typeValues: { individual: 'INDIVIDUAL', company: 'COMPANY' },
  },
  jointObligor: {
    numberFields: ['monthlyIncome', 'propertyValue', 'yearsOfRelationship'],
    addressFields: ['addressDetails', 'employerAddressDetails', 'guaranteePropertyDetails'],
    typeField: 'jointObligorType',
    typeValues: { individual: 'INDIVIDUAL', company: 'COMPANY' },
  },
};

// ============================================================================
// Core Transform Functions
// ============================================================================

/**
 * Process all address fields for an actor
 */
export function processAddressFields(
  data: Record<string, unknown>,
  addressFields: string[]
): Record<string, unknown> {
  const result = { ...data };

  for (const field of addressFields) {
    if (data[field] && typeof data[field] === 'object') {
      result[field] = emptyStringsToNull(data[field]);
    }
  }

  return result;
}

/**
 * Map legal rep fields for company actors
 * Moves firstName/lastName to legalRepFirstName/legalRepLastName
 */
export function mapCompanyFields(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };

  if (data.firstName && !data.legalRepFirstName) {
    result.legalRepFirstName = data.firstName;
    result.legalRepMiddleName = data.middleName;
    result.legalRepPaternalLastName = data.paternalLastName;
    result.legalRepMaternalLastName = data.maternalLastName;

    delete result.firstName;
    delete result.middleName;
    delete result.paternalLastName;
    delete result.maternalLastName;
  }

  return result;
}

/**
 * Prepare references for database (Prisma nested create format)
 */
export function prepareReferencesForDB(
  references: unknown[],
  type: 'personal' | 'commercial'
): { create: unknown[] } | undefined {
  if (!references || !Array.isArray(references) || references.length === 0) {
    return undefined;
  }

  const cleaned = references.map(ref => {
    const cleanRef = emptyStringsToNull(removeUndefined(ref as Record<string, unknown>));

    // Map commercial reference fields
    if (type === 'commercial' && cleanRef && typeof cleanRef === 'object') {
      const r = cleanRef as Record<string, unknown>;
      if (!r.contactFirstName && r.firstName) {
        return {
          companyName: r.companyName,
          contactFirstName: r.firstName,
          contactMiddleName: r.middleName,
          contactPaternalLastName: r.paternalLastName,
          contactMaternalLastName: r.maternalLastName,
          phone: r.phone,
          email: r.email,
          relationship: r.relationship,
          yearsOfRelationship: r.yearsOfRelationship,
        };
      }
    }

    return cleanRef;
  });

  return { create: cleaned };
}

// ============================================================================
// Main Prepare Function
// ============================================================================

export interface PrepareOptions {
  actorType: ActorType;
  isCompany: boolean;
  isPartial?: boolean;
  tabName?: string;
  tabFields?: Record<string, string[]>;
}

/**
 * Generic prepare function for all actor types
 *
 * Steps:
 * 1. Filter by tab (if tabName provided)
 * 2. Normalize booleans
 * 3. Normalize numbers (actor-specific fields)
 * 4. Map company fields (if isCompany)
 * 5. Process address fields
 * 6. Convert empty strings to null
 * 7. Remove undefined values
 * 8. Add completion metadata (if not partial)
 */
export function prepareActorForDB<T extends Record<string, unknown>>(
  data: T,
  options: PrepareOptions
): T {
  const config = ACTOR_CONFIGS[options.actorType];
  let prepared = { ...data } as Record<string, unknown>;

  // Step 1: Filter by tab if specified
  if (options.tabName && options.tabFields) {
    const fields = options.tabFields[options.tabName];
    if (fields) {
      const filtered: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in prepared) {
          filtered[field] = prepared[field];
        }
      }
      // Always preserve address objects for their tabs
      for (const addressField of config.addressFields) {
        if (prepared[addressField]) {
          filtered[addressField] = prepared[addressField];
        }
      }
      // Preserve references
      if (prepared.personalReferences) filtered.personalReferences = prepared.personalReferences;
      if (prepared.commercialReferences) filtered.commercialReferences = prepared.commercialReferences;
      prepared = filtered;
    }
  }

  // Step 2: Normalize booleans
  prepared = normalizeBooleans(prepared);

  // Step 3: Normalize numbers (actor-specific)
  prepared = normalizeNumbers(prepared, config.numberFields);

  // Step 4: Map company fields
  if (options.isCompany) {
    prepared = mapCompanyFields(prepared);
  }

  // Step 5: Set actor type field
  prepared[config.typeField] = options.isCompany
    ? config.typeValues.company
    : config.typeValues.individual;

  // Special case: landlord uses boolean isCompany
  if (options.actorType === 'landlord') {
    prepared.isCompany = options.isCompany;
  }

  // Step 6: Process address fields
  prepared = processAddressFields(prepared, config.addressFields);

  // Step 7: Convert empty strings to null
  prepared = emptyStringsToNull(prepared);

  // Step 8: Remove undefined values
  prepared = removeUndefined(prepared);

  // Step 9: Add completion metadata if not partial
  if (!options.isPartial) {
    prepared.informationComplete = true;
    prepared.completedAt = new Date();
  }

  return prepared as T;
}

// ============================================================================
// Actor-Specific Helpers (for backwards compatibility and special cases)
// ============================================================================

/**
 * Extract policy fields from landlord data
 * Some financial fields are stored on Policy, not Landlord
 */
export function extractPolicyFields(data: Record<string, unknown>): {
  actorData: Record<string, unknown>;
  policyData: Record<string, unknown>;
} {
  const policyFieldNames = [
    'hasIVA',
    'issuesTaxReceipts',
    'securityDeposit',
    'maintenanceFee',
    'rentIncreasePercentage',
    'paymentMethod',
  ];

  const actorData = { ...data };
  const policyData: Record<string, unknown> = {};

  for (const field of policyFieldNames) {
    if (field in actorData) {
      policyData[field] = actorData[field];
      delete actorData[field];
    }
  }

  return { actorData, policyData };
}

/**
 * Validate multi-landlord constraints
 */
export function validateMultiLandlords(landlords: Array<{ isPrimary?: boolean }>): {
  valid: boolean;
  error?: string;
} {
  const primaryCount = landlords.filter(l => l.isPrimary).length;

  if (primaryCount === 0) {
    return { valid: false, error: 'At least one landlord must be primary' };
  }

  if (primaryCount > 1) {
    return { valid: false, error: 'Only one primary landlord allowed' };
  }

  return { valid: true };
}

/**
 * Ensure Aval-specific requirements
 * Aval ALWAYS requires property guarantee
 */
export function enforceAvalRequirements(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    hasPropertyGuarantee: true,
    guaranteeMethod: 'property',
  };
}
