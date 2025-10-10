/**
 * Property details validation schemas (landlord-specific)
 */

import { z } from 'zod';
import {
  addressSchema,
  nullableString,
  optionalMoneyAmountSchema,
  optionalPercentageSchema,
  optionalDateStringSchema
} from '../actors/base.schema';

// Property details schema
export const propertyDetailsSchema = z.object({
  // Location
  propertyAddressDetails: addressSchema.optional().nullable(),

  // Parking
  parkingSpaces: z.number().int().min(0).optional().nullable(),
  parkingNumbers: nullableString(), // Comma-separated parking numbers

  // Property characteristics
  isFurnished: z.boolean().default(false),
  hasPhone: z.boolean().default(false),
  hasElectricity: z.boolean().default(true),
  hasWater: z.boolean().default(true),
  hasGas: z.boolean().default(false),
  hasCableTV: z.boolean().default(false),
  hasInternet: z.boolean().default(false),
  otherServices: nullableString(),
  utilitiesInLandlordName: z.boolean().default(false),

  // Rules and inventory
  hasInventory: z.boolean().default(false),
  hasRules: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),

  // Important dates
  propertyDeliveryDate: optionalDateStringSchema,
  contractSigningDate: optionalDateStringSchema,
  contractSigningLocation: nullableString(),
});

// Partial property details schema for updates
export const partialPropertyDetailsSchema = propertyDetailsSchema.partial();

// Helper function to validate property details
export function validatePropertyDetails(data: any, isPartial: boolean = false) {
  const schema = isPartial ? partialPropertyDetailsSchema : propertyDetailsSchema;
  return schema.safeParse(data);
}

// Property characteristics groups for UI organization
export const propertyServiceGroups = {
  basic: ['hasElectricity', 'hasWater', 'hasGas'],
  communication: ['hasPhone', 'hasInternet', 'hasCableTV'],
  characteristics: ['isFurnished', 'petsAllowed', 'hasInventory', 'hasRules'],
} as const;


// Type exports for property details
export type PropertyDetails = z.infer<typeof propertyDetailsSchema>;
export type PartialPropertyDetails = z.infer<typeof partialPropertyDetailsSchema>;