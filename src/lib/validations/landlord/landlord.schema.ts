/**
 * Landlord-specific validation schemas
 */

import { z } from 'zod';
import { personActorSchema, partialPersonActorSchema } from '../actors/person.schema';
import { companyActorSchema, partialCompanyActorSchema } from '../actors/company.schema';
import { nullableString } from '../actors/base.schema';
import { propertyDetailsSchema, partialPropertyDetailsSchema } from './property.schema';

// Landlord-specific fields (added to person/company schemas)
const landlordSpecificFields = {
  propertyDeedNumber: nullableString(),
  propertyRegistryFolio: nullableString(),
  requiresCFDI: z.boolean().default(false),
  cfdiData: nullableString(),
};

// Individual landlord schema
export const individualLandlordSchema = personActorSchema.extend(landlordSpecificFields);

// Company landlord schema
export const companyLandlordSchema = companyActorSchema.extend(landlordSpecificFields);

// Discriminated union for landlord (company or individual)
export const landlordSchema = z.discriminatedUnion('isCompany', [
  individualLandlordSchema,
  companyLandlordSchema,
]);

// Partial schemas for step-by-step validation
export const partialIndividualLandlordSchema = partialPersonActorSchema
  .extend(landlordSpecificFields)
  .extend({
    isCompany: z.literal(false),
  })
  .passthrough();

export const partialCompanyLandlordSchema = partialCompanyActorSchema
  .extend(landlordSpecificFields)
  .extend({
    isCompany: z.literal(true),
  })
  .passthrough();

// Partial landlord schema (for incremental saves)
export const partialLandlordSchema = z.discriminatedUnion('isCompany', [
  partialIndividualLandlordSchema,
  partialCompanyLandlordSchema,
]);

// Request schema for API submissions
export const landlordSubmissionSchema = z.object({
  landlord: landlordSchema,
  propertyDetails: propertyDetailsSchema.optional(),
  partial: z.boolean().optional().default(false),
});

// Partial request schema
export const partialLandlordSubmissionSchema = z.object({
  landlord: partialLandlordSchema,
  propertyDetails: partialPropertyDetailsSchema.optional(),
  partial: z.literal(true),
});

// Helper function to validate landlord data
export function validateLandlordData(data: any, isPartial: boolean = false) {
  const schema = isPartial ? partialLandlordSchema : landlordSchema;
  return schema.safeParse(data);
}

// Helper function to validate submission
export function validateLandlordSubmission(data: any) {
  const isPartialSave = data.partial === true;
  const schema = isPartialSave ? partialLandlordSubmissionSchema : landlordSubmissionSchema;
  return schema.safeParse(data);
}