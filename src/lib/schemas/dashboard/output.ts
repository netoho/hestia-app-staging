/**
 * Output schemas for dashboard.* tRPC procedures.
 *
 * Mirrors the service shape from `src/lib/services/policyService/stats.ts`.
 * Drop or rename a field there → integration test fails here.
 */

import { z } from 'zod';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

// ===========================================================================
// dashboard.getStats
// ===========================================================================
export const DashboardStatsOutput = z.object({
  active: z.number().int().nonnegative(),
  pendingApproval: z.number().int().nonnegative(),
  inProcess: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
});
export type DashboardStatsOutput = z.infer<typeof DashboardStatsOutput>;

// ===========================================================================
// dashboard.getRecentPolicies
// ===========================================================================
const RecentPolicyTenantShape = z.object({
  firstName: z.string().nullable(),
  paternalLastName: z.string().nullable(),
  maternalLastName: z.string().nullable(),
  companyName: z.string().nullable(),
});

const RecentPolicyShape = z.object({
  id: z.string(),
  policyNumber: z.string(),
  rentAmount: z.number(),
  status: z.nativeEnum(PolicyStatus),
  updatedAt: z.date(),
  // Transition contract (S5b #169): plural `tenants` is canonical; the
  // legacy singular `tenant` (first tenant) survives until consumers migrate.
  tenants: z.array(RecentPolicyTenantShape),
  tenant: RecentPolicyTenantShape.nullable(),
});

export const DashboardRecentPoliciesOutput = z.object({
  policies: z.array(RecentPolicyShape),
});
export type DashboardRecentPoliciesOutput = z.infer<typeof DashboardRecentPoliciesOutput>;
