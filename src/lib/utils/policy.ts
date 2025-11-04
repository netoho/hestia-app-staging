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

/**
 * Checks if a policy number is unique in the database
 * @param policyNumber The policy number to check
 * @returns Promise<boolean> true if unique, false if already exists
 */
export async function checkPolicyNumberUnique(policyNumber: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/policies/check-number?number=${encodeURIComponent(policyNumber)}`);

    if (!response.ok) {
      console.error('Error checking policy number uniqueness');
      return false;
    }

    const data = await response.json();
    return data.isUnique;
  } catch (error) {
    console.error('Error checking policy number:', error);
    return false;
  }
}

/**
 * Validates a policy number (format and uniqueness)
 * @param policyNumber The policy number to validate
 * @returns Promise with validation result
 */
export async function validatePolicyNumber(policyNumber: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // Check format
  if (!validatePolicyNumberFormat(policyNumber)) {
    return {
      isValid: false,
      error: 'Formato inválido. Use: POL-YYYYMMDD-XXX',
    };
  }

  // Check uniqueness
  const isUnique = await checkPolicyNumberUnique(policyNumber);
  if (!isUnique) {
    return {
      isValid: false,
      error: 'Este número de póliza ya existe',
    };
  }

  return { isValid: true };
}