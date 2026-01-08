/**
 * Business Configuration Constants
 * Centralized business logic values that should be configurable
 */

/** Tax configuration */
export const TAX_CONFIG = {
  /** IVA rate (16% in Mexico) */
  IVA_RATE: 0.16,
} as const;

/** Premium package tiered percentages for high-value rents */
export const PREMIUM_TIERS = [
  { minRent: 100000, percentage: 42 },
  { minRent: 90000, percentage: 43 },
  { minRent: 80000, percentage: 44 },
  { minRent: 70000, percentage: 45 },
  { minRent: 60000, percentage: 46 },
] as const;

/** Validation requirements */
export const VALIDATION_CONFIG = {
  /** Number of references required for Aval */
  AVAL_REQUIRED_REFERENCES: 3,
  /** Number of references required for Tenant */
  TENANT_REQUIRED_REFERENCES: 3,
} as const;

/** Token configuration */
export const TOKEN_CONFIG = {
  /** Token expiration in days */
  EXPIRATION_DAYS: 1000,
} as const;

/** Locale configuration */
export const LOCALE_CONFIG = {
  /** Default locale for formatting */
  DEFAULT: 'es-MX',
  /** Default currency */
  CURRENCY: 'MXN',
} as const;

/** Combined business config for convenience */
export const BUSINESS_CONFIG = {
  tax: TAX_CONFIG,
  premiumTiers: PREMIUM_TIERS,
  validation: VALIDATION_CONFIG,
  tokens: TOKEN_CONFIG,
  locale: LOCALE_CONFIG,
} as const;
