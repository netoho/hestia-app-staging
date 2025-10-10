/**
 * Company-specific validation schemas for actor entities
 */

import { z } from 'zod';
import {
  baseActorSchema,
  partialBaseActorSchema,
  rfcSchema,
  optionalRfcSchema,
  emailSchema,
  phoneSchema,
  optionalEmailSchema,
  requiredString
} from './base.schema';

// Company actor schema (extends base)
export const companyActorSchema = baseActorSchema.extend({
  isCompany: z.literal(true),
  companyName: requiredString(1, 'El nombre de la empresa es requerido'),
  companyRfc: rfcSchema,

  // Legal representative information
  legalRepName: requiredString(1, 'El nombre del representante legal es requerido'),
  legalRepPosition: requiredString(1, 'El cargo del representante es requerido'),
  legalRepRfc: optionalRfcSchema,
  legalRepPhone: phoneSchema,
  legalRepEmail: emailSchema,

  // Additional contact
  workEmail: optionalEmailSchema,
});

// Partial company schema for updates
export const partialCompanyActorSchema = partialBaseActorSchema.extend({
  isCompany: z.literal(true),
  companyName: z.string().optional(),
  companyRfc: z.string().optional(),

  legalRepName: z.string().optional(),
  legalRepPosition: z.string().optional(),
  legalRepRfc: optionalRfcSchema,
  legalRepPhone: z.string().optional(),
  legalRepEmail: z.string().optional(),

  workEmail: optionalEmailSchema,
});

// Create validation function for company data
export function validateCompanyData(data: any) {
  return companyActorSchema.safeParse(data);
}

// Create partial validation function for company data
export function validatePartialCompanyData(data: any) {
  return partialCompanyActorSchema.safeParse(data);
}

// Company with extended info (for specific actor types)
export const extendedCompanySchema = companyActorSchema.extend({
  companyRegistrationNumber: z.string().optional().nullable(),
  companyRegistrationDate: z.string().optional().nullable(),
  notaryNumber: z.string().optional().nullable(),
  notaryName: z.string().optional().nullable(),
  commercialRegistryFolio: z.string().optional().nullable(),
});