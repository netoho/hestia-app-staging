import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  dualAuthProcedure,
} from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { TenantService } from '@/lib/services/actors/TenantService';
import { LandlordService } from '@/lib/services/actors/LandlordService';
import { AvalService } from '@/lib/services/actors/AvalService';
import { JointObligorService } from '@/lib/services/actors/JointObligorService';
import { ActorAuthService } from '@/lib/services/ActorAuthService';
import { TenantType } from "@/prisma/generated/prisma-client/enums";
import { getTabFields } from '@/lib/constants/actorTabFields';

// Import master schemas
import {
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
} from '@/lib/schemas/tenant';
import {
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
} from '@/lib/schemas/landlord';
import {
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
} from '@/lib/schemas/aval';
import {
  jointObligorIndividualIncomeCompleteSchema,
  jointObligorIndividualPropertyCompleteSchema,
  jointObligorCompanyIncomeCompleteSchema,
  jointObligorCompanyPropertyCompleteSchema,
} from '@/lib/schemas/joint-obligor';
import { personNameSchema } from '@/lib/schemas/shared/person.schema';
import { partialAddressSchema } from '@/lib/schemas/shared/address.schema';
import { logPolicyActivity } from '@/lib/services/policyService';

// Import ActorData for type casting
import { ActorData } from '@/lib/types/actor';

// ============================================
// SHARED SCHEMAS & UTILITIES
// ============================================

// Actor types enum
export const ActorTypeSchema = z.enum(['tenant', 'landlord', 'aval', 'jointObligor']);

// Define which tab is the last one for each actor type
export const LAST_TABS = {
  tenant: 'documents',
  landlord: 'documents',
  aval: 'documents',
  jointObligor: 'documents',
} as const;

// Base person schema (Mexican 4-field naming)
const PersonSchema = personNameSchema;

// Strict schemas for self-service validation
export const TenantStrictSchema = z.union([
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
]);

export const LandlordStrictSchema = z.union([
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
]);

export const AvalStrictSchema = z.union([
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
]);

export const JointObligorStrictSchema = z.union([
  jointObligorIndividualIncomeCompleteSchema,
  jointObligorIndividualPropertyCompleteSchema,
  jointObligorCompanyIncomeCompleteSchema,
  jointObligorCompanyPropertyCompleteSchema,
]);

