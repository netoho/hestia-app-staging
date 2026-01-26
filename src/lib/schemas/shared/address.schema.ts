/**
 * Shared address schema for all actors
 * Single source of truth for address validation
 */

import { z } from 'zod';

/**
 * Base address schema - matches PropertyAddress table in database
 * Used for all address types: current, employer, previous rental, etc.
 */
export const addressSchema = z.object({
  street: z.string().min(1, 'Calle requerida'),
  exteriorNumber: z.string().min(1, 'Número exterior requerido'),
  interiorNumber: z.string().optional().nullable(),
  neighborhood: z.string().min(1, 'Colonia requerida'),
  municipality: z.string().min(1, 'Municipio requerido'),
  city: z.string().min(1, 'Municipio requerido'),
  state: z.string().min(1, 'Estado requerido'),
  postalCode: z.string().regex(/^\d{5}$/, 'Código postal debe ser de 5 dígitos'),
  country: z.string().default('México'),
});

/**
 * Partial address schema for optional fields or admin updates
 * All fields become optional
 */
export const partialAddressSchema = addressSchema.partial();

/**
 * Address schema for updates - allows null values for clearing
 */
export const addressUpdateSchema = z.object({
  street: z.string().min(1).optional().nullable(),
  exteriorNumber: z.string().min(1).optional().nullable(),
  interiorNumber: z.string().optional().nullable(),
  neighborhood: z.string().min(1).optional().nullable(),
  municipality: z.string().min(1).optional().nullable(),
  city: z.string().min(1).optional().nullable(),
  state: z.string().min(1).optional().nullable(),
  postalCode: z.string().regex(/^\d{5}$/).optional().nullable(),
  country: z.string().optional().nullable(),
});

/**
 * Type exports
 */
export type Address = z.infer<typeof addressSchema>;
export type PartialAddress = z.infer<typeof partialAddressSchema>;
export type AddressUpdate = z.infer<typeof addressUpdateSchema>;

/**
 * Helper to format address as string for display
 */
export function formatAddress(address?: Partial<Address>): string {
  if (!address) {
    return 'Sin dirección';
  }
  const parts = [
    address.street && address.street,
    address.exteriorNumber && `#${address.exteriorNumber}`,
    address.interiorNumber && `Int. ${address.interiorNumber}`,
    address.neighborhood && address.neighborhood,
    address.municipality && address.municipality,
    address.city && address.city,
    address.state && address.state,
    address.postalCode && `C.P. ${address.postalCode}`,
    address.country !== 'México' && address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Helper to check if address is complete
 */
export function isAddressComplete(address: Partial<Address>): boolean {
  return !!(
    address.street &&
    address.exteriorNumber &&
    address.neighborhood &&
    address.municipality &&
    address.city &&
    address.state &&
    address.postalCode
  );
}
