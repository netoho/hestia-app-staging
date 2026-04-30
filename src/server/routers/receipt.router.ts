import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, adminProcedure } from '@/server/trpc';
import { ReceiptType, ReceiptStatus, PolicyStatus, DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { receiptService } from '@/lib/services/receiptService';
import { documentService } from '@/lib/services/documentService';
import { actorTokenService } from '@/lib/services/actorTokenService';
import { sendReceiptMagicLink } from '@/lib/services/emailService';
import { formatFullName } from '@/lib/utils/names';
import { prisma } from '@/lib/prisma';
import { getCategoryValidation } from '@/lib/constants/documentCategories';
import {
  ReceiptRequestMagicLinkOutput,
  ReceiptGetPortalDataOutput,
  ReceiptGetUploadUrlOutput,
  ReceiptUploadResultOutput,
  ReceiptDeleteOutput,
  ReceiptGetDownloadUrlOutput,
  ReceiptListByPolicyOutput,
  ReceiptGetConfigOutput,
  ReceiptUpdateConfigOutput,
} from '@/lib/schemas/receipt/output';
import type { Context } from '@/server/trpc';

// ============================================
// HELPERS
// ============================================

/**
 * Validate a tenant token and return the tenant (for receipt portal access).
 * Unlike the actor portal, we allow access even when informationComplete = true.
 */
async function validateReceiptToken(token: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { accessToken: token },
    include: {
      policy: {
        include: {
          propertyDetails: {
            include: { propertyAddressDetails: true },
          },
        },
      },
    },
  });

  if (!tenant) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
  }

  if (tenant.tokenExpiry && tenant.tokenExpiry < new Date()) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token expirado' });
  }

  return tenant;
}

/**
 * Validate token and ensure tenant has access to the given policy (supports multi-policy via email).
 * Returns the tenant record that belongs to `policyId`.
 */
async function validateTenantPolicyAccess(token: string, policyId: string) {
  const tenant = await validateReceiptToken(token);
  if (tenant.policyId === policyId) return tenant;
  // Token tenant doesn't match — check if same email has a tenant on this policy
  const matchingTenant = await prisma.tenant.findFirst({
    where: {
      email: { equals: tenant.email, mode: 'insensitive' },
      policyId,
      policy: { status: PolicyStatus.ACTIVE },
    },
    include: {
      policy: {
        include: {
          propertyDetails: { include: { propertyAddressDetails: true } },
        },
      },
    },
  });
  if (!matchingTenant) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes acceso a esta protección' });
  }
  return matchingTenant;
}

/**
 * Validate token and ensure tenant has access to the receipt (supports multi-policy via email).
 * Returns { tenant, receipt }.
 */
async function validateTenantReceiptAccess(token: string, receiptId: string) {
  const tokenTenant = await validateReceiptToken(token);
  const receipt = await prisma.tenantReceipt.findUnique({
    where: { id: receiptId },
    include: { tenant: { select: { email: true } } },
  });
  if (!receipt) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Comprobante no encontrado' });
  }
  // Direct match or email match
  if (receipt.tenantId !== tokenTenant.id) {
    const emailMatch = receipt.tenant.email?.toLowerCase() === tokenTenant.email?.toLowerCase();
    if (!emailMatch) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Comprobante no encontrado' });
    }
  }
  return { tenant: tokenTenant, receipt };
}

/**
 * Validate admin receipt access (session-based).
 * Returns { receipt, userId }.
 */
async function validateAdminReceiptAccess(ctx: Context, receiptId: string) {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  const userRole = ctx.session.user.role as string;
  if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  const receipt = await prisma.tenantReceipt.findUnique({
    where: { id: receiptId },
  });
  if (!receipt) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Comprobante no encontrado' });
  }
  return { receipt, userId: ctx.session.user.id };
}

/**
 * Validate admin policy access (session-based).
 * Returns { tenant, policy, userId }.
 */
async function validateAdminPolicyAccess(ctx: Context, policyId: string) {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  const userRole = ctx.session.user.role as string;
  if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      propertyDetails: { include: { propertyAddressDetails: true } },
      tenant: true,
    },
  });
  if (!policy) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Protección no encontrada' });
  }
  if (!policy.tenant) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'La protección no tiene inquilino asignado' });
  }
  return { tenant: policy.tenant, policy, userId: ctx.session.user.id };
}

