/**
 * Actor Validation Utilities
 * Consolidated validation logic for all actor forms
 */

// Type definitions
export interface PersonData {
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  nationality?: 'MEXICAN' | 'FOREIGN';
  curp?: string;
  rfc?: string;
  passport?: string;
}

export interface CompanyData {
  companyName?: string;
  companyRfc?: string;
  legalRepFirstName?: string;
  legalRepMiddleName?: string;
  legalRepPaternalLastName?: string;
  legalRepMaternalLastName?: string;
  legalRepRfc?: string;
  legalRepEmail?: string;
  legalRepPhone?: string;
}

export interface ContactData {
  email?: string;
  phone?: string;
  workPhone?: string;
  personalEmail?: string;
  workEmail?: string;
}

export interface EmploymentData {
  occupation?: string;
  employerName?: string;
  monthlyIncome?: number;
  employmentStatus?: string;
}

// Validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\d{10}$/,
  curp: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/,
  rfcPerson: /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/,
  rfcCompany: /^[A-Z]{3}\d{6}[A-Z0-9]{3}$/,
};

// Validation messages
export const VALIDATION_MESSAGES = {
  required: 'Este campo es requerido',
  requiredName: 'Nombre es requerido',
  requiredMiddleName: 'Segundo nombre es requerido',
  requiredPaternal: 'Apellido paterno es requerido',
  requiredMaternal: 'Apellido materno es requerido',
  requiredCompany: 'Nombre de empresa es requerido',
  requiredCompanyRFC: 'RFC de empresa es requerido',
  requiredRFC: 'RFC es requerido',
  requiredCURP: 'CURP es requerido para ciudadanos mexicanos',
  requiredPassport: 'Pasaporte es requerido para extranjeros',
  invalidEmail: 'Correo electrónico inválido',
  invalidPhone: 'Teléfono debe tener 10 dígitos',
  invalidCURP: 'CURP inválido',
  invalidRFC: 'RFC inválido',
  invalidRFCPerson: 'RFC de persona física inválido (debe tener 13 caracteres)',
  invalidRFCCompany: 'RFC de empresa inválido (debe tener 12 caracteres)',
  invalidIncome: 'Ingreso mensual debe ser mayor a 0',
  requiredOccupation: 'Ocupación es requerida',
  requiredEmployer: 'Nombre del empleador es requerido',
};

/**
 * Validate person name fields
 */
export const validatePersonName = (
  data: PersonData,
  errors: Record<string, string>,
  isPartial = false
): void => {
  if (!isPartial || data.firstName !== undefined) {
    if (!data.firstName) {
      errors.firstName = VALIDATION_MESSAGES.requiredName;
    }
  }

  if (!isPartial || data.paternalLastName !== undefined) {
    if (!data.paternalLastName) {
      errors.paternalLastName = VALIDATION_MESSAGES.requiredPaternal;
    }
  }

  if (!isPartial || data.maternalLastName !== undefined) {
    if (!data.maternalLastName) {
      errors.maternalLastName = VALIDATION_MESSAGES.requiredMaternal;
    }
  }
};

/**
 * Validate company data
 */
export const validateCompanyData = (
  data: CompanyData,
  errors: Record<string, string>,
  isPartial = false
): void => {
  if (!isPartial || data.companyName !== undefined) {
    if (!data.companyName) {
      errors.companyName = VALIDATION_MESSAGES.requiredCompany;
    }
  }

  if (!isPartial || data.companyRfc !== undefined) {
    if (!data.companyRfc) {
      errors.companyRfc = VALIDATION_MESSAGES.requiredCompanyRFC;
    } else if (!VALIDATION_PATTERNS.rfcCompany.test(data.companyRfc)) {
      errors.companyRfc = VALIDATION_MESSAGES.invalidRFCCompany;
    }
  }

  // Legal representative validation
  if (!isPartial || data.legalRepFirstName !== undefined) {
    if (!data.legalRepFirstName) {
      errors.legalRepFirstName = 'Nombre del representante legal es requerido';
    }
  }

  if (!isPartial || data.legalRepPaternalLastName !== undefined) {
    if (!data.legalRepPaternalLastName) {
      errors.legalRepPaternalLastName = 'Apellido paterno del representante legal es requerido';
    }
  }

  if (!isPartial || data.legalRepMaternalLastName !== undefined) {
    if (!data.legalRepMaternalLastName) {
      errors.legalRepMaternalLastName = 'Apellido materno del representante legal es requerido';
    }
  }

  // Legal rep contact validation
  if (data.legalRepEmail && !VALIDATION_PATTERNS.email.test(data.legalRepEmail)) {
    errors.legalRepEmail = VALIDATION_MESSAGES.invalidEmail;
  }

  if (data.legalRepPhone && !VALIDATION_PATTERNS.phone.test(data.legalRepPhone.replace(/\D/g, ''))) {
    errors.legalRepPhone = VALIDATION_MESSAGES.invalidPhone;
  }
};

