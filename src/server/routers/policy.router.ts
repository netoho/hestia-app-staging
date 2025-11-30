import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  brokerProcedure,
} from '@/server/trpc';
import {
  getPolicies,
  createPolicy,
  getPolicyById,
  logPolicyActivity,
  validatePolicyNumber,
} from '@/lib/services/policyService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';
import { PolicyStatus, GuarantorType, PropertyType, TenantType } from "@/prisma/generated/prisma-client/enums";
import { TRPCError } from '@trpc/server';
import { generateLandlordToken, generatePolicyActorTokens } from '@/lib/services/actorTokenService';
import { sendActorInvitation } from '@/lib/services/emailService';
import {sendIncompleteActorInfoNotification} from "@/lib/services/notificationService";

// Schema for creating a policy
const CreatePolicySchema = z.object({
  // Policy details
  policyNumber: z.string().min(1),
  internalCode: z.string().optional(),

  // Property information
  propertyAddressDetails: z.any().optional().nullable(),
  propertyType: z.nativeEnum(PropertyType),
  propertyDescription: z.string().optional(),
  rentAmount: z.number().positive(),
  depositAmount: z.number().positive(),
  contractLength: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string(),

  // Property features
  parkingSpaces: z.number().int().min(0).default(0),
  parkingNumbers: z.string().optional(),
  isFurnished: z.boolean().default(false),
  hasPhone: z.boolean().default(false),
  hasElectricity: z.boolean().default(true),
  hasWater: z.boolean().default(true),
  hasGas: z.boolean().default(false),
  hasCableTV: z.boolean().default(false),
  hasInternet: z.boolean().default(false),
  utilitiesInLandlordName: z.boolean().default(false),

  // Financial details
  hasIVA: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
  securityDeposit: z.number().default(1),
  maintenanceFee: z.number().optional(),
  maintenanceIncludedInRent: z.boolean().default(false),
  rentIncreasePercentage: z.number().optional(),
  paymentMethod: z.string().default('bank_transfer'),

  // Additional info
  hasInventory: z.boolean().default(false),
  hasRules: z.boolean().default(false),
  rulesType: z.string().optional(),
  petsAllowed: z.boolean().default(false),
  propertyDeliveryDate: z.string().optional(),
  contractSigningDate: z.string().optional(),
  contractSigningAddressDetails: z.any().optional(),

  // Package and pricing
  packageId: z.string(),
  tenantPercentage: z.number().min(0).max(100),
  landlordPercentage: z.number().min(0).max(100),
  totalPrice: z.number().positive(),

  // Guarantor type
  guarantorType: z.nativeEnum(GuarantorType),

  // Actors
  landlord: z.object({
    isCompany: z.boolean().optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    paternalLastName: z.string().optional(),
    maternalLastName: z.string().optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    rfc: z.string().optional(),
    companyName: z.string().optional(),
    companyRfc: z.string().optional(),
    legalRepName: z.string().optional(),
    legalRepPosition: z.string().optional(),
    legalRepRfc: z.string().optional(),
    legalRepPhone: z.string().optional(),
    legalRepEmail: z.string().optional(),
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
    rfc: z.string().optional(),
  }),

  jointObligors: z.array(z.object({
    firstName: z.string(),
    middleName: z.string().optional(),
    paternalLastName: z.string(),
    maternalLastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    rfc: z.string().optional(),
  })).optional(),

  avals: z.array(z.object({
    firstName: z.string(),
    middleName: z.string().optional(),
    paternalLastName: z.string(),
    maternalLastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    rfc: z.string().optional(),
  })).optional(),

  sendInvitations: z.boolean().default(true),
});