const ReceiptTypeSchema = z.nativeEnum(ReceiptType);

// ============================================
// RATE LIMITING (in-memory, per email, 3 requests/hour)
// ============================================

const MAGIC_LINK_RATE_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 };
const magicLinkAttempts = new Map<string, { count: number; resetAt: number }>();

function isMagicLinkRateLimited(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = magicLinkAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    magicLinkAttempts.set(key, { count: 1, resetAt: now + MAGIC_LINK_RATE_LIMIT.windowMs });
    return false;
  }

  entry.count++;
  return entry.count > MAGIC_LINK_RATE_LIMIT.maxRequests;
}

// ============================================
// ROUTER
// ============================================

export const receiptRouter = createTRPCRouter({
  // ========== TENANT-FACING (public with token) ==========

  /**
   * Request magic link: tenant enters email, we send a portal link
   */
  requestMagicLink: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .output(ReceiptRequestMagicLinkOutput)
    .mutation(async ({ input }) => {
      // Rate limit: 3 requests per email per hour (silent — same success response)
      if (isMagicLinkRateLimited(input.email)) {
        return { success: true };
      }

      // Find all tenants with this email in active policies
      const tenants = await prisma.tenant.findMany({
        where: {
          email: { equals: input.email, mode: 'insensitive' },
          policy: { status: PolicyStatus.ACTIVE },
        },
        select: {
          id: true,
          firstName: true,
          paternalLastName: true,
          middleName: true,
          maternalLastName: true,
          companyName: true,
        },
      });

      if (tenants.length === 0) {
        // Don't reveal whether the email exists — always return success
        return { success: true };
      }

      // Generate token for the first tenant found
      const tenant = tenants[0];
      const tokenResult = await actorTokenService.generateTenantToken(tenant.id);

      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/receipts/${tokenResult.token}`;
      const tenantName = tenant.companyName ||
        formatFullName(tenant.firstName || '', tenant.paternalLastName || '', tenant.maternalLastName || '', tenant.middleName || undefined);

      await sendReceiptMagicLink({
        tenantName,
        email: input.email,
        portalUrl,
      });

      return { success: true };
    }),

  /**
   * Get portal data: all policies for the tenant's email with receipts + config history
   */
  getPortalData: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .output(ReceiptGetPortalDataOutput)
    .query(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);
      const email = tenant.email;

      // Find all tenants with same email in approved policies
      const allTenants = await prisma.tenant.findMany({
        where: {
          email: { equals: email, mode: 'insensitive' },
          policy: { status: PolicyStatus.ACTIVE },
        },
        include: {
          policy: {
            include: {
              propertyDetails: {
                include: { propertyAddressDetails: true },
              },
              receiptConfigs: {
                orderBy: [{ effectiveYear: 'asc' }, { effectiveMonth: 'asc' }],
              },
            },
          },
          receipts: {
            where: {
              OR: [
                { uploadStatus: DocumentUploadStatus.COMPLETE },
                { status: ReceiptStatus.NOT_APPLICABLE },
              ],
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
          },
        },
      });

      // For each tenant/policy, compute required receipt types (fallback) + return config history
      const policies = allTenants.map(t => {
        const pd = t.policy.propertyDetails;
        const requiredTypes = receiptService.getRequiredReceiptTypes(
          pd ? {
            hasElectricity: pd.hasElectricity,
            hasWater: pd.hasWater,
            hasGas: pd.hasGas,
            hasInternet: pd.hasInternet,
            hasCableTV: pd.hasCableTV,
            hasPhone: pd.hasPhone,
            electricityIncludedInRent: pd.electricityIncludedInRent,
            waterIncludedInRent: pd.waterIncludedInRent,
            gasIncludedInRent: pd.gasIncludedInRent,
            internetIncludedInRent: pd.internetIncludedInRent,
            cableTVIncludedInRent: pd.cableTVIncludedInRent,
            phoneIncludedInRent: pd.phoneIncludedInRent,
          } : null,
          {
            maintenanceFee: t.policy.maintenanceFee,
            maintenanceIncludedInRent: t.policy.maintenanceIncludedInRent,
          }
        );

        return {
          policyId: t.policy.id,
          policyNumber: t.policy.policyNumber,
          tenantId: t.id,
          rentAmount: t.policy.rentAmount,
          contractLength: t.policy.contractLength,
          propertyAddress: pd?.propertyAddressDetails || null,
          requiredReceiptTypes: requiredTypes,
          receiptConfigs: t.policy.receiptConfigs.map(c => ({
            effectiveYear: c.effectiveYear,
            effectiveMonth: c.effectiveMonth,
            receiptTypes: c.receiptTypes,
          })),
          receipts: t.receipts,
          activatedAt: t.policy.activatedAt,
        };
      });

      const tenantName = tenant.companyName ||
        formatFullName(tenant.firstName || '', tenant.paternalLastName || '', tenant.maternalLastName || '', tenant.middleName || undefined);

      return {
        tenantName,
        tenantEmail: email,
        policies,
      };
    }),

  // ========== DUAL-AUTH ENDPOINTS (token OR session) ==========

  /**
   * Get presigned upload URL for a receipt.
   * Supports both portal (token) and admin (session) access.
   */
  getUploadUrl: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      policyId: z.string(),
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      receiptType: ReceiptTypeSchema,
      fileName: z.string(),
      contentType: z.string(),
      fileSize: z.number().int().positive(),
      otherCategory: z.string().optional(),
      otherDescription: z.string().optional(),
    }))
    .output(ReceiptGetUploadUrlOutput)
    .mutation(async ({ input, ctx }) => {
      // Validate OTHER requires category
      if (input.receiptType === ReceiptType.OTHER && !input.otherCategory) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La categoría es requerida para comprobantes de tipo "Otro"' });
      }

      // Resolve auth: token or session
      let tenantId: string;
      let policyNumber: string;
      let uploadedByUserId: string | null = null;

      if (input.token) {
        const tenant = await validateTenantPolicyAccess(input.token, input.policyId);
        tenantId = tenant.id;
        policyNumber = tenant.policy.policyNumber;
      } else {
        const { tenant, policy, userId } = await validateAdminPolicyAccess(ctx, input.policyId);
        tenantId = tenant.id;
        policyNumber = policy.policyNumber;
        uploadedByUserId = userId;
      }

      // Validate file
      const validation = getCategoryValidation();
      if (input.fileSize > validation.maxSizeMB * 1024 * 1024) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `El archivo excede el tamaño máximo de ${validation.maxSizeMB}MB` });
      }
      if (!validation.allowedMimeTypes.includes(input.contentType)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de archivo no permitido' });
      }

      // Use empty string for non-OTHER types (PostgreSQL treats NULL as distinct in unique constraints)
      const otherCategory = input.receiptType === ReceiptType.OTHER
        ? (input.otherCategory || '')
        : '';

      // Check if receipt already exists for this period+type+category
      const existing = await prisma.tenantReceipt.findUnique({
        where: {
          policyId_year_month_receiptType_otherCategory: {
            policyId: input.policyId,
            year: input.year,
            month: input.month,
            receiptType: input.receiptType,
            otherCategory,
          },
        },
      });

      // If existing UPLOADED receipt, delete the old S3 file first
      if (existing?.s3Key && existing.status === ReceiptStatus.UPLOADED) {
        await documentService.deleteFile(existing.s3Key);
      }

      const s3Key = documentService.generateReceiptS3Key(
        policyNumber, tenantId, input.year, input.month, input.receiptType, input.fileName
      );
      const bucket = process.env.AWS_S3_BUCKET || '';

      // Upsert a PENDING receipt record
      const receipt = await prisma.tenantReceipt.upsert({
        where: {
          policyId_year_month_receiptType_otherCategory: {
            policyId: input.policyId,
            year: input.year,
            month: input.month,
            receiptType: input.receiptType,
            otherCategory,
          },
        },
        create: {
          tenantId,
          policyId: input.policyId,
          year: input.year,
          month: input.month,
          receiptType: input.receiptType,
          status: ReceiptStatus.UPLOADED,
          fileName: input.fileName,
          originalName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.contentType,
          s3Key,
          s3Bucket: bucket,
          uploadStatus: DocumentUploadStatus.PENDING,
          otherCategory,
          otherDescription: input.otherDescription || null,
          uploadedByUserId,
        },
        update: {
          status: ReceiptStatus.UPLOADED,
          fileName: input.fileName,
          originalName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.contentType,
          s3Key,
          s3Bucket: bucket,
          uploadStatus: DocumentUploadStatus.PENDING,
          notApplicableNote: null,
          markedNotApplicableAt: null,
          otherDescription: input.otherDescription || null,
          uploadedByUserId,
        },
      });

      const uploadUrl = await documentService.getUploadUrl(s3Key, 60);

      return {
        success: true,
        uploadUrl,
        receiptId: receipt.id,
        s3Key,
        expiresIn: 60,
      };
    }),

  /**
   * Confirm receipt upload. Supports both portal (token) and admin (session) access.
   */
  confirmUpload: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      receiptId: z.string(),
    }))
    .output(ReceiptUploadResultOutput)
    .mutation(async ({ input, ctx }) => {
      // Validate access
      let receipt: { s3Key: string | null; id: string };
      if (input.token) {
        const result = await validateTenantReceiptAccess(input.token, input.receiptId);
        receipt = result.receipt;
      } else {
        const result = await validateAdminReceiptAccess(ctx, input.receiptId);
        receipt = result.receipt;
      }

      // Verify file exists in S3
      if (receipt.s3Key) {
        const exists = await documentService.fileExists(receipt.s3Key);
        if (!exists) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'El archivo no se subió correctamente' });
        }
      }

      const updated = await prisma.tenantReceipt.update({
        where: { id: input.receiptId },
        data: {
          uploadStatus: DocumentUploadStatus.COMPLETE,
          uploadedAt: new Date(),
        },
      });

      return { success: true, receipt: updated };
    }),

  /**
   * Mark a receipt as not applicable. Supports both portal (token) and admin (session) access.
   * NOT allowed for OTHER receipt type.
   */
  markNotApplicable: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      policyId: z.string(),
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      receiptType: ReceiptTypeSchema,
      note: z.string().optional(),
    }))
    .output(ReceiptUploadResultOutput)
    .mutation(async ({ input, ctx }) => {
      if (input.receiptType === ReceiptType.OTHER) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No se puede marcar como "No aplica" un comprobante de tipo "Otro"' });
      }

      let tenantId: string;
      if (input.token) {
        const tenant = await validateTenantPolicyAccess(input.token, input.policyId);
        tenantId = tenant.id;
      } else {
        const { tenant } = await validateAdminPolicyAccess(ctx, input.policyId);
        tenantId = tenant.id;
      }

      const receipt = await prisma.tenantReceipt.upsert({
        where: {
          policyId_year_month_receiptType_otherCategory: {
            policyId: input.policyId,
            year: input.year,
            month: input.month,
            receiptType: input.receiptType,
            otherCategory: '',
          },
        },
        create: {
          tenantId,
          policyId: input.policyId,
          year: input.year,
          month: input.month,
          receiptType: input.receiptType,
          status: ReceiptStatus.NOT_APPLICABLE,
          notApplicableNote: input.note || null,
          markedNotApplicableAt: new Date(),
        },
        update: {
          status: ReceiptStatus.NOT_APPLICABLE,
          notApplicableNote: input.note || null,
          markedNotApplicableAt: new Date(),
          // Clear file data if was previously uploaded
          fileName: null,
          originalName: null,
          fileSize: null,
          mimeType: null,
          s3Key: null,
          s3Bucket: null,
          uploadStatus: null,
          uploadedAt: null,
        },
      });

      return { success: true, receipt };
    }),

  /**
   * Undo not applicable: delete the NOT_APPLICABLE record.
   * Supports both portal (token) and admin (session) access.
   */
  undoNotApplicable: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      receiptId: z.string(),
    }))
    .output(ReceiptDeleteOutput)
    .mutation(async ({ input, ctx }) => {
      let receipt: { status: ReceiptStatus; id: string };
      if (input.token) {
        const result = await validateTenantReceiptAccess(input.token, input.receiptId);
        receipt = result.receipt;
      } else {
        const result = await validateAdminReceiptAccess(ctx, input.receiptId);
        receipt = result.receipt;
      }

      if (receipt.status !== ReceiptStatus.NOT_APPLICABLE) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solo se puede deshacer el estado "No aplica"' });
      }

      await prisma.tenantReceipt.delete({
        where: { id: input.receiptId },
      });

      return { success: true };
    }),

  /**
   * Delete an uploaded receipt. Supports both portal (token) and admin (session) access.
   */
  deleteReceipt: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      receiptId: z.string(),
    }))
    .output(ReceiptDeleteOutput)
    .mutation(async ({ input, ctx }) => {
      let receipt: { s3Key: string | null; id: string };
      if (input.token) {
        const result = await validateTenantReceiptAccess(input.token, input.receiptId);
        receipt = result.receipt;
      } else {
        const result = await validateAdminReceiptAccess(ctx, input.receiptId);
        receipt = result.receipt;
      }

      // Delete from S3 if file exists
      if (receipt.s3Key) {
        await documentService.deleteFile(receipt.s3Key);
      }

      await prisma.tenantReceipt.delete({
        where: { id: input.receiptId },
      });

      return { success: true };
    }),

  /**
   * Get download URL for a receipt. Supports both portal (token) and admin (session) access.
   */
  getDownloadUrl: publicProcedure
    .input(z.object({
      token: z.string().optional(),
      receiptId: z.string(),
    }))
    .output(ReceiptGetDownloadUrlOutput)
    .query(async ({ input, ctx }) => {
      let receipt: { s3Key: string | null; uploadStatus: DocumentUploadStatus | null; originalName: string | null; fileName: string | null; id: string };
      if (input.token) {
        const result = await validateTenantReceiptAccess(input.token, input.receiptId);
        receipt = result.receipt;
      } else {
        const result = await validateAdminReceiptAccess(ctx, input.receiptId);
        receipt = result.receipt;
      }

      if (!receipt.s3Key || receipt.uploadStatus !== DocumentUploadStatus.COMPLETE) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El archivo no está disponible' });
      }

      const downloadUrl = await documentService.getDownloadUrl(
        receipt.s3Key,
        receipt.originalName || receipt.fileName || 'comprobante',
        300
      );

      return { success: true, downloadUrl, fileName: receipt.originalName || receipt.fileName, expiresIn: 300 };
    }),

  // ========== ADMIN-ONLY ==========

  /**
   * List all receipts for a policy (admin)
   */
  listByPolicy: adminProcedure
    .input(z.object({
      policyId: z.string(),
    }))
    .output(ReceiptListByPolicyOutput)
    .query(async ({ input }) => {
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        include: {
          propertyDetails: {
            include: { propertyAddressDetails: true },
          },
          tenant: { select: { id: true, firstName: true, paternalLastName: true, companyName: true } },
          receiptConfigs: {
            orderBy: [{ effectiveYear: 'asc' }, { effectiveMonth: 'asc' }],
          },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Protección no encontrada' });
      }

      if (policy.status !== 'ACTIVE' && policy.status !== 'EXPIRED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Los comprobantes solo están disponibles para protecciones activas o expiradas' });
      }

      const receipts = await receiptService.getReceiptsByPolicy(input.policyId);

      const requiredTypes = receiptService.getRequiredReceiptTypes(
        policy.propertyDetails ? {
          hasElectricity: policy.propertyDetails.hasElectricity,
          hasWater: policy.propertyDetails.hasWater,
          hasGas: policy.propertyDetails.hasGas,
          hasInternet: policy.propertyDetails.hasInternet,
          hasCableTV: policy.propertyDetails.hasCableTV,
          hasPhone: policy.propertyDetails.hasPhone,
          electricityIncludedInRent: policy.propertyDetails.electricityIncludedInRent,
          waterIncludedInRent: policy.propertyDetails.waterIncludedInRent,
          gasIncludedInRent: policy.propertyDetails.gasIncludedInRent,
          internetIncludedInRent: policy.propertyDetails.internetIncludedInRent,
          cableTVIncludedInRent: policy.propertyDetails.cableTVIncludedInRent,
          phoneIncludedInRent: policy.propertyDetails.phoneIncludedInRent,
        } : null,
        {
          maintenanceFee: policy.maintenanceFee,
          maintenanceIncludedInRent: policy.maintenanceIncludedInRent,
        }
      );

      return {
        receipts,
        requiredTypes,
        receiptConfigs: policy.receiptConfigs.map(c => ({
          effectiveYear: c.effectiveYear,
          effectiveMonth: c.effectiveMonth,
          receiptTypes: c.receiptTypes,
        })),
        tenant: policy.tenant,
        policyNumber: policy.policyNumber,
        activatedAt: policy.activatedAt,
        rentAmount: policy.rentAmount,
        contractLength: policy.contractLength,
        propertyAddress: policy.propertyDetails,
      };
    }),

  /**
   * Get receipt config for a policy (admin)
   */
  getConfig: adminProcedure
    .input(z.object({
      policyId: z.string(),
    }))
    .output(ReceiptGetConfigOutput)
    .query(async ({ input }) => {
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        include: { propertyDetails: true },
      });

      if (!policy) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Protección no encontrada' });
      }

      const configs = await receiptService.getConfigHistory(input.policyId);

      const computedDefaults = receiptService.getRequiredReceiptTypes(
        policy.propertyDetails ? {
          hasElectricity: policy.propertyDetails.hasElectricity,
          hasWater: policy.propertyDetails.hasWater,
          hasGas: policy.propertyDetails.hasGas,
          hasInternet: policy.propertyDetails.hasInternet,
          hasCableTV: policy.propertyDetails.hasCableTV,
          hasPhone: policy.propertyDetails.hasPhone,
          electricityIncludedInRent: policy.propertyDetails.electricityIncludedInRent,
          waterIncludedInRent: policy.propertyDetails.waterIncludedInRent,
          gasIncludedInRent: policy.propertyDetails.gasIncludedInRent,
          internetIncludedInRent: policy.propertyDetails.internetIncludedInRent,
          cableTVIncludedInRent: policy.propertyDetails.cableTVIncludedInRent,
          phoneIncludedInRent: policy.propertyDetails.phoneIncludedInRent,
        } : null,
        {
          maintenanceFee: policy.maintenanceFee,
          maintenanceIncludedInRent: policy.maintenanceIncludedInRent,
        }
      );

      // Current effective config
      const now = new Date();
      const currentTypes = await receiptService.getEffectiveReceiptTypes(
        input.policyId, now.getFullYear(), now.getMonth() + 1
      );

      // Resolve user names for history entries
      const userIds = [...new Set(configs.map(c => c.createdById).filter(Boolean))] as string[];
      const users = userIds.length > 0
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [];
      const userMap = new Map(users.map(u => [u.id, u.name]));

      return {
        currentTypes,
        computedDefaults,
        history: configs.map(c => ({
          id: c.id,
          effectiveYear: c.effectiveYear,
          effectiveMonth: c.effectiveMonth,
          receiptTypes: c.receiptTypes,
          notes: c.notes,
          createdAt: c.createdAt,
          createdByName: c.createdById ? (userMap.get(c.createdById) ?? null) : null,
        })),
      };
    }),

  /**
   * Update receipt config for a policy (admin only).
   * Always takes effect from the current month.
   */
  updateConfig: adminProcedure
    .input(z.object({
      policyId: z.string(),
      receiptTypes: z.array(ReceiptTypeSchema).min(1),
      notes: z.string().optional(),
    }))
    .output(ReceiptUpdateConfigOutput)
    .mutation(async ({ input, ctx }) => {
      // RENT must always be included
      if (!input.receiptTypes.includes(ReceiptType.RENT)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Renta es siempre requerida' });
      }

      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
      });
      if (!policy) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Protección no encontrada' });
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const config = await prisma.receiptConfig.upsert({
        where: {
          policyId_effectiveYear_effectiveMonth: {
            policyId: input.policyId,
            effectiveYear: year,
            effectiveMonth: month,
          },
        },
        create: {
          policyId: input.policyId,
          effectiveYear: year,
          effectiveMonth: month,
          receiptTypes: input.receiptTypes,
          createdById: ctx.userId,
          notes: input.notes || null,
        },
        update: {
          receiptTypes: input.receiptTypes,
          createdById: ctx.userId,
          notes: input.notes || null,
        },
      });

      return { success: true, config };
    }),

  // Keep legacy admin download endpoint for backwards compatibility
  getDownloadUrlAdmin: adminProcedure
    .input(z.object({
      receiptId: z.string(),
    }))
    .output(ReceiptGetDownloadUrlOutput)
    .query(async ({ input }) => {
      const receipt = await prisma.tenantReceipt.findUnique({
        where: { id: input.receiptId },
      });

      if (!receipt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comprobante no encontrado' });
      }

      if (!receipt.s3Key || receipt.uploadStatus !== DocumentUploadStatus.COMPLETE) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El archivo no está disponible' });
      }

      const downloadUrl = await documentService.getDownloadUrl(
        receipt.s3Key,
        receipt.originalName || receipt.fileName || 'comprobante',
        300
      );

      return { success: true, downloadUrl, fileName: receipt.originalName || receipt.fileName, expiresIn: 300 };
    }),
});
