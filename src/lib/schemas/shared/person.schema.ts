/**
 * Shared person name schemas for all actors
 * Implements Mexican 4-field naming convention
 */

import { z } from 'zod';

/**
 * Base person name schema - Mexican naming convention
 * Used for individuals (tenants, avals, joint obligors, etc.)
 */
export const personNameSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido').nullable(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno requerido'),
});

/**
 * Partial person name for optional fields or admin updates
 */
export const partialPersonNameSchema = personNameSchema.partial();

/**
 * Person name for updates - allows null values for clearing
 */
export const personNameUpdateSchema = z.object({
  firstName: z.string().min(1).optional().nullable(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1).optional().nullable(),
  maternalLastName: z.string().min(1).optional().nullable(),
});

/**
 * Nationality options
 */
export const nationalitySchema = z.enum(['MEXICAN', 'FOREIGN'], {
  errorMap: () => ({ message: 'Nacionalidad inválida' }),
});

/**
 * Person with nationality (for tenants and some other actors)
 */
export const personWithNationalitySchema = personNameSchema.extend({
  nationality: nationalitySchema,
});

/**
 * Mexican identification schemas
 */
export const curpSchema = z
  .string()
  .regex(
    /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,
    'CURP debe tener formato válido (18 caracteres)'
  )
  .optional()
  .nullable();

export const rfcPersonSchema = z
  .string()
  .regex(
    /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/,
    'RFC debe tener formato válido (13 caracteres para persona física)'
  )
  .optional()
  .nullable();

export const rfcCompanySchema = z
  .string()
  .regex(
    /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/,
    'RFC debe tener formato válido (12 caracteres para persona moral)'
  );

/**
 * Type exports
 */
export type PersonName = z.infer<typeof personNameSchema>;
export type PersonWithNationality = z.infer<typeof personWithNationalitySchema>;
export type Nationality = z.infer<typeof nationalitySchema>;

/**
 * Helper to format full name
 */
export function formatFullName(person: Partial<PersonName>): string {
  const parts = [
    person.firstName,
    person.middleName,
    person.paternalLastName,
    person.maternalLastName,
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Helper to check if person name is complete
 */
export function isPersonNameComplete(person: Partial<PersonName>): boolean {
  return !!(
    person.firstName &&
    person.paternalLastName &&
    person.maternalLastName
  );
}
