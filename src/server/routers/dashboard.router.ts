import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { getDashboardStats, getRecentPolicies } from '@/lib/services/policyService/stats';
import {
  DashboardStatsOutput,
  DashboardRecentPoliciesOutput,
} from '@/lib/schemas/dashboard/output';

/**
 * Dashboard data — KPI counts and recent activity for the landing page.
 *
 * Brokers see only their own policies; admin/staff see global counts.
 * Scoping is applied here based on `ctx.userRole` so the router contract
 * is identical for every caller — the data they get back is filtered.
 */
export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure
    .output(DashboardStatsOutput)
    .query(async ({ ctx }) => {
      const scope = ctx.userRole === 'BROKER' ? { createdById: ctx.userId } : {};
      return getDashboardStats(scope);
    }),

  getRecentPolicies: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(20).optional() }).optional())
    .output(DashboardRecentPoliciesOutput)
    .query(async ({ ctx, input }) => {
      const scope = {
        limit: input?.limit ?? 5,
        ...(ctx.userRole === 'BROKER' ? { createdById: ctx.userId } : {}),
      };
      const policies = await getRecentPolicies(scope);
      return { policies };
    }),
});
