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
import { TenantType } from '@prisma/client';

// Actor types enum
const ActorTypeSchema = z.enum(['tenant', 'landlord', 'aval', 'jointObligor']);

// Address details schema
const AddressDetailsSchema = z.object({
  street: z.string(),
  exteriorNumber: z.string(),
  interiorNumber: z.string().optional(),
  neighborhood: z.string(),
  municipality: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().default('México'),
});

// Base person schema (Mexican 4-field naming)
const PersonSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  paternalLastName: z.string().min(1),
  maternalLastName: z.string().min(1),
});

// Strict schemas for self-service (token-based) - all fields required
const TenantStrictSchema = z.object({
  // Personal info
  tenantType: z.nativeEnum(TenantType),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  paternalLastName: z.string().min(1),
  maternalLastName: z.string().min(1),
  companyName: z.string().optional(),

  // Contact
  email: z.string().email(),
  phoneNumber: z.string().min(1),

  // Identification
  rfc: z.string().optional(),
  curp: z.string().optional(),

  // Address
  currentAddress: z.string().min(1),
  currentAddressDetails: AddressDetailsSchema.optional(),

  // Employment
  occupation: z.string().min(1),
  companyWorkName: z.string().min(1),
  companyWorkAddress: z.string().min(1),
  monthlyIncome: z.number().positive(),

  // References
  references: z.array(z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
  })).min(2),
});

const LandlordStrictSchema = z.object({
  // Personal/Company info
  isCompany: z.boolean(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  paternalLastName: z.string().optional(),
  maternalLastName: z.string().optional(),
  companyName: z.string().optional(),

  // Contact
  email: z.string().email(),
  phoneNumber: z.string().min(1),

  // Identification
  rfc: z.string().min(1),

  // Legal rep (for companies)
  legalRepName: z.string().optional(),
  legalRepPosition: z.string().optional(),
  legalRepRfc: z.string().optional(),
  legalRepPhone: z.string().optional(),
  legalRepEmail: z.string().email().optional(),

  // Bank info
  bankName: z.string().min(1),
  accountHolder: z.string().min(1),
  accountNumber: z.string().min(1),
  clabe: z.string().length(18),
});

// Admin schemas - flexible updates with proper typing
const ActorAdminUpdateSchema = z.object({
  // Person fields
  firstName: z.string().optional(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().optional(),
  maternalLastName: z.string().optional().nullable(),

  // Company fields
  isCompany: z.boolean().optional().default(false),
  companyName: z.string().optional().nullable(),
  companyRfc: z.string().optional().nullable(),

  // Contact
  email: z.string().email().optional(),
  phone: z.string().optional(),
  workPhone: z.string().optional().nullable(),

  // Address
  address: z.string().optional(),
  addressDetails: AddressDetailsSchema.optional(),

  // Financial
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().optional().nullable(),

  // Additional
  additionalInfo: z.string().optional().nullable(),
}).passthrough(); // Allow additional fields for flexibility

// Type-safe service factory with overloads
// function getActorService(type: 'tenant'): TenantService;
// function getActorService(type: 'landlord'): LandlordService;
// function getActorService(type: 'aval'): AvalService;
// function getActorService(type: 'jointObligor'): JointObligorService;
function getActorService(type: z.infer<typeof ActorTypeSchema>): TenantService | LandlordService | AvalService | JointObligorService {
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

export const actorRouter = createTRPCRouter({
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

      // Return actor data with policy
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

      // Return actor data with policy
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
        data: PersonSchema.extend({
          email: z.string().email(),
          phoneNumber: z.string(),
          currentAddress: z.string(),
          occupation: z.string(),
          monthlyIncome: z.number(),
        }),
      }),
      z.object({
        type: z.literal('jointObligor'),
        token: z.string(),
        data: PersonSchema.extend({
          email: z.string().email(),
          phoneNumber: z.string(),
          currentAddress: z.string(),
          occupation: z.string(),
          monthlyIncome: z.number(),
        }),
      }),
    ]))
    .mutation(async ({ input }) => {
      const service = getActorService(input.type);

      // Validate token and get actor
      const actor = await service.getByToken(input.token);
      if (!actor.ok) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        });
      }

      // Update with strict validation
      const result = await service.update(actor.value.id, input.data, {
        skipValidation: false, // Always validate for self-service
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

      // Update with optional validation skip
      const result = await service.update(input.id, input.data, {
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

      // Check permissions for brokers
      if (ctx.userRole === 'BROKER') {
        // Brokers can only see actors from their policies
        // This would need additional logic to check policy ownership
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
          phoneNumber: z.string().optional(),
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
          phoneNumber: z.string().optional(),
        }),
        jointObligors: z.array(PersonSchema.extend({
          email: z.string().email(),
          phoneNumber: z.string(),
        })).optional(),
        avals: z.array(PersonSchema.extend({
          email: z.string().email(),
          phoneNumber: z.string(),
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
      identifier: z.string(), // Can be ID (for session) or token
      data: ActorAdminUpdateSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();
      const service = getActorService(input.type);

      // Resolve authentication
      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        ctx.authType === 'session' ? ctx.session : null
      );


      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: auth.error || 'Unauthorized',
        });
      }

      // Update with appropriate validation level
      const result = await service.update(auth.actor.id, input.data, {
        skipValidation: auth.skipValidation,
        updatedById: auth.userId,
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
        informationCompleteDate: new Date(),
      }, {
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
