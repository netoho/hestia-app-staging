import { randomBytes } from 'crypto';

/**
 * Generates a secure random token for policy access
 * @returns A URL-safe token string
 */
export const generateSecureToken = (): string => {
  return randomBytes(32).toString('base64url');
};

/**
 * Generates the public URL for a tenant to access their policy
 * @param token The policy access token
 * @param baseUrl The base URL of the application
 * @returns The complete URL for tenant access
 */
export const generatePolicyUrl = (token: string, baseUrl: string): string => {
  return `${baseUrl}/policy/${token}`;
};

/**
 * Validates if a token has expired
 * @param expiryDate The expiry date of the token
 * @returns True if the token has expired
 */
export const isTokenExpired = (expiryDate: Date): boolean => {
  return new Date() > expiryDate;
};

/**
 * Generates a new expiry date for a token
 * @param daysValid Number of days the token should be valid (default: 7)
 * @returns The expiry date
 */
export const generateTokenExpiry = (daysValid: number = 7): Date => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + daysValid);
  return expiry;
};