/**
 * Shared reference schemas for actors
 * Personal and commercial references
 */

import { z } from 'zod';
import { personNameSchema } from './person.schema';
import { emailSchema, phoneSchema, optionalEmailSchema } from './contact.schema';

/**
 * Personal reference schema
 * Used for individual references (friends, family, etc.)
 */
export const personalReferenceSchema = personNameSchema.extend({
  phone: phoneSchema,
  email: optionalEmailSchema,
  relationship: z.string().min(1, 'Parentesco requerido'),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

/**
 * Commercial reference schema
 * Used for business references
 */
export const commercialReferenceSchema = z.object({
  companyName: z.string().min(1, 'Nombre de empresa requerido'),
  contactFirstName: z.string().min(1, 'Nombre del contacto requerido'),
  contactMiddleName: z.string().optional().nullable(),
  contactPaternalLastName: z.string().min(1, 'Apellido paterno del contacto requerido'),
  contactMaternalLastName: z.string().optional().nullable(),
  phone: phoneSchema,
  email: optionalEmailSchema,
  relationship: z.string().min(1, 'Relación comercial requerida'),
  yearsOfRelationship: z.number().min(0).optional().nullable(),
});

/**
 * Arrays with minimum requirements
 */
export const personalReferencesArraySchema = z
  .array(personalReferenceSchema)
  .min(1, 'Al menos una referencia personal es requerida');

export const commercialReferencesArraySchema = z
  .array(commercialReferenceSchema)
  .min(1, 'Al menos una referencia comercial es requerida');

/**
 * Partial schemas for updates
 */
export const partialPersonalReferenceSchema = personalReferenceSchema.partial();
export const partialCommercialReferenceSchema = commercialReferenceSchema.partial();

/**
 * Type exports
 */
export type PersonalReference = z.infer<typeof personalReferenceSchema>;
export type CommercialReference = z.infer<typeof commercialReferenceSchema>;

/**
 * Helper to validate reference completeness
 */
export function isPersonalReferenceComplete(ref: Partial<PersonalReference>): boolean {
  return !!(
    ref.firstName &&
    ref.paternalLastName &&
    // maternalLastName is optional in schema
    ref.phone &&
    ref.relationship
  );
}

export function isCommercialReferenceComplete(ref: Partial<CommercialReference>): boolean {
  return !!(
    ref.companyName &&
    ref.contactFirstName &&
    ref.contactPaternalLastName &&
    // contactMaternalLastName is optional in schema
    ref.phone &&
    ref.relationship
  );
}

/**
 * Helper to format reference name for display
 */
export function formatReferenceName(ref: Partial<PersonalReference>): string {
  const parts = [
    ref.firstName,
    ref.middleName,
    ref.paternalLastName,
    ref.maternalLastName,
  ].filter(Boolean);

  return parts.join(' ');
}

export function formatCommercialContactName(ref: Partial<CommercialReference>): string {
  const parts = [
    ref.contactFirstName,
    ref.contactMiddleName,
    ref.contactPaternalLastName,
    ref.contactMaternalLastName,
  ].filter(Boolean);

  return parts.join(' ');
}
