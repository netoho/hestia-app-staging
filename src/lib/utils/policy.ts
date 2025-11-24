/**
 * Utility functions for policy management
 */

/**
 * Generates a policy number in the format: POL-YYYYMMDD-XXX
 * @returns A new policy number
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
 * @param policyNumber The policy number to validate
 * @returns true if valid, false otherwise
 */
export function validatePolicyNumberFormat(policyNumber: string): boolean {
  // Format: POL-YYYYMMDD-XXX
  const regex = /^POL-\d{8}-[A-Z0-9]{3}$/;
  return regex.test(policyNumber);
}
