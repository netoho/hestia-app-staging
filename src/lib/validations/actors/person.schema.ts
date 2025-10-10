/**
 * Person-specific validation schemas for actor entities
 */

import { z } from 'zod';
import {
  baseActorSchema,
  partialBaseActorSchema,
  optionalRfcSchema,
  optionalCurpSchema,
  optionalEmailSchema,
  optionalMoneyAmountSchema,
  nullableString
} from './base.schema';

// Person actor schema (extends base)
export const personActorSchema = baseActorSchema.extend({
  isCompany: z.literal(false),
  fullName: z.string().min(1, 'El nombre completo es requerido'),
  rfc: optionalRfcSchema,
  curp: optionalCurpSchema,

  // Employment information
  occupation: nullableString(),
  employerName: nullableString(),
  monthlyIncome: optionalMoneyAmountSchema,

  // Additional contact
  personalEmail: optionalEmailSchema,
  workEmail: optionalEmailSchema,
});

// Partial person schema for updates
export const partialPersonActorSchema = partialBaseActorSchema.extend({
  isCompany: z.literal(false),
  fullName: z.string().optional(),
  rfc: optionalRfcSchema,
  curp: optionalCurpSchema,

  occupation: nullableString(),
  employerName: nullableString(),
  monthlyIncome: optionalMoneyAmountSchema,

  personalEmail: optionalEmailSchema,
  workEmail: optionalEmailSchema,
});

// Person with nationality (for tenants, avals, etc.)
export const personWithNationalitySchema = personActorSchema.extend({
  nationality: z.enum(['MEXICAN', 'FOREIGN']).optional(),
  passport: z.string().optional().nullable().or(z.literal('')),
});

// Validation based on nationality
export const personWithNationalityValidation = z.discriminatedUnion('nationality', [
  personWithNationalitySchema.extend({
    nationality: z.literal('MEXICAN'),
    curp: z.string()
      .length(18, 'CURP debe tener exactamente 18 caracteres')
      .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, 'Formato de CURP inválido'),
    passport: z.string().optional().nullable(),
  }),
  personWithNationalitySchema.extend({
    nationality: z.literal('FOREIGN'),
    passport: z.string().min(1, 'El número de pasaporte es requerido para extranjeros'),
    curp: z.string().optional().nullable(),
  }),
]);

// Create validation function for person data
export function validatePersonData(data: any, requireNationality: boolean = false) {
  if (requireNationality && data.nationality) {
    return personWithNationalityValidation.safeParse(data);
  }
  return personActorSchema.safeParse(data);
}

// Create partial validation function for person data
export function validatePartialPersonData(data: any) {
  return partialPersonActorSchema.safeParse(data);
}