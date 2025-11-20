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
import { getTabFields } from '@/lib/constants/actorTabFields';

// Import centralized schemas
import { addressSchema, partialAddressSchema } from '@/lib/validations/actors/base.schema';

// Actor types enum
const ActorTypeSchema = z.enum(['tenant', 'landlord', 'aval', 'jointObligor']);

// Define which tab is the last one for each actor type
const LAST_TABS = {
  tenant: 'documents',
  landlord: 'documents',
  aval: 'documents',
  jointObligor: 'documents',
} as const;

// Base person schema (Mexican 4-field naming) - temporary until we centralize all
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
  phone: z.string().min(1),
  personalEmail: z.string().email().optional().nullable(),
  workEmail: z.string().email().optional().nullable(),

  // Identification
  rfc: z.string().optional(),
  curp: z.string().optional(),

  // Address
  currentAddress: z.string().min(1),
  currentAddressDetails: partialAddressSchema.optional(),

  // Employment
  employmentStatus: z.string().optional().nullable(),
  occupation: z.string().min(1),
  position: z.string().optional().nullable(),
  companyWorkName: z.string().min(1),
  companyWorkAddress: z.string().min(1),
  monthlyIncome: z.number().positive(),
  incomeSource: z.string().optional().nullable(),
  employerAddressDetails: partialAddressSchema.optional().nullable(),

  // Rental History
  previousAddress: z.string().optional().nullable(),
  previousLandlordName: z.string().optional().nullable(),
  previousLandlordPhone: z.string().optional().nullable(),
  previousLandlordEmail: z.string().email().optional().nullable(),
  previousRentAmount: z.number().optional().nullable(),
  rentalHistoryYears: z.number().optional().nullable(),
  previousRentalAddressDetails: partialAddressSchema.optional().nullable(),
  reasonForMoving: z.string().optional().nullable(),
  numberOfOccupants: z.number().optional(),
  petDetails: z.string().optional().nullable(),

  // References
  references: z.array(z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
  })).min(2),
}).transform(data => {
  const isCompany = data.tenantType === 'COMPANY';
  return {
    ...data,
    isCompany,
  };
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
  phone: z.string().min(1),
  personalEmail: z.string().email().optional().nullable(),
  workEmail: z.string().email().optional().nullable(),

  // Identification
  rfc: z.string().min(1),

  // Property Ownership
  propertyDeedNumber: z.string().optional().nullable(),
  propertyRegistryFolio: z.string().optional().nullable(),
  propertyValue: z.number().optional().nullable(),
  ownershipPercentage: z.number().optional().nullable(),

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
  isCompany: z.boolean().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyRfc: z.string().optional().nullable(),

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
  partial: z.boolean().optional(), // Indicates tab save vs full submission
  informationComplete: z.boolean().optional(), // Marks final submission
  tabName: z.string().optional(), // Which tab is being saved
}).passthrough(); // Allow additional fields for flexibility

