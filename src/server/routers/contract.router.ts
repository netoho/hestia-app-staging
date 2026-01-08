import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';

export const contractRouter = createTRPCRouter({
  // Contract procedures will be implemented as needed
  getByPolicy: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input }) => {
      // Placeholder
      return null;
    }),
});