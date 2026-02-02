/**
 * Payment-related configuration constants.
 * Centralized to avoid inconsistent validation across endpoints.
 */
export const PAYMENT_LIMITS = {
  /** Maximum subtotal in MXN (so total with IVA stays under 1M) */
  MAX_SUBTOTAL: 862069,
  /** Maximum total in MXN (Stripe limit consideration) */
  MAX_TOTAL: 1000000,
  /** Minimum subtotal in MXN */
  MIN_SUBTOTAL: 1,
};

export const PAYMENT_SESSION_CONFIG = {
  /** Checkout session expiry in seconds (24 hours) */
  SESSION_EXPIRY_SECONDS: 86400,
  /** Warning threshold before expiry in hours */
  EXPIRY_WARNING_HOURS: 6,
  /** Critical threshold before expiry in hours */
  EXPIRY_CRITICAL_HOURS: 1,
};

// Note: PAYMENT_TYPE_LABELS is in @/lib/constants/paymentConfig.ts
