/**
 * Shared company schemas for all actors
 * Company and legal representative validation
 */

import { z } from 'zod';
import { personNameSchema } from './person.schema';
import { rfcCompanySchema, rfcPersonSchema } from './person.schema';
import { emailSchema, phoneSchema } from './contact.schema';

/**
 * Base company information
 */
export const companyBaseSchema = z.object({
  companyName: z.string().min(1, 'Razón social requerida'),
  companyRfc: rfcCompanySchema,
});

/**
 * Legal representative schema
 */
export const legalRepresentativeSchema = personNameSchema.extend({
  legalRepId: z.string().optional().nullable(), // Can be CURP, passport, etc.
  legalRepPosition: z.string().min(1, 'Cargo del representante requerido'),
  legalRepRfc: rfcPersonSchema,
  legalRepPhone: phoneSchema,
  legalRepEmail: emailSchema,
});

/**
 * Company with legal representative
 */
export const companyWithLegalRepSchema = companyBaseSchema.merge(
  legalRepresentativeSchema
);

/**
 * Company types enum
 */
export const companyTypeSchema = z.enum([
  'SA', // Sociedad Anónima
  'SA_DE_CV', // Sociedad Anónima de Capital Variable
  'SRL', // Sociedad de Responsabilidad Limitada
  'SRL_DE_CV', // Sociedad de Responsabilidad Limitada de Capital Variable
  'SC', // Sociedad Civil
  'OTHER',
]);

/**
 * Extended company information (for more detailed forms)
 */
export const extendedCompanySchema = companyWithLegalRepSchema.extend({
  companyType: companyTypeSchema.optional(),
  businessActivity: z.string().optional().nullable(),
  incorporationDate: z.date().optional().nullable(),
  notaryNumber: z.string().optional().nullable(),
  notaryCity: z.string().optional().nullable(),
  registryFolio: z.string().optional().nullable(),
});

/**
 * Partial schemas for updates
 */
export const partialCompanySchema = companyBaseSchema.partial();
export const partialLegalRepSchema = legalRepresentativeSchema.partial();
export const partialCompanyWithLegalRepSchema = companyWithLegalRepSchema.partial();

/**
 * Type exports
 */
export type CompanyBase = z.infer<typeof companyBaseSchema>;
export type LegalRepresentative = z.infer<typeof legalRepresentativeSchema>;
export type CompanyWithLegalRep = z.infer<typeof companyWithLegalRepSchema>;
export type ExtendedCompany = z.infer<typeof extendedCompanySchema>;
export type CompanyType = z.infer<typeof companyTypeSchema>;

/**
 * Helper to check if company info is complete
 */
export function isCompanyComplete(company: Partial<CompanyWithLegalRep>): boolean {
  return !!(
    company.companyName &&
    company.companyRfc &&
    company.firstName && // Legal rep first name
    company.paternalLastName &&
    company.maternalLastName &&
    company.legalRepPosition &&
    company.legalRepPhone &&
    company.legalRepEmail
  );
}

/**
 * Helper to format legal rep name for display
 */
export function formatLegalRepName(company: Partial<CompanyWithLegalRep>): string {
  const parts = [
    company.firstName,
    company.middleName,
    company.paternalLastName,
    company.maternalLastName,
  ].filter(Boolean);

  return parts.join(' ');
}