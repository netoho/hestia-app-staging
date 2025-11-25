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

// Import master schemas
import {
  getTenantSchema,
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
} from '@/lib/schemas/tenant';
import {
  getLandlordSchema,
  validateLandlordData,
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
  type Landlord,
} from '@/lib/schemas/landlord';
import {
  getAvalSchema,
  validateAvalData,
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
  type AvalFormData,
} from '@/lib/schemas/aval';
import {
  jointObligorStrictSchema,
  jointObligorIndividualIncomeCompleteSchema,
  jointObligorIndividualPropertyCompleteSchema,
  jointObligorCompanyIncomeCompleteSchema,
  jointObligorCompanyPropertyCompleteSchema,
} from '@/lib/schemas/joint-obligor';
import { personNameSchema } from '@/lib/schemas/shared/person.schema';
import { partialAddressSchema } from '@/lib/schemas/shared/address.schema';
import { prepareLandlordForDB, prepareMultiLandlordsForDB } from '@/lib/utils/landlord/prepareForDB';
import { getDocumentsByActor } from '@/lib/services/documentService';
import { deleteDocument, getDocumentDownloadUrl } from '@/lib/services/fileUploadService';

// Actor types enum
const ActorTypeSchema = z.enum(['tenant', 'landlord', 'aval', 'jointObligor' ]);

// Define which tab is the last one for each actor type
const LAST_TABS = {
  tenant: 'documents',
  landlord: 'documents',
  aval: 'documents',
  jointObligor: 'documents',
} as const;

// Base person schema (Mexican 4-field naming) - will be replaced for other actors
const PersonSchema = personNameSchema;

// For backward compatibility, create TenantStrictSchema dynamically
// This will be removed once all references are updated
const TenantStrictSchema = z.union([
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
]);

// Use the new schema for backward compatibility
const LandlordStrictSchema = z.union([
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
]);

// Create Aval strict schema as union
const AvalStrictSchema = z.union([
  avalIndividualCompleteSchema,
  avalCompanyCompleteSchema,
]);

// Create Joint Obligor strict schema with flexible guarantee
const JointObligorStrictSchema = z.union([
  jointObligorIndividualIncomeCompleteSchema,
  jointObligorIndividualPropertyCompleteSchema,
  jointObligorCompanyIncomeCompleteSchema,
  jointObligorCompanyPropertyCompleteSchema,
]);

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

  /**
   * Landlord-specific: Save multiple landlords for a policy
   * Handles co-ownership scenarios
   */
  saveMultipleLandlords: dualAuthProcedure
    .input(z.object({
      policyId: z.string(),
      landlords: z.array(LandlordStrictSchema),
      propertyDetails: z.any().optional(),
      isPartial: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = new LandlordService();

      // Prepare landlords for database
      const { landlords, policyData, error } = prepareMultiLandlordsForDB(
        input.landlords,
        { isPartial: input.isPartial }
      );

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error,
        });
      }

      // Save all landlords
      const results = [];
      for (const landlordData of landlords) {
        const result = await service.save(
          landlordData.id || '',
          landlordData,
          input.isPartial,
          false
        );

        if (!result.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error?.message || 'Failed to save landlord',
          });
        }

        results.push(result.value);
      }

      // Update policy with financial data if present
      if (policyData && Object.keys(policyData).length > 0) {
        await ctx.prisma.policy.update({
          where: { id: input.policyId },
          data: policyData,
        });
      }

      return {
        landlords: results,
        policyData,
      };
    }),

  /**
   * Landlord-specific: Validate landlord data
   * Used for form validation before submission
   */
  validateLandlord: publicProcedure
    .input(z.object({
      data: z.any(),
      isCompany: z.boolean(),
      mode: z.enum(['strict', 'partial', 'admin']).default('strict'),
      tabName: z.string().optional(),
    }))
    .query(({ input }) => {
      const result = validateLandlordData(input.data, {
        isCompany: input.isCompany,
        mode: input.mode as any,
        tabName: input.tabName,
      });

      if (!result.success) {
        return {
          valid: false,
          errors: result.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        };
      }

      return {
        valid: true,
        data: result.data,
      };
    }),

  /**
   * Landlord-specific: Get all landlords for a policy
   * Returns array since multiple landlords are supported
   */
  getLandlordsByPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string(),
    }))
    .query(async ({ input }) => {
      const service = new LandlordService();
      const result = await service.getAllByPolicyId(input.policyId);

      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error?.message || 'Landlords not found',
        });
      }

      return result.value;
    }),

  /**
   * Landlord-specific: Delete a co-owner (non-primary landlord)
   * Used by the landlord form wizard to remove co-owners
   */
  deleteCoOwner: dualAuthProcedure
    .input(z.object({
      type: z.literal('landlord'),
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = new LandlordService();
      const result = await service.removeLandlord(input.id);

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message || 'Failed to delete landlord',
        });
      }

      return { success: true };
    }),

  // ============================================
  // DOCUMENT PROCEDURES
  // ============================================

  /**
   * List documents for an actor
   * Supports both admin (session) and actor (token) authentication
   */
  listDocuments: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

      // Resolve authentication
      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No autorizado',
        });
      }

      // Map actorType for the query (joint-obligor uses different format in some places)
      const queryType = input.type === 'jointObligor' ? 'joint-obligor' : input.type;

      const documents = await getDocumentsByActor(auth.actor.id, queryType);

      return {
        success: true,
        documents,
      };
    }),

  /**
   * Delete a document
   * Verifies ownership before deletion
   */
  deleteDocument: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      documentId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

      // Resolve authentication
      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No autorizado',
        });
      }

      // Check if editing is allowed for actors
      if (!auth.canEdit && auth.authType === 'actor') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No puede eliminar documentos después de completar la información',
        });
      }

      // Verify document ownership for actors
      if (auth.authType === 'actor') {
        const document = await ctx.prisma.actorDocument.findUnique({
          where: { id: input.documentId },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Documento no encontrado',
          });
        }

        // Check ownership based on actor type
        const actorField = input.type === 'jointObligor' ? 'jointObligorId' : `${input.type}Id`;
        if ((document as any)[actorField] !== auth.actor.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Este documento no pertenece a este actor',
          });
        }
      }

      // Delete the document
      const deleted = await deleteDocument(input.documentId, true);

      if (!deleted) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al eliminar documento',
        });
      }

      return {
        success: true,
        message: 'Documento eliminado exitosamente',
      };
    }),

  /**
   * Get presigned download URL for a document
   */
  getDocumentDownloadUrl: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      documentId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

      // Resolve authentication
      const auth = await authService.resolveActorAuth(
        input.type,
        input.identifier,
        null
      );

      if (!auth) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No autorizado',
        });
      }

      // Fetch document
      const document = await ctx.prisma.actorDocument.findUnique({
        where: { id: input.documentId },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Documento no encontrado',
        });
      }

      // Verify ownership for actors
      if (auth.authType === 'actor') {
        const actorField = input.type === 'jointObligor' ? 'jointObligorId' : `${input.type}Id`;
        if ((document as any)[actorField] !== auth.actor.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Este documento no pertenece a este actor',
          });
        }
      }

      if (!document.s3Key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Documento sin archivo asociado',
        });
      }

      // Generate presigned URL (5 min expiry)
      const downloadUrl = await getDocumentDownloadUrl(
        document.s3Key,
        document.originalName || document.fileName,
        300
      );

      return {
        success: true,
        downloadUrl,
        fileName: document.originalName || document.fileName,
        expiresIn: 300,
      };
    }),
});
