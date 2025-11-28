/**
 * Common validation utilities used across all actor forms
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validate phone number (10 digits)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  // Remove any non-digit characters and check length
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10;
}

/**
 * Validate CURP format (Mexican personal ID)
 * CURP: 18 characters (4 letters, 6 digits, 6 letters, 2 alphanumeric)
 */
export function validateCURP(curp: string): boolean {
  if (!curp) return false;
  const curpPattern = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
  return curpPattern.test(curp.toUpperCase());
}

/**
 * Validate RFC format (Mexican tax ID)
 * Person: 13 characters (4 letters, 6 digits, 3 alphanumeric)
 * Company: 12 characters (3 letters, 6 digits, 3 alphanumeric)
 */
export function validateRFC(rfc: string, isCompany: boolean = false): boolean {
  if (!rfc) return false;
  const rfcUpper = rfc.toUpperCase();

  if (isCompany) {
    // Company RFC: 12 characters
    const companyPattern = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/;
    return companyPattern.test(rfcUpper);
  } else {
    // Person RFC: 13 characters
    const personPattern = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/;
    return personPattern.test(rfcUpper);
  }
}

/**
 * Validate required field
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number): boolean {
  if (!value) return false;
  return value.trim().length >= minLength;
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number): boolean {
  if (!value) return true; // Empty is valid for max length
  return value.length <= maxLength;
}

/**
 * Validate numeric value
 */
export function validateNumeric(value: string | number): boolean {
  if (value === '' || value === null || value === undefined) return false;
  return !isNaN(Number(value));
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: string | number): boolean {
  if (!validateNumeric(value)) return false;
  return Number(value) > 0;
}

/**
 * Create a validation error message
 */
export function createValidationError(field: string, message: string): string {
  return `${field}: ${message}`;
}

/**
 * Common validation messages
 */
export const VALIDATION_MESSAGES = {
  required: 'Este campo es requerido',
  invalidEmail: 'El correo electrónico no es válido',
  invalidPhone: 'El teléfono debe tener 10 dígitos',
  invalidCURP: 'El CURP no tiene el formato correcto',
  invalidRFC: 'El RFC no tiene el formato correcto',
  minLength: (min: number) => `Debe tener al menos ${min} caracteres`,
  maxLength: (max: number) => `No puede exceder ${max} caracteres`,
  invalidNumber: 'Debe ser un número válido',
  positiveNumber: 'Debe ser un número positivo'
};