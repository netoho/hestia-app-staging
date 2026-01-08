/**
 * Shared contact information schemas for all actors
 * Single source of truth for email and phone validation
 */

import { z } from 'zod';
import { optional } from '../helpers';

/**
 * Email validation with custom message
 */
export const emailSchema = z
  .string()
  .email('Email inválido')
  .min(1, 'Email requerido');

export const optionalEmailSchema = optional(z
  .string()
  .email('Email inválido')
  .optional()
  .nullable()
);

/**
 * Phone validation - Mexican format
 * Accepts: 10 digits, with or without country code
 */
export const phoneSchema = z
  .string()
  .min(1, 'Teléfono requerido')
  .regex(
    /^(\+?52)?[\s-]?(\d{2,4})[\s-]?(\d{3,4})[\s-]?(\d{4})$/,
    'Formato de teléfono inválido'
  )
  .transform((val) => val.replace(/[\s-]/g, '')); // Remove spaces and dashes

export const optionalPhoneSchema = optional(z
  .string()
  .regex(
    /^(\+?52)?[\s-]?(\d{2,4})[\s-]?(\d{3,4})[\s-]?(\d{4})$/,
    'Formato de teléfono inválido'
  )
  .transform((val) => val.replace(/[\s-]/g, ''))
  .optional()
  .nullable()
);

/**
 * Basic contact information
 */
export const contactSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
});

/**
 * Extended contact information with work/personal variants
 */
export const extendedContactSchema = contactSchema.extend({
  personalEmail: optionalEmailSchema,
  workEmail: optionalEmailSchema,
  workPhone: optionalPhoneSchema,
});

/**
 * Partial contact for optional fields or admin updates
 */
export const partialContactSchema = contactSchema.partial();
export const partialExtendedContactSchema = extendedContactSchema.partial();

/**
 * Contact for updates - allows null values for clearing
 */
export const contactUpdateSchema = z.object({
  email: emailSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  personalEmail: optionalEmailSchema,
  workEmail: optionalEmailSchema,
  workPhone: optionalPhoneSchema,
});

/**
 * Type exports
 */
export type Contact = z.infer<typeof contactSchema>;
export type ExtendedContact = z.infer<typeof extendedContactSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;

/**
 * Helper to validate email format without throwing
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to validate phone format without throwing
 */
export function isValidPhone(phone: string): boolean {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to format phone for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');

  // If it has country code
  if (cleaned.startsWith('+52') || cleaned.startsWith('52')) {
    const withoutCode = cleaned.replace(/^\+?52/, '');
    if (withoutCode.length === 10) {
      return `+52 ${withoutCode.slice(0, 2)} ${withoutCode.slice(2, 6)} ${withoutCode.slice(6)}`;
    }
  }

  // Local format
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return phone; // Return as-is if format is unknown
}