/**
 * Validate nationality-based documents (CURP for Mexican, Passport for Foreign)
 */
export const validateNationalityDocuments = (
  data: PersonData,
  errors: Record<string, string>,
  isPartial = false
): void => {
  if (!isPartial && data.nationality === 'MEXICAN') {
    if (!data.curp) {
      errors.curp = VALIDATION_MESSAGES.requiredCURP;
    } else if (!VALIDATION_PATTERNS.curp.test(data.curp)) {
      errors.curp = VALIDATION_MESSAGES.invalidCURP;
    }
  }

  if (!isPartial && data.nationality === 'FOREIGN') {
    if (!data.passport) {
      errors.passport = VALIDATION_MESSAGES.requiredPassport;
    }
  }

  // RFC validation (optional but must be valid if provided)
  if (data.rfc) {
    if (!VALIDATION_PATTERNS.rfcPerson.test(data.rfc)) {
      errors.rfc = VALIDATION_MESSAGES.invalidRFCPerson;
    }
  }
};

/**
 * Validate contact information
 */
export const validateContactInfo = (
  data: ContactData,
  errors: Record<string, string>,
  required = true
): void => {
  // Email validation
  if (required && !data.email) {
    errors.email = 'Correo electrónico es requerido';
  } else if (data.email && !VALIDATION_PATTERNS.email.test(data.email)) {
    errors.email = VALIDATION_MESSAGES.invalidEmail;
  }

  // Phone validation
  if (required && !data.phone) {
    errors.phone = 'Teléfono es requerido';
  } else if (data.phone) {
    const cleanPhone = data.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      errors.phone = VALIDATION_MESSAGES.invalidPhone;
    }
  }

  // Work phone validation (optional)
  if (data.workPhone) {
    const cleanPhone = data.workPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      errors.workPhone = 'Teléfono de trabajo debe tener 10 dígitos';
    }
  }

  // Additional emails validation (optional)
  if (data.personalEmail && !VALIDATION_PATTERNS.email.test(data.personalEmail)) {
    errors.personalEmail = 'Correo personal inválido';
  }

  if (data.workEmail && !VALIDATION_PATTERNS.email.test(data.workEmail)) {
    errors.workEmail = 'Correo de trabajo inválido';
  }
};

/**
 * Validate employment information
 */
export const validateEmploymentInfo = (
  data: EmploymentData,
  errors: Record<string, string>,
  isPartial = false
): void => {
  if (!isPartial || data.occupation !== undefined) {
    if (!data.occupation) {
      errors.occupation = VALIDATION_MESSAGES.requiredOccupation;
    }
  }

  if (!isPartial || data.employerName !== undefined) {
    if (!data.employerName) {
      errors.employerName = VALIDATION_MESSAGES.requiredEmployer;
    }
  }

  if (!isPartial || data.monthlyIncome !== undefined) {
    if (!data.monthlyIncome || data.monthlyIncome <= 0) {
      errors.monthlyIncome = VALIDATION_MESSAGES.invalidIncome;
    }
  }
};

/**
 * Clean phone number (remove non-digit characters)
 */
export const cleanPhone = (phone: string): string => {
  return phone ? phone.replace(/\D/g, '') : '';
};

/**
 * Format RFC (uppercase and remove spaces)
 */
export const formatRFC = (rfc: string): string => {
  return rfc ? rfc.toUpperCase().replace(/\s/g, '') : '';
};

/**
 * Format CURP (uppercase and remove spaces)
 */
export const formatCURP = (curp: string): string => {
  return curp ? curp.toUpperCase().replace(/\s/g, '') : '';
};

/**
 * Validate person fields (alias for validatePersonName for compatibility)
 */
export const validatePersonFields = validatePersonName;

/**
 * Validate financial info
 */
export const validateFinancialInfo = (
  data: any,
  setErrors?: (errors: Record<string, string>) => void | Record<string, string>,
  isPartial = false
): boolean => {
  const localErrors: Record<string, string> = {};

  if (!isPartial) {
    if (!data.monthlyIncome) {
      localErrors.monthlyIncome = 'El ingreso mensual es requerido';
    } else if (isNaN(parseFloat(data.monthlyIncome)) || parseFloat(data.monthlyIncome) <= 0) {
      localErrors.monthlyIncome = 'El ingreso mensual debe ser un número mayor a 0';
    }
  }

  if (setErrors) {
    if (typeof setErrors === 'function') {
      setErrors(localErrors);
    } else {
      Object.assign(setErrors, localErrors);
    }
  }

  return Object.keys(localErrors).length === 0;
};

/**
 * Validate complete actor data (combines all validations)
 */
export const validateActorData = (
  data: any,
  isCompany: boolean,
  isPartial = false
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (isCompany) {
    // Company validation
    validateCompanyData(data, errors, isPartial);
  } else {
    // Person validation
    validatePersonName(data, errors, isPartial);
    validateNationalityDocuments(data, errors, isPartial);
  }

  // Common validations
  validateContactInfo(data, errors, !isPartial);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};