import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { getDashboardStats, getRecentPolicies } from '@/lib/services/policyService/stats';
import { brokerScopeWhere } from '@/lib/services/policyService/scope';
import {
  DashboardStatsOutput,
  DashboardRecentPoliciesOutput,
} from '@/lib/schemas/dashboard/output';

/**
 * Dashboard data — KPI counts and recent activity for the landing page.
 *
 * Brokers see only policies they manage (`managedById = userId`); admin/staff
 * see global counts. Scoping uses `brokerScopeWhere` so all broker-scoped
 * queries stay aligned across routers.
 */
export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure
    .output(DashboardStatsOutput)
    .query(async ({ ctx }) => {
      const scope = brokerScopeWhere(ctx.userRole, ctx.userId);
      return getDashboardStats(scope);
    }),

  getRecentPolicies: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(20).optional() }).optional())
    .output(DashboardRecentPoliciesOutput)
    .query(async ({ ctx, input }) => {
      const scope = {
        limit: input?.limit ?? 5,
        ...brokerScopeWhere(ctx.userRole, ctx.userId),
      };
      const policies = await getRecentPolicies(scope);
      return { policies };
    }),
});
