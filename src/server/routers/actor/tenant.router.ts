import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { TenantService } from '@/lib/services/actors/TenantService';
import {
  ActorAddTenantOutput,
  ActorRemoveTenantOutput,
} from '@/lib/schemas/actor/output';
import { logPolicyActivity } from '@/lib/services/policyService';

// ============================================
// TENANT-SPECIFIC ROUTER (S5b #169 — 1..N tenants per policy)
// ============================================

export const tenantRouter = createTRPCRouter({
  /**
   * Admin-only: create an empty co-tenant on the policy (mirrors
   * landlord addCoOwner, #189). The new tenant completes their own
   * record through their own portal link. Pre-ACTIVE only.
   */
  addTenant: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .output(ActorAddTenantOutput)
    .mutation(async ({ input, ctx }) => {
      const service = new TenantService();
      const result = await service.addTenant(input.policyId);

      if (!result.ok) {
        throw new TRPCError({
          code: result.error?.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
          message: result.error?.message || 'Failed to add tenant',
        });
      }

      await logPolicyActivity({
        policyId: input.policyId,
        action: 'tenant_added',
        description: 'Coinquilino agregado',
        details: { tenantId: result.value.id },
        performedById: ctx.session?.user?.id ?? undefined,
      });

      return result.value;
    }),

  /**
   * Admin-only: remove a tenant from the policy. Pre-ACTIVE only and
   * never the last tenant. The tenant is archived to TenantHistory
   * (summary + snapshot) before deletion — not a hard delete.
   */
  removeTenant: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      reason: z.string().optional(),
    }))
    .output(ActorRemoveTenantOutput)
    .mutation(async ({ input, ctx }) => {
      const service = new TenantService();

      // Snapshot identity BEFORE deletion so the activity trail names who
      // was removed (#183 — removal used to leave no audit trace).
      const existing = await service.getById(input.tenantId);
      const removedName = existing.ok
        ? existing.value.companyName ||
          `${existing.value.firstName ?? ''} ${existing.value.paternalLastName ?? ''}`.trim() ||
          input.tenantId
        : input.tenantId;
      const policyId = existing.ok ? existing.value.policyId : null;

      const result = await service.removeTenant(input.tenantId, {
        removedById: ctx.userId,
        reason: input.reason,
      });

      if (!result.ok) {
        throw new TRPCError({
          code: result.error?.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
          message: result.error?.message || 'Failed to remove tenant',
        });
      }

      if (policyId) {
        await logPolicyActivity({
          policyId,
          action: 'tenant_removed',
          description: `Inquilino eliminado: ${removedName}`,
          details: { tenantId: input.tenantId, name: removedName },
          performedById: ctx.session?.user?.id ?? undefined,
        });
      }

      return { success: true };
    }),
});
