import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';
import { googleMapsService } from '@/lib/services/googleMapsService';

export const addressRouter = createTRPCRouter({
  /**
   * Search for address predictions using Google Places Autocomplete
   */
  autocomplete: publicProcedure
    .input(z.object({
      input: z.string().min(1),
      sessionToken: z.string().optional(),
      country: z.string().default('mx'),
    }))
    .query(async ({ input }) => {
      // Return empty if input is too short (Google requires 3+ chars)
      if (input.input.length < 3) {
        return { results: [] };
      }

      const results = await googleMapsService.searchPlaces(
        input.input,
        input.sessionToken,
        input.country
      );

      return { results };
    }),

  /**
   * Get detailed address information from a Google Place ID
   */
  details: publicProcedure
    .input(z.object({
      placeId: z.string(),
      sessionToken: z.string().optional(),
      interiorNumber: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const address = await googleMapsService.parseGooglePlaceToAddress(
        input.placeId,
        input.sessionToken,
        { interiorNumber: input.interiorNumber }
      );

      return { address };
    }),
});
