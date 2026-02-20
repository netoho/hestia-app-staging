/**
 * Policy utility functions
 * Handles policy number generation, validation, and progress calculation
 */

// ============================================================================
// Policy Number Functions
// ============================================================================

/**
 * Generates a policy number in the format: POL-YYYYMMDD-XXX
 */
export function generatePolicyNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const localDate = `${year}${month}${day}`;
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `POL-${localDate}-${random}`;
}

/**
 * Validates the format of a policy number
 * Expected format: POL-YYYYMMDD-XXX (where XXX is alphanumeric)
 */
export function validatePolicyNumberFormat(policyNumber: string): boolean {
  const regex = /^POL-\d{8}-[A-Z0-9]{3}$/;
  return regex.test(policyNumber);
}

// ============================================================================
// Policy Progress Functions
// ============================================================================

interface PolicyActor {
  informationComplete: boolean;
}

interface PolicyProgress {
  completedActors: number;
  totalActors: number;
  percentage: number;
}

interface PolicyForProgress {
  landlords?: PolicyActor[];
  tenant?: PolicyActor | null;
  jointObligors?: PolicyActor[];
  avals?: PolicyActor[];
  guarantorType?: string;
}

/**
 * Calculate policy completion progress
 * Counts how many actors have completed their information
 */
export function calculatePolicyProgress(policy: PolicyForProgress): PolicyProgress {
  let completedActors = 0;
  let totalActors = 0;

  // Count landlords (at least 1 required)
  const landlordCount = policy.landlords?.length || 1;
  totalActors += landlordCount;
  completedActors += policy.landlords?.filter(l => l.informationComplete).length || 0;

  // Count tenant (always required)
  if (policy.tenant) {
    totalActors++;
    if (policy.tenant.informationComplete) completedActors++;
  } else {
    totalActors++; // Tenant slot required
  }

  // Count joint obligors (if applicable)
  if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
    const joCount = policy.jointObligors?.length || 0;
    totalActors += joCount || 1; // At least 1 required
    completedActors += policy.jointObligors?.filter(jo => jo.informationComplete).length || 0;
  }

  // Count avals (if applicable)
  if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
    const avalCount = policy.avals?.length || 0;
    totalActors += avalCount || 1; // At least 1 required
    completedActors += policy.avals?.filter(a => a.informationComplete).length || 0;
  }

  const percentage = totalActors > 0 ? Math.round((completedActors / totalActors) * 100) : 0;

  return {
    completedActors,
    totalActors,
    percentage,
  };
}

// ============================================================================
// Landlord Helpers
// ============================================================================

/**
 * Get the primary landlord from a policy
 * Returns the landlord marked as primary, or the first one if none marked
 */
export function getPrimaryLandlord<T extends { isPrimary?: boolean }>(landlords?: T[]): T | undefined {
  if (!landlords || landlords.length === 0) return undefined;
  return landlords.find(l => l.isPrimary) || landlords[0];
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get display name for actor (person or company)
 */
export function getActorDisplayName(actor: {
  firstName?: string | null;
  middleName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  companyName?: string | null;
}): string {
  if (actor.companyName) {
    return actor.companyName;
  }

  if (actor.firstName && actor.paternalLastName) {
    const nameParts = [
      actor.firstName,
      actor.middleName,
      actor.paternalLastName,
      actor.maternalLastName
    ].filter(Boolean);
    return nameParts.join(' ');
  }

  return 'Sin nombre';
}
