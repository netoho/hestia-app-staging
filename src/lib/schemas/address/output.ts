/**
 * Output schemas for address.* tRPC procedures.
 *
 * Both procedures wrap googleMapsService — autocomplete returns place
 * predictions, details returns a parsed Mexican-format address. Both are
 * mocked at preload (the service makes outbound HTTP calls to Google
 * Places).
 */

import { z } from 'zod';

const GooglePlaceResultShape = z.object({
  placeId: z.string(),
  description: z.string(),
  mainText: z.string(),
  secondaryText: z.string(),
  types: z.array(z.string()),
});

const ParsedAddressShape = z
  .object({
    street: z.string(),
    exteriorNumber: z.string(),
    interiorNumber: z.string().optional(),
    neighborhood: z.string(),
    postalCode: z.string(),
    municipality: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    placeId: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    formattedAddress: z.string().optional(),
  })
  .passthrough();

// ===========================================================================
// address.autocomplete
// ===========================================================================
export const AddressAutocompleteOutput = z.object({
  results: z.array(GooglePlaceResultShape),
});
export type AddressAutocompleteOutput = z.infer<typeof AddressAutocompleteOutput>;

// ===========================================================================
// address.details
// ===========================================================================
export const AddressDetailsOutput = z.object({
  address: ParsedAddressShape,
});
export type AddressDetailsOutput = z.infer<typeof AddressDetailsOutput>;
