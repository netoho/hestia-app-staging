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
import { PolicyStatus, GuarantorType, PropertyType, TenantType, PolicyCancellationReason } from "@/prisma/generated/prisma-client/enums";
import { TRPCError } from '@trpc/server';
import { generateLandlordToken, generatePolicyActorTokens, generateTenantToken } from '@/lib/services/actorTokenService';
import { sendActorInvitation } from '@/lib/services/emailService';
import {sendIncompleteActorInfoNotification} from "@/lib/services/notificationService";

// Statuses that allow tenant replacement
const REPLACEABLE_STATUSES: PolicyStatus[] = [
  'DRAFT',
  'COLLECTING_INFO',
  'UNDER_INVESTIGATION',
  'PENDING_APPROVAL',
];

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

  // Cancel a policy (ADMIN/STAFF only)
  cancelPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      reason: z.nativeEnum(PolicyCancellationReason),
      comment: z.string().min(1, 'Comment is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only ADMIN/STAFF can cancel
      if (ctx.userRole === 'BROKER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admin or staff can cancel policies',
        });
      }

      const { prisma } = await import('@/lib/prisma');

      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        select: { id: true, status: true, policyNumber: true },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Cannot cancel already cancelled or expired policies
      if (policy.status === 'CANCELLED' || policy.status === 'EXPIRED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot cancel a policy with status ${policy.status}`,
        });
      }

      // Update policy with cancellation details
      await prisma.policy.update({
        where: { id: input.policyId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: input.reason,
          cancellationComment: input.comment,
          cancelledById: ctx.userId,
        },
      });

      // Log activity
      await logPolicyActivity({
        policyId: input.policyId,
        action: 'policy_cancelled',
        description: `Policy cancelled: ${input.reason}`,
        details: { reason: input.reason, comment: input.comment },
        performedById: ctx.userId,
        performedByType: 'user',
      });

      // Notify admins
      const { sendPolicyCancellationNotification } = await import('@/lib/services/notificationService');
      await sendPolicyCancellationNotification(input.policyId);

      return { success: true };
    }),

  // Replace tenant (and optionally guarantors) on a policy
  replaceTenant: protectedProcedure
    .input(ReplaceTenantSchema)
    .mutation(async ({ input, ctx }) => {
      // Only ADMIN/STAFF can replace tenants
      if (ctx.userRole === 'BROKER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admin or staff can replace tenants',
        });
      }

      const { prisma } = await import('@/lib/prisma');
      const { renewToken } = await import('@/lib/services/actorTokenService');

      // Get policy with full tenant and guarantor data for archiving
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        select: {
          id: true,
          status: true,
          policyNumber: true,
          guarantorType: true,
          managedById: true,
          tenant: {
            select: {
              id: true,
              tenantType: true,
              firstName: true,
              middleName: true,
              paternalLastName: true,
              maternalLastName: true,
              companyName: true,
              email: true,
              phone: true,
              rfc: true,
              employmentStatus: true,
              occupation: true,
              employerName: true,
              monthlyIncome: true,
              verificationStatus: true,
              informationComplete: true,
              // Address IDs for cleanup
              addressId: true,
              employerAddressId: true,
              previousRentalAddressId: true,
            },
          },
          jointObligors: {
            select: {
              id: true,
              jointObligorType: true,
              firstName: true,
              middleName: true,
              paternalLastName: true,
              maternalLastName: true,
              companyName: true,
              email: true,
              phone: true,
              rfc: true,
              employmentStatus: true,
              occupation: true,
              employerName: true,
              monthlyIncome: true,
              verificationStatus: true,
              informationComplete: true,
              // Address IDs for cleanup
              addressId: true,
              employerAddressId: true,
              guaranteePropertyAddressId: true,
            },
          },
          avals: {
            select: {
              id: true,
              avalType: true,
              firstName: true,
              middleName: true,
              paternalLastName: true,
              maternalLastName: true,
              companyName: true,
              email: true,
              phone: true,
              rfc: true,
              employmentStatus: true,
              occupation: true,
              employerName: true,
              monthlyIncome: true,
              verificationStatus: true,
              informationComplete: true,
              // Address IDs for cleanup
              addressId: true,
              employerAddressId: true,
              guaranteePropertyAddressId: true,
            },
          },
          investigation: {
            select: { id: true },
          },
        },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Check if policy status allows replacement
      if (!REPLACEABLE_STATUSES.includes(policy.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot replace tenant on policy with status ${policy.status}`,
        });
      }

      if (!policy.tenant) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No tenant found to replace',
        });
      }

      const currentTenant = policy.tenant;

      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // 1. Archive current tenant to TenantHistory
        await tx.tenantHistory.create({
          data: {
            policyId: input.policyId,
            tenantType: currentTenant.tenantType,
            firstName: currentTenant.firstName,
            middleName: currentTenant.middleName,
            paternalLastName: currentTenant.paternalLastName,
            maternalLastName: currentTenant.maternalLastName,
            companyName: currentTenant.companyName,
            email: currentTenant.email,
            phone: currentTenant.phone,
            rfc: currentTenant.rfc,
            employmentStatus: currentTenant.employmentStatus,
            occupation: currentTenant.occupation,
            employerName: currentTenant.employerName,
            monthlyIncome: currentTenant.monthlyIncome,
            verificationStatus: currentTenant.verificationStatus,
            informationComplete: currentTenant.informationComplete,
            replacedById: ctx.userId,
            replacementReason: input.replacementReason,
          },
        });

        // 2. Get tenant document IDs and delete their validations
        const tenantDocIds = await tx.actorDocument.findMany({
          where: { tenantId: currentTenant.id },
          select: { id: true },
        });
        if (tenantDocIds.length > 0) {
          await tx.documentValidation.deleteMany({
            where: { documentId: { in: tenantDocIds.map(d => d.id) } },
          });
        }

        // 3. Unlink tenant's documents (soft delete - keep S3 files)
        await tx.actorDocument.updateMany({
          where: { tenantId: currentTenant.id },
          data: { tenantId: null },
        });

        // 4. Delete tenant's references
        await tx.personalReference.deleteMany({
          where: { tenantId: currentTenant.id },
        });
        await tx.commercialReference.deleteMany({
          where: { tenantId: currentTenant.id },
        });

        // 5. Delete ActorSectionValidation for tenant
        await tx.actorSectionValidation.deleteMany({
          where: { actorType: 'tenant', actorId: currentTenant.id },
        });

        // 6. Delete PropertyAddress records
        const addressIds = [
          currentTenant.addressId,
          currentTenant.employerAddressId,
          currentTenant.previousRentalAddressId,
        ].filter((id): id is string => !!id);
        if (addressIds.length > 0) {
          await tx.propertyAddress.deleteMany({
            where: { id: { in: addressIds } },
          });
        }

        // 7. Reset tenant record with new data
        await tx.tenant.update({
          where: { id: currentTenant.id },
          data: {
            tenantType: input.newTenant.tenantType,
            email: input.newTenant.email,
            phone: input.newTenant.phone,
            firstName: input.newTenant.firstName || null,
            middleName: null,
            paternalLastName: null,
            maternalLastName: null,
            companyName: input.newTenant.tenantType === 'COMPANY' ? input.newTenant.companyName : null,
            companyRfc: null,
            rfc: null,
            curp: null,
            passport: null,
            nationality: 'MEXICAN',
            // Clear legal rep fields
            legalRepFirstName: null,
            legalRepMiddleName: null,
            legalRepPaternalLastName: null,
            legalRepMaternalLastName: null,
            legalRepId: null,
            legalRepPosition: null,
            legalRepRfc: null,
            legalRepPhone: null,
            legalRepEmail: null,
            companyAddress: null,
            // Clear contact fields
            workPhone: null,
            personalEmail: null,
            workEmail: null,
            // Clear address
            currentAddress: null,
            addressId: null,
            // Clear employment
            employmentStatus: null,
            occupation: null,
            employerName: null,
            employerAddress: null,
            employerAddressId: null,
            position: null,
            monthlyIncome: null,
            incomeSource: null,
            yearsAtJob: null,
            hasAdditionalIncome: false,
            additionalIncomeSource: null,
            additionalIncomeAmount: null,
            // Clear rental history
            previousLandlordName: null,
            previousLandlordPhone: null,
            previousLandlordEmail: null,
            previousRentAmount: null,
            previousRentalAddress: null,
            previousRentalAddressId: null,
            rentalHistoryYears: null,
            numberOfOccupants: null,
            reasonForMoving: null,
            hasPets: false,
            petDescription: null,
            // Clear payment preferences
            paymentMethod: null,
            requiresCFDI: false,
            cfdiData: null,
            // Reset status
            informationComplete: false,
            completedAt: null,
            verificationStatus: 'PENDING',
            verifiedAt: null,
            verifiedBy: null,
            rejectionReason: null,
            rejectedAt: null,
            // Clear token (will regenerate after)
            accessToken: null,
            tokenExpiry: null,
            additionalInfo: null,
          },
        });

        // 5. If replaceGuarantors, archive and delete all guarantors
        if (input.replaceGuarantors) {
          // Archive and delete joint obligors
          for (const jo of policy.jointObligors) {
            await tx.jointObligorHistory.create({
              data: {
                policyId: input.policyId,
                jointObligorType: jo.jointObligorType,
                firstName: jo.firstName,
                middleName: jo.middleName,
                paternalLastName: jo.paternalLastName,
                maternalLastName: jo.maternalLastName,
                companyName: jo.companyName,
                email: jo.email,
                phone: jo.phone,
                rfc: jo.rfc,
                employmentStatus: jo.employmentStatus,
                occupation: jo.occupation,
                employerName: jo.employerName,
                monthlyIncome: jo.monthlyIncome,
                verificationStatus: jo.verificationStatus,
                informationComplete: jo.informationComplete,
                replacedById: ctx.userId,
                replacementReason: input.replacementReason,
              },
            });

            // Get document IDs and delete their DocumentValidation
            const joDocIds = await tx.actorDocument.findMany({
              where: { jointObligorId: jo.id },
              select: { id: true },
            });
            if (joDocIds.length > 0) {
              await tx.documentValidation.deleteMany({
                where: { documentId: { in: joDocIds.map(d => d.id) } },
              });
            }

            // Unlink documents
            await tx.actorDocument.updateMany({
              where: { jointObligorId: jo.id },
              data: { jointObligorId: null },
            });

            // Delete references
            await tx.personalReference.deleteMany({
              where: { jointObligorId: jo.id },
            });
            await tx.commercialReference.deleteMany({
              where: { jointObligorId: jo.id },
            });

            // Delete ActorSectionValidation
            await tx.actorSectionValidation.deleteMany({
              where: { actorType: 'jointObligor', actorId: jo.id },
            });

            // Delete PropertyAddress records
            const joAddressIds = [
              jo.addressId,
              jo.employerAddressId,
              jo.guaranteePropertyAddressId,
            ].filter((id): id is string => !!id);
            if (joAddressIds.length > 0) {
              await tx.propertyAddress.deleteMany({
                where: { id: { in: joAddressIds } },
              });
            }
          }

          // Delete all joint obligors
          await tx.jointObligor.deleteMany({
            where: { policyId: input.policyId },
          });

          // Archive and delete avals
          for (const aval of policy.avals) {
            await tx.avalHistory.create({
              data: {
                policyId: input.policyId,
                avalType: aval.avalType,
                firstName: aval.firstName,
                middleName: aval.middleName,
                paternalLastName: aval.paternalLastName,
                maternalLastName: aval.maternalLastName,
                companyName: aval.companyName,
                email: aval.email,
                phone: aval.phone,
                rfc: aval.rfc,
                employmentStatus: aval.employmentStatus,
                occupation: aval.occupation,
                employerName: aval.employerName,
                monthlyIncome: aval.monthlyIncome,
                verificationStatus: aval.verificationStatus,
                informationComplete: aval.informationComplete,
                replacedById: ctx.userId,
                replacementReason: input.replacementReason,
              },
            });

            // Get document IDs and delete their DocumentValidation
            const avalDocIds = await tx.actorDocument.findMany({
              where: { avalId: aval.id },
              select: { id: true },
            });
            if (avalDocIds.length > 0) {
              await tx.documentValidation.deleteMany({
                where: { documentId: { in: avalDocIds.map(d => d.id) } },
              });
            }

            // Unlink documents
            await tx.actorDocument.updateMany({
              where: { avalId: aval.id },
              data: { avalId: null },
            });

            // Delete references
            await tx.personalReference.deleteMany({
              where: { avalId: aval.id },
            });
            await tx.commercialReference.deleteMany({
              where: { avalId: aval.id },
            });

            // Delete ActorSectionValidation
            await tx.actorSectionValidation.deleteMany({
              where: { actorType: 'aval', actorId: aval.id },
            });

            // Delete PropertyAddress records
            const avalAddressIds = [
              aval.addressId,
              aval.employerAddressId,
              aval.guaranteePropertyAddressId,
            ].filter((id): id is string => !!id);
            if (avalAddressIds.length > 0) {
              await tx.propertyAddress.deleteMany({
                where: { id: { in: avalAddressIds } },
              });
            }
          }

          // Delete all avals
          await tx.aval.deleteMany({
            where: { policyId: input.policyId },
          });
        }

        // 8. Delete investigation if exists
        if (policy.investigation) {
          await tx.investigation.delete({
            where: { id: policy.investigation.id },
          });
        }

        // 9. Cancel pending TENANT payments
        await tx.payment.updateMany({
          where: {
            policyId: input.policyId,
            paidBy: 'TENANT',
            status: { in: ['PENDING', 'PROCESSING'] },
          },
          data: { status: 'CANCELLED' },
        });

        // 10. Revert policy status to COLLECTING_INFO if past that
        if (policy.status !== 'DRAFT' && policy.status !== 'COLLECTING_INFO') {
          await tx.policy.update({
            where: { id: input.policyId },
            data: { status: 'COLLECTING_INFO' },
          });
        }
      });

      // 8. Regenerate access token for tenant
      await renewToken('tenant', currentTenant.id);

      // Log activity
      await logPolicyActivity({
        policyId: input.policyId,
        action: 'tenant_replaced',
        description: `Tenant replaced${input.replaceGuarantors ? ' (including guarantors)' : ''}: ${input.replacementReason}`,
        details: {
          previousTenantEmail: currentTenant.email,
          newTenantEmail: input.newTenant.email,
          replaceGuarantors: input.replaceGuarantors,
          reason: input.replacementReason,
        },
        performedById: ctx.userId,
        performedByType: 'user',
      });

      // Send notification to manager and admins
      const { sendTenantReplacementNotification, sendIncompleteActorInfoNotification } = await import('@/lib/services/notificationService');
      await sendTenantReplacementNotification(input.policyId, policy.managedById);

      // Send access link email to the new tenant
      await sendIncompleteActorInfoNotification({
        policyId: input.policyId,
        actors: ['tenant'],
        resend: false,
        initiatorName: 'Sistema',
        initiatorId: ctx.userId,
      });

      return { success: true };
    }),
});
