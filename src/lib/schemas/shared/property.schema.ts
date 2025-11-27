/**
 * Shared property validation schemas
 * Used for landlord property details and potentially other property-related entities
 */

import { z } from 'zod';
import { addressSchema, partialAddressSchema } from './address.schema';

/**
 * Property utilities schema
 */
export const propertyUtilitiesSchema = z.object({
  hasElectricity: z.boolean().default(true),
  hasWater: z.boolean().default(true),
  hasGas: z.boolean().default(false),
  hasPhone: z.boolean().default(false),
  hasCableTV: z.boolean().default(false),
  hasInternet: z.boolean().default(false),
  otherServices: z
    .string()
    .transform((val) => val === '' ? null : val)
    .nullable()
    .optional(),
  utilitiesInLandlordName: z.boolean().default(false),
});

/**
 * Rules type enum (matches Prisma RulesType)
 */
export const rulesTypeSchema = z.enum(['CONDOMINIOS', 'CONDOMINOS', 'COLONOS']);

/**
 * Property characteristics schema
 */
export const propertyCharacteristicsSchema = z.object({
  isFurnished: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  hasInventory: z.boolean().default(false),
  hasRules: z.boolean().default(false),
  rulesType: rulesTypeSchema.nullable().optional(),
});

/**
 * Property parking schema
 */
export const propertyParkingSchema = z.object({
  parkingSpaces: z
    .number()
    .int()
    .min(0, 'Número de espacios debe ser 0 o mayor')
    .nullable()
    .optional(),
  parkingNumbers: z
    .string()
    .transform((val) => val === '' ? null : val)
    .nullable()
    .optional(), // Comma-separated parking numbers
});

/**
 * Property dates schema
 */
export const propertyDatesSchema = z.object({
  propertyDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD')
    .nullable()
    .optional(),
  contractSigningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD')
    .nullable()
    .optional(),
  // Structured address for contract signing location
  contractSigningAddressDetails: partialAddressSchema.nullable().optional(),
});

/**
 * Property deed information schema
 */
export const propertyDeedSchema = z.object({
  propertyDeedNumber: z
    .string()
    .transform((val) => val === '' ? null : val)
    .nullable()
    .optional(),
  propertyRegistryFolio: z
    .string()
    .transform((val) => val === '' ? null : val)
    .nullable()
    .optional(),
});

/**
 * Complete property details schema
 */
export const propertyDetailsSchema = z.object({
  // Location
  propertyAddressDetails: addressSchema.nullable().optional(),

  // Combine all property aspects
  ...propertyParkingSchema.shape,
  ...propertyUtilitiesSchema.shape,
  ...propertyCharacteristicsSchema.shape,
  ...propertyDatesSchema.shape,
});

/**
 * Partial property details schema for incremental saves
 */
export const partialPropertyDetailsSchema = propertyDetailsSchema.partial();

/**
 * Strict property details schema - key fields required
 */
export const strictPropertyDetailsSchema = z.object({
  propertyAddressDetails: addressSchema,
  parkingSpaces: z.number().int().min(0),
  isFurnished: z.boolean(),
  hasElectricity: z.boolean(),
  hasWater: z.boolean(),
  hasGas: z.boolean(),
  petsAllowed: z.boolean(),
  propertyDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contractSigningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Property service groups for UI organization
 */
export const propertyServiceGroups = {
  basic: ['hasElectricity', 'hasWater', 'hasGas'] as const,
  communication: ['hasPhone', 'hasInternet', 'hasCableTV'] as const,
  characteristics: ['isFurnished', 'petsAllowed', 'hasInventory', 'hasRules'] as const,
} as const;

/**
 * Helper to validate property data
 */
export function validatePropertyDetails(
  data: unknown,
  mode: 'strict' | 'partial' = 'partial'
) {
  const schema = mode === 'strict' ? strictPropertyDetailsSchema : partialPropertyDetailsSchema;
  return schema.safeParse(data);
}

/**
 * Type exports
 */
export type PropertyDetails = z.infer<typeof propertyDetailsSchema>;
export type PartialPropertyDetails = z.infer<typeof partialPropertyDetailsSchema>;
export type StrictPropertyDetails = z.infer<typeof strictPropertyDetailsSchema>;
export type PropertyUtilities = z.infer<typeof propertyUtilitiesSchema>;
export type PropertyCharacteristics = z.infer<typeof propertyCharacteristicsSchema>;
export type PropertyParking = z.infer<typeof propertyParkingSchema>;
export type PropertyDates = z.infer<typeof propertyDatesSchema>;
export type PropertyDeed = z.infer<typeof propertyDeedSchema>;
export type RulesType = z.infer<typeof rulesTypeSchema>;
