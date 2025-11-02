/**
 * Utility functions for handling Mexican naming conventions
 */

/**
 * Formats a full name from individual parts
 */
export function formatFullName(
  firstName: string,
  paternalLastName: string,
  maternalLastName: string,
  middleName?: string
): string {
  const parts = [
    firstName,
    middleName,
    paternalLastName,
    maternalLastName
  ].filter(Boolean);

  return parts.join(' ').trim();
}

/**
 * Gets initials from name parts
 */
export function getInitials(
  firstName: string,
  paternalLastName: string
): string {
  const firstInitial = firstName ? firstName[0] : '';
  const lastInitial = paternalLastName ? paternalLastName[0] : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

/**
 * Parses a full name string into individual parts (best guess)
 * This is only for migration purposes and may not be 100% accurate
 */
export function parseFullName(fullName: string): {
  firstName: string;
  middleName: string;
  paternalLastName: string;
  maternalLastName: string;
} {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
    };
  }

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      middleName: '',
      paternalLastName: parts[1],
      maternalLastName: '',
    };
  }

  if (parts.length === 3) {
    return {
      firstName: parts[0],
      middleName: '',
      paternalLastName: parts[1],
      maternalLastName: parts[2],
    };
  }

  // 4 or more parts: assume first is firstName, last two are surnames, rest is middle name
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -2).join(' '),
    paternalLastName: parts[parts.length - 2],
    maternalLastName: parts[parts.length - 1],
  };
}

/**
 * Validates that required name fields are present
 */
export function validateNameFields(
  firstName: string,
  paternalLastName: string,
  maternalLastName: string,
  required: boolean = true
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (required) {
    if (!firstName?.trim()) {
      errors.firstName = 'El nombre es requerido';
    }
    if (!paternalLastName?.trim()) {
      errors.paternalLastName = 'El apellido paterno es requerido';
    }
    if (!maternalLastName?.trim()) {
      errors.maternalLastName = 'El apellido materno es requerido';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}