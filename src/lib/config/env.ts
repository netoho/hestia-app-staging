/**
 * Centralized environment variable validation
 * Throws immediately if required env vars are missing (no silent fallbacks)
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Server-side environment variables
 * Validated on first access - throws if missing
 */
export const env = {
  // Auth
  get JWT_SECRET() { return requireEnv('JWT_SECRET'); },
  get NEXTAUTH_SECRET() { return requireEnv('NEXTAUTH_SECRET'); },
  get NEXTAUTH_URL() { return requireEnv('NEXTAUTH_URL'); },

  // Database
  get DATABASE_URL() { return requireEnv('DATABASE_URL'); },

  // Stripe
  get STRIPE_SECRET_KEY() { return requireEnv('STRIPE_SECRET_KEY'); },
  get STRIPE_WEBHOOK_SECRET() { return requireEnv('STRIPE_WEBHOOK_SECRET'); },

  // Optional (no throw)
  get STRIPE_TAX_RATE_ID() { return process.env.STRIPE_TAX_RATE_ID; },
  get CRON_SECRET() { return process.env.CRON_SECRET; },
} as const;

/**
 * Client-side environment variables (NEXT_PUBLIC_*)
 * These must be available at build time
 */
export const publicEnv = {
  get APP_URL() { return requireEnv('NEXT_PUBLIC_APP_URL'); },
  get STRIPE_PUBLISHABLE_KEY() { return requireEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'); },
  get WHATSAPP_NUMBER() { return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER; },
} as const;

/**
 * Helper to get APP_URL with localhost fallback for development only
 * Use this when you need a fallback (e.g., email templates during dev)
 */
export function getAppUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  return requireEnv('NEXT_PUBLIC_APP_URL');
}