// Import ActorData for type casting
import { ActorData } from '@/lib/types/actor';

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

      console.log(`[Actor GetByToken] Type: ${input.type}, Token: ${input.token}, Result:`, result);

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
          isCompany: z.literal(false).default(false),
          email: z.string().email(),
          phone: z.string(),
          personalEmail: z.string().email().optional().nullable(),
          workEmail: z.string().email().optional().nullable(),
          currentAddress: z.string(),

          // Employment
          employmentStatus: z.string().optional().nullable(),
          occupation: z.string(),
          position: z.string().optional().nullable(),
          employerAddress: z.string().optional().nullable(),
          monthlyIncome: z.number(),
          incomeSource: z.string().optional().nullable(),

          // Property guarantee (MANDATORY for Aval)
          hasPropertyGuarantee: z.boolean().default(true),
          guaranteeMethod: z.enum(['income', 'property']).optional().nullable(),
          propertyAddress: z.string().optional().nullable(),
          propertyValue: z.number().positive().optional().nullable(),
          propertyDeedNumber: z.string().optional().nullable(),
          propertyRegistry: z.string().optional().nullable(),
          propertyTaxAccount: z.string().optional().nullable(),
          propertyUnderLegalProceeding: z.boolean().default(false),

          // Marriage information
          maritalStatus: z.string().optional().nullable(),
          spouseName: z.string().optional().nullable(),
          spouseRfc: z.string().optional().nullable(),
          spouseCurp: z.string().optional().nullable(),
        }),
      }),
      z.object({
        type: z.literal('jointObligor'),
        token: z.string(),
        data: PersonSchema.extend({
          isCompany: z.literal(false).default(false),
          email: z.string().email(),
          phone: z.string(),
          personalEmail: z.string().email().optional().nullable(),
          workEmail: z.string().email().optional().nullable(),
          currentAddress: z.string(),

          // Employment
          employmentStatus: z.string().optional().nullable(),
          occupation: z.string(),
          position: z.string().optional().nullable(),
          employerAddress: z.string().optional().nullable(),
          monthlyIncome: z.number(),
          incomeSource: z.string().optional().nullable(),

          // Guarantee
          guaranteeMethod: z.enum(['income', 'property']).optional(),
          hasPropertyGuarantee: z.boolean().optional(),
          hasProperties: z.boolean().optional(),

          // Property guarantee fields
          propertyAddress: z.string().optional().nullable(),
          propertyValue: z.number().optional().nullable(),
          propertyDeedNumber: z.string().optional().nullable(),
          propertyRegistry: z.string().optional().nullable(),
          propertyTaxAccount: z.string().optional().nullable(),
          propertyUnderLegalProceeding: z.boolean().optional(),

          // Financial Information (income guarantee)
          bankName: z.string().optional().nullable(),
          accountHolder: z.string().optional().nullable(),

          // Marriage information
          maritalStatus: z.string().optional().nullable(),
          spouseName: z.string().optional().nullable(),
          spouseRfc: z.string().optional().nullable(),
          spouseCurp: z.string().optional().nullable(),
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
      // We use Partial<ActorData> to allow flexibility while maintaining some type safety
      const result = await service.update(actor.value.id, input.data as Partial<ActorData>, {
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
      console.log('[Actor Update] Received update request for type:', input.type, input.data);
      const authService = new ActorAuthService();
      const service = getActorService(input.type);

      // Resolve authentication
      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null // Pass null for request as it's not available in tRPC context
      );


      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        });
      }

      // Extract metadata flags and special fields from input
      const {
        partial,
        informationComplete,
        tabName,
        personalReferences,
        commercialReferences,
        ...actualData
      } = input.data;

      // Validate tab name if provided
      if (tabName) {
        const validTabFields = getTabFields(input.type, tabName);

        console.log('Valid tab fields for', input.type, tabName, ':', validTabFields);

        if (!validTabFields) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid tab name "${tabName}" for actor type "${input.type}"`,
          });
        }

        // Log which fields are being updated for this tab
        console.log(`[Actor Update] Type: ${input.type}, Tab: "${tabName}", Fields being updated:`, Object.keys(actualData));
        console.log(`[Actor Update] Field values:`, Object.entries(actualData).map(([key, value]) =>
          `${key}: ${value === null ? 'null' : value === '' ? 'empty string' : typeof value}`
        ));
      } else {
        console.log(`[Actor Update] Type: ${input.type}, No tab specified, Partial: ${partial}, Fields:`, Object.keys(actualData));
      }

      // STEP 1: Always save the tab data first
      const saveResult = await service.update(auth.actor.id, actualData as Partial<ActorData>, {
        skipValidation: auth.skipValidation,
        updatedById: auth.userId,
        isPartial: partial ?? false, // Pass partial flag to service
        tabName: tabName, // Pass tab name for better logging and validation
      });

      if (!saveResult.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: saveResult.error?.message || 'Update failed',
        });
      }

      // STEP 2: Save references if provided (typically for references tab)
      if (personalReferences && Array.isArray(personalReferences)) {
        const refResult = await service.savePersonalReferences(auth.actor.id, personalReferences);
        if (!refResult.ok) {
          console.error('Failed to save personal references:', refResult.error);
        } else {
          console.log(`[Actor Update] Saved ${personalReferences.length} personal references`);
        }
      }

      if (commercialReferences && Array.isArray(commercialReferences)) {
        const comRefResult = await service.saveCommercialReferences(auth.actor.id, commercialReferences);
        if (!comRefResult.ok) {
          console.error('Failed to save commercial references:', comRefResult.error);
        } else {
          console.log(`[Actor Update] Saved ${commercialReferences.length} commercial references`);
        }
      }

      // STEP 3: Check if this is the last tab and auto-submit
      const isLastTab = tabName && LAST_TABS[input.type] === tabName;

      if (isLastTab && partial !== false) {
        // STEP 4: Call submitActor to validate and mark as complete
        const submitResult = await service.submitActor(auth.actor.id, {
          skipValidation: auth.skipValidation,
          submittedBy: auth.userId ?? 'self',
        });

        if (!submitResult.ok) {
          // Save succeeded but submission failed
          return {
            ...saveResult.value,
            submitted: false,
            submissionError: submitResult.error?.message,
          };
        }

        // Both save and submit succeeded
        return {
          ...submitResult.value,
          submitted: true,
        };
      }

      // Not last tab or explicit non-partial save
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
      identifier: z.string(), // Can be ID (for session) or token
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();
      const service = getActorService(input.type);

      // Resolve authentication
      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null // Pass null for request as it's not available in tRPC context
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: auth.error || 'Unauthorized',
        });
      }

      // Submit the actor (validate and mark as complete)
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