// Schema for listing policies
const PolicyListSchema = z.object({
  status: z.nativeEnum(PolicyStatus).optional(),
  paymentStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Schema for updating policy status
const UpdateStatusSchema = z.object({
  policyId: z.string(),
  status: z.nativeEnum(PolicyStatus),
  notes: z.string().optional(),
});

// Schema for saving drafts
const PolicyDraftSchema = z.object({
  policyNumber: z.string().optional(),
  internalCode: z.string().optional(),
  propertyData: z.any().optional(),
  pricingData: z.any().optional(),
  landlordData: z.any().optional(),
  tenantData: z.any().optional(),
  guarantorsData: z.any().optional(),
  currentStep: z.string().optional(),
});

export const policyRouter = createTRPCRouter({
  /**
   * List policies with filters
   */
  list: brokerProcedure
    .input(PolicyListSchema)
    .query(async ({ input, ctx }) => {
      const filters = {
        ...input,
        // Brokers can only see their own policies
        createdById: ctx.isBroker ? ctx.userId : undefined,
      };

      return await getPolicies(filters);
    }),

  /**
   * Get policy by ID with optional progress calculation
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
      includeProgress: z.boolean().optional().default(false)
    }))
    .query(async ({ input, ctx }) => {
      const policy = await getPolicyById(input.id);

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Check access for brokers
      if (ctx.userRole === 'BROKER' && policy.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this policy',
        });
      }

      // Calculate progress if requested
      if (input.includeProgress) {
        const { calculatePolicyProgress } = await import('@/lib/services/progressService');
        const progress = calculatePolicyProgress(policy);
        return { ...policy, progress };
      }

      return policy;
    }),

  /**
   * Create a new policy
   */
  create: protectedProcedure
    .input(CreatePolicySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Create the policy with all related data
        const policy = await createPolicy({
          ...input,
          createdById: ctx.userId,
        });

        // Log activity
        await logPolicyActivity({
          policyId: policy.id,
          action: 'created',
          description: 'Policy created',
          details: { createdBy: ctx.session?.user?.email },
          performedById: ctx.userId,
        });

        // Send invitations if requested
        if (input.sendInvitations) {
          try {
            await sendIncompleteActorInfoNotification({
              initiatorId: ctx.userId,
              policyId: policy.id,
              resend: true,
              actors: [],
              initiatorName: ctx.session?.user?.name || ctx.session?.user?.email || 'System',
              ipAddress: 'unknown',
            })

          } catch (error) {
            console.error('Failed to send invitations:', error);
            // Don't fail the policy creation if invitations fail
          }
        }

        return {
          success: true,
          policy,
        };
      } catch (error) {
        console.error('Create policy error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create policy',
          cause: error,
        });
      }
    }),

  /**
   * Check if a policy number is available
   */
  checkNumber: publicProcedure
    .input(z.object({ number: z.string() }))
    .query(async ({ input, ctx }) => {
      const validation = await validatePolicyNumber(input.number);
      return validation;
    }),

  /**
   * Save a draft policy (for auto-save functionality)
   */
  saveDraft: protectedProcedure
    .input(PolicyDraftSchema)
    .mutation(async ({ input, ctx }) => {
      // Store draft in database or session
      // This would be implemented based on your draft storage strategy
      // For now, we'll store in a drafts table or session storage

      const draftKey = `policy_draft_${ctx.userId}`;

      // You could store this in Redis, database, or session
      // For simplicity, we'll just return success
      return {
        success: true,
        draftId: draftKey,
        savedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get saved draft for current user
   */
  getDraft: protectedProcedure
    .query(async ({ ctx }) => {
      const draftKey = `policy_draft_${ctx.userId}`;

      // Retrieve draft from storage
      // For now, return null (no draft)
      return null;
    }),

  /**
   * Update policy status
   */
  updateStatus: protectedProcedure
    .input(UpdateStatusSchema)
    .mutation(async ({ input, ctx }) => {
      // Check permissions
      if (ctx.userRole === 'BROKER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Brokers cannot update policy status',
        });
      }

      const result = await transitionPolicyStatus(
        input.policyId,
        input.status,
        ctx.userId,
        input.notes
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update policy status',
        });
      }

      return result;
    }),

  /**
   * Get share links for all policy actors
   */
  getShareLinks: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input, ctx }) => {
      const policy = await getPolicyById(input.policyId);

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Check access for brokers
      if (ctx.userRole === 'BROKER' && policy.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this policy',
        });
      }

      const { generateActorUrl } = await import('@/lib/services/actorTokenService');
      const { formatFullName } = await import('@/lib/utils/names');

      // Build share links for all actors
      const shareLinks: any[] = [];

      // Landlords (only primary)
      for (const landlord of policy.landlords || []) {
        if (landlord.accessToken && landlord.isPrimary) {
          shareLinks.push({
            actorId: landlord.id,
            actorType: 'landlord',
            actorName: landlord.companyName ||
              (landlord.firstName ? formatFullName(
                landlord.firstName,
                landlord.paternalLastName || '',
                landlord.maternalLastName || '',
                landlord.middleName || undefined
              ) : 'Sin nombre'),
            email: landlord.email,
            phone: landlord.phone,
            url: generateActorUrl(landlord.accessToken, 'landlord'),
            tokenExpiry: landlord.tokenExpiry,
            informationComplete: landlord.informationComplete,
          });
        }
      }

      // Tenant
      if (policy.tenant?.accessToken) {
        shareLinks.push({
          actorId: policy.tenant.id,
          actorType: 'tenant',
          actorName: policy.tenant.companyName ||
            (policy.tenant.firstName ? formatFullName(
              policy.tenant.firstName,
              policy.tenant.paternalLastName || '',
              policy.tenant.maternalLastName || '',
              policy.tenant.middleName || undefined
            ) : 'Sin nombre'),
          email: policy.tenant.email,
          phone: policy.tenant.phone,
          url: generateActorUrl(policy.tenant.accessToken, 'tenant'),
          tokenExpiry: policy.tenant.tokenExpiry,
          informationComplete: policy.tenant.informationComplete,
        });
      }

      // Joint Obligors
      for (const jo of policy.jointObligors || []) {
        if (jo.accessToken) {
          shareLinks.push({
            actorId: jo.id,
            actorType: 'joint-obligor',
            actorName: jo.companyName ||
              (jo.firstName ? formatFullName(
                jo.firstName,
                jo.paternalLastName || '',
                jo.maternalLastName || '',
                jo.middleName || undefined
              ) : 'Sin nombre'),
            email: jo.email,
            phone: jo.phone,
            url: generateActorUrl(jo.accessToken, 'joint-obligor'),
            tokenExpiry: jo.tokenExpiry,
            informationComplete: jo.informationComplete,
          });
        }
      }

      // Avals
      for (const aval of policy.avals || []) {
        if (aval.accessToken) {
          shareLinks.push({
            actorId: aval.id,
            actorType: 'aval',
            actorName: aval.companyName ||
              (aval.firstName ? formatFullName(
                aval.firstName,
                aval.paternalLastName || '',
                aval.maternalLastName || '',
                aval.middleName || undefined
              ) : 'Sin nombre'),
            email: aval.email,
            phone: aval.phone,
            url: generateActorUrl(aval.accessToken, 'aval'),
            tokenExpiry: aval.tokenExpiry,
            informationComplete: aval.informationComplete,
          });
        }
      }

      return {
        policyNumber: policy.policyNumber,
        shareLinks,
      };
    }),

  /**
   * Send invitations to actors
   */
  sendInvitations: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      actors: z.array(z.string()).optional(),
      resend: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const policy = await getPolicyById(input.policyId);

        if (!policy) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Policy not found',
          });
        }

        // Check access for brokers
        if (ctx.userRole === 'BROKER' && policy.createdById !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this policy',
          });
        }

        // Send invitations
        const { sendIncompleteActorInfoNotification } = await import('@/lib/services/notificationService');

        const invitations = await sendIncompleteActorInfoNotification({
          policyId: input.policyId,
          actors: input.actors,
          resend: input.resend,
          initiatorName: ctx.session?.user?.name || 'Sistema',
          initiatorId: ctx.userId,
          ipAddress: ctx.headers?.get('x-forwarded-for') || 'unknown',
        });

        return {
          success: true,
          invitations,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send invitations',
          cause: error,
        });
      }
    }),
});
