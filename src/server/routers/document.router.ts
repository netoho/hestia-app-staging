import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

export const documentRouter = createTRPCRouter({
  // Document procedures will be implemented as needed
  listByPolicy: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input }) => {
      // Placeholder
      return [];
    }),
});