// Admin schemas - flexible updates with proper typing
export const ActorAdminUpdateSchema = z.object({
  // Person fields
  firstName: z.string().optional(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().optional(),
  maternalLastName: z.string().optional().nullable(),

  // Company fields
  isCompany: z.boolean().optional().nullable(),
  legalRepPosition: z.string().optional(),
  legalRepFirstName: z.string().optional(),
  legalRepMaternalLastName: z.string().optional(),
  legalRepMiddleName: z.string().optional(),
  legalRepPaternalLastName: z.string().optional(),
  legalRepRfc: z.string().optional(),
  companyName: z.string().optional().nullable(),
  companyRfc: z.string().optional().nullable(),
  legalRepEmail: z.string().email().optional(),
  legalRepPhone: z.string().optional(),

  // Contact
  email: z.string().email().optional(),
  phone: z.string().optional(),
  workPhone: z.string().optional().nullable(),
  personalEmail: z.string().email().optional().nullable(),
  workEmail: z.string().email().optional().nullable(),

  // Address
  address: z.string().optional(),
  addressDetails: partialAddressSchema.optional(),

  // Financial
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().optional().nullable(),

  // Additional
  additionalInfo: z.string().optional().nullable(),

  // Metadata flags
  partial: z.boolean().optional(),
  informationComplete: z.boolean().optional(),
  tabName: z.string().optional(),
});

// Service factory
export function getActorService(type: z.infer<typeof ActorTypeSchema>): TenantService | LandlordService | AvalService | JointObligorService {
  switch (type) {
    case 'tenant':
      return new TenantService();
    case 'landlord':
      return new LandlordService();
    case 'aval':
      return new AvalService();
    case 'jointObligor':
      return new JointObligorService();
    default:
      const exhaustiveCheck: never = type;
      throw new Error(`Unknown actor type: ${exhaustiveCheck}`);
  }
}

// ============================================
// SHARED ACTOR ROUTER
// ============================================

export const sharedActorRouter = createTRPCRouter({
  /**
   * Get actor by token (self-service portal)
   */
  getByToken: publicProcedure
    .input(z.object({
      token: z.string(),
      type: ActorTypeSchema,
    }))
    .query(async ({ input, ctx }) => {
      const service = getActorService(input.type);
      const result = await service.getByToken(input.token);

      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error?.message || 'Actor not found',
        });
      }

      return {
        data: result.value,
        policy: result.value.policy,
        authType: 'actor',
        canEdit: !result.value.informationComplete
      };
    }),

  /**
   * Get actor by token (self-service portal)
   */
  getManyByToken: publicProcedure
    .input(z.object({
      token: z.string(),
      type: ActorTypeSchema,
    }))
    .query(async ({ input, ctx }) => {

      if (input.type !== 'landlord') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Only landlords support multiple records',
        });
      }

      const service: LandlordService = getActorService(input.type) as LandlordService;
      const result = await service.getManyByToken(input.token);

      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error?.message || 'Actor not found',
        });
      }

      return {
        data: result.value,
        policy: result.value.length > 0 ? result.value[0].policy : null,
        authType: 'actor',
        canEdit: !result.value.some(l => l.informationComplete)
      };
    }),

  /**
   * Update actor via token (strict validation for self-service)
   */
  updateSelf: publicProcedure
    .input(z.discriminatedUnion('type', [
      z.object({
        type: z.literal('tenant'),
        token: z.string(),
        data: TenantStrictSchema,
      }),
      z.object({
        type: z.literal('landlord'),
        token: z.string(),
        data: LandlordStrictSchema,
      }),
      z.object({
        type: z.literal('aval'),
        token: z.string(),
        data: AvalStrictSchema,
      }),
      z.object({
        type: z.literal('jointObligor'),
        token: z.string(),
        data: JointObligorStrictSchema,
      }),
    ]))
    .mutation(async ({ input }) => {
      const service = getActorService(input.type);

      const actor = await service.getByToken(input.token);
      if (!actor.ok) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        });
      }

      const result = await service.update(actor.value.id, input.data as Partial<ActorData>, {
        skipValidation: false,
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Validation failed',
        });
      }

      return result.value;
    }),

  /**
   * Admin update (flexible validation)
   */
  updateByAdmin: adminProcedure
    .input(z.object({
      type: ActorTypeSchema,
      id: z.string(),
      data: ActorAdminUpdateSchema,
      skipValidation: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = getActorService(input.type);

      const result = await service.update(input.id, input.data as unknown as Partial<ActorData>, {
        skipValidation: input.skipValidation,
        updatedById: ctx.userId,
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Update failed',
        });
      }

      return result.value;
    }),

  /**
   * Get actor by ID (admin only)
   */
  getById: protectedProcedure
    .input(z.object({
      type: ActorTypeSchema,
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const service = getActorService(input.type);
      const result = await service.getById(input.id);

      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error?.message || 'Actor not found',
        });
      }

      if (ctx.userRole === 'BROKER') {
        // Brokers can only see actors from their policies
      }

      return result.value;
    }),

  /**
   * List actors by policy
   */
  listByPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      type: ActorTypeSchema.optional(),
    }))
    .query(async ({ input, ctx }) => {
      const results = [];

      if (!input.type || input.type === 'tenant') {
        const service = new TenantService();
        const tenant = await service.getByPolicyId(input.policyId);
        if (tenant.ok && tenant.value) {
          results.push({ type: 'tenant', actor: tenant.value });
        }
      }

      if (!input.type || input.type === 'landlord') {
        const service = new LandlordService();
        const landlords = await service.getAllByPolicyId(input.policyId);
        if (landlords.ok && landlords.value) {
          landlords.value.forEach(landlord => {
            results.push({ type: 'landlord', actor: landlord });
          });
        }
      }

      if (!input.type || input.type === 'aval') {
        const service = new AvalService();
        const avals = await service.getAllByPolicyId(input.policyId);
        if (avals.ok && avals.value) {
          avals.value.forEach(aval => {
            results.push({ type: 'aval', actor: aval });
          });
        }
      }

      if (!input.type || input.type === 'jointObligor') {
        const service = new JointObligorService();
        const jos = await service.getAllByPolicyId(input.policyId);
        if (jos.ok && jos.value) {
          jos.value.forEach(jo => {
            results.push({ type: 'jointObligor', actor: jo });
          });
        }
      }

      return results;
    }),

  /**
   * Batch create actors for a policy
   */
  createBatch: adminProcedure
    .input(z.object({
      policyId: z.string(),
      actors: z.object({
        landlord: z.object({
          isCompany: z.boolean().optional(),
          firstName: z.string().optional(),
          middleName: z.string().optional(),
          paternalLastName: z.string().optional(),
          maternalLastName: z.string().optional(),
          companyName: z.string().optional(),
          email: z.string().email(),
          phone: z.string().optional(),
          rfc: z.string().optional(),
        }),
        tenant: z.object({
          tenantType: z.nativeEnum(TenantType),
          firstName: z.string().optional(),
          middleName: z.string().optional(),
          paternalLastName: z.string().optional(),
          maternalLastName: z.string().optional(),
          companyName: z.string().optional(),
          email: z.string().email(),
          phone: z.string().optional(),
        }),
        jointObligors: z.array(PersonSchema.extend({
          email: z.string().email(),
          phone: z.string(),
        })).optional(),
        avals: z.array(PersonSchema.extend({
          email: z.string().email(),
          phone: z.string(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = {
        landlord: null as any,
        tenant: null as any,
        jointObligors: [] as any[],
        avals: [] as any[],
      };

      // Create landlord
      const landlordService = new LandlordService();
      const landlordResult = await landlordService.create({
        ...input.actors.landlord,
        policyId: input.policyId,
        isPrimary: true,
      });

      if (!landlordResult.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Failed to create landlord: ${landlordResult.error?.message}`,
        });
      }
      results.landlord = landlordResult.value;

      // Create tenant
      const tenantService = new TenantService();
      const tenantResult = await tenantService.create({
        ...input.actors.tenant,
        policyId: input.policyId,
      });

      if (!tenantResult.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Failed to create tenant: ${tenantResult.error?.message}`,
        });
      }
      results.tenant = tenantResult.value;

      // Create joint obligors
      if (input.actors.jointObligors) {
        const joService = new JointObligorService();
        for (const jo of input.actors.jointObligors) {
          const joResult = await joService.create({
            ...jo,
            policyId: input.policyId,
          });

          if (joResult.ok) {
            results.jointObligors.push(joResult.value);
          }
        }
      }

      // Create avals
      if (input.actors.avals) {
        const avalService = new AvalService();
        for (const aval of input.actors.avals) {
          const avalResult = await avalService.create({
            ...aval,
            policyId: input.policyId,
          });

          if (avalResult.ok) {
            results.avals.push(avalResult.value);
          }
        }
      }

      return results;
    }),

  /**
   * Dual auth endpoint - can be accessed with session or token
   */
  update: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      data: ActorAdminUpdateSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();
      const service = getActorService(input.type);

      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        });
      }

      const {
        partial,
        informationComplete,
        tabName,
        personalReferences,
        commercialReferences,
        ...actualData
      } = input.data;

      if (tabName) {
        const validTabFields = getTabFields(input.type, tabName);

        if (!validTabFields) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid tab name "${tabName}" for actor type "${input.type}"`,
          });
        }
      }

      const saveResult = await service.update(auth.actor.id, actualData as Partial<ActorData>, {
        skipValidation: auth.skipValidation,
        updatedById: auth.userId,
        isPartial: partial ?? false,
        tabName: tabName,
      });

      if (!saveResult.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: saveResult.error?.message || 'Update failed',
        });
      }

      if (auth.authType === 'admin' && tabName && auth.actor.policyId) {
        const actorTypeLabels: Record<string, string> = {
          tenant: 'tenant',
          landlord: 'landlord',
          aval: 'aval',
          jointObligor: 'joint obligor',
        };
        await logPolicyActivity({
          policyId: auth.actor.policyId,
          action: 'ACTOR_EDITED_BY_ADMIN',
          description: `Admin edited tab "${tabName}" for ${actorTypeLabels[input.type] || input.type}`,
          performedById: auth.userId,
          performedByType: 'user',
          details: { tabName, actorType: input.type, actorId: auth.actor.id },
        });
      }

      if (personalReferences && Array.isArray(personalReferences)) {
        await service.savePersonalReferences(auth.actor.id, personalReferences);
      }

      if (commercialReferences && Array.isArray(commercialReferences)) {
        await service.saveCommercialReferences(auth.actor.id, commercialReferences);
      }

      const isLastTab = tabName && LAST_TABS[input.type] === tabName;

      if (isLastTab && partial !== false && auth.authType === 'actor') {
        const submitResult = await service.submitActor(auth.actor.id, {
          skipValidation: auth.skipValidation,
          submittedBy: auth.userId ?? 'self',
        });

        if (!submitResult.ok) {
          return {
            ...saveResult.value,
            submitted: false,
            submissionError: submitResult.error?.message,
          };
        }

        return {
          ...submitResult.value,
          submitted: true,
        };
      }

      return {
        ...saveResult.value,
        submitted: false,
      };
    }),

  /**
   * Explicit submit endpoint for manual submission or retry
   */
  submitActor: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();
      const service = getActorService(input.type);

      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        });
      }

      const result = await service.submitActor(auth.actor.id, {
        skipValidation: auth.skipValidation,
        submittedBy: auth.userId ?? 'self',
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Error submitting information',
        });
      }

      return result.value;
    }),

  /**
   * Admin-only: Submit actor after admin review
   */
  adminSubmitActor: adminProcedure
    .input(z.object({
      type: ActorTypeSchema,
      id: z.string(),
      skipValidation: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = getActorService(input.type);

      const result = await service.submitActor(input.id, {
        skipValidation: input.skipValidation,
        submittedBy: ctx.userId,
        skipPolicyTransition: true,
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Failed to submit actor information',
        });
      }

      return {
        ...result.value,
        submitted: true,
      };
    }),

  /**
   * Mark actor information as complete
   */
  markComplete: protectedProcedure
    .input(z.object({
      type: ActorTypeSchema,
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = getActorService(input.type);

      const result = await service.update(input.id, {
        informationComplete: true,
      } as unknown as Partial<ActorData>, {
        skipValidation: true,
        updatedById: ctx.userId,
      });

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to mark as complete',
        });
      }

      return result.value;
    }),

});
