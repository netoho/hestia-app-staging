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
import { replaceTenantOnPolicy } from '@/lib/services/policyService/tenantReplacement';
import { changeGuarantorType } from '@/lib/services/policyService/guarantorTypeChange';
import { cancelPolicy } from '@/lib/services/policyService/cancellation';
import { getShareLinksForPolicy } from '@/lib/services/policyService/shareLinks';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';
import { PolicyStatus, GuarantorType, PropertyType, TenantType, PolicyCancellationReason } from "@/prisma/generated/prisma-client/enums";
import { TRPCError } from '@trpc/server';
import { sendIncompleteActorInfoNotification } from "@/lib/services/notificationService";

// Schema for replacing tenant
const ReplaceTenantSchema = z.object({
  policyId: z.string(),
  replacementReason: z.string().min(1, 'Replacement reason is required'),
  newTenant: z.object({
    tenantType: z.nativeEnum(TenantType),
    email: z.string().email(),
    phone: z.string().min(1),
    firstName: z.string().optional(),
    companyName: z.string().optional(),
  }),
  replaceGuarantors: z.boolean().default(false),
});

// Schema for changing guarantor type
const ChangeGuarantorTypeSchema = z.object({
  policyId: z.string(),
  reason: z.string().min(1, 'Reason for change is required'),
  newGuarantorType: z.nativeEnum(GuarantorType),
  newJointObligors: z.array(z.object({
    email: z.string().email(),
    phone: z.string().min(1),
    firstName: z.string().optional(),
    paternalLastName: z.string().optional(),
    maternalLastName: z.string().optional(),
  })).optional(),
  newAvals: z.array(z.object({
    email: z.string().email(),
    phone: z.string().min(1),
    firstName: z.string().optional(),
    paternalLastName: z.string().optional(),
    maternalLastName: z.string().optional(),
  })).optional(),
});

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
      // Check access for brokers
      const policy = await getPolicyById(input.policyId);
      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }
      if (ctx.userRole === 'BROKER' && policy.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this policy',
        });
      }

      const result = await getShareLinksForPolicy(input.policyId);
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }
      return result;
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

  // Cancel a policy (ADMIN/STAFF only)
  cancelPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      reason: z.nativeEnum(PolicyCancellationReason),
      comment: z.string().min(1, 'Comment is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.userRole === 'BROKER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admin or staff can cancel policies',
        });
      }

      const result = await cancelPolicy({
        policyId: input.policyId,
        reason: input.reason,
        comment: input.comment,
        cancelledById: ctx.userId,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to cancel policy',
        });
      }

      return result;
    }),

  // Replace tenant (and optionally guarantors) on a policy
  replaceTenant: protectedProcedure
    .input(ReplaceTenantSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.userRole === 'BROKER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admin or staff can replace tenants',
        });
      }

      const result = await replaceTenantOnPolicy({
        ...input,
        performedById: ctx.userId,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to replace tenant',
        });
      }

      return result;
    }),

  // Change guarantor type on a policy
  changeGuarantorType: protectedProcedure
    .input(ChangeGuarantorTypeSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.userRole === 'BROKER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admin or staff can change guarantor type',
        });
      }

      const result = await changeGuarantorType({
        ...input,
        performedById: ctx.userId,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to change guarantor type',
        });
      }

      return result;
    }),
});
