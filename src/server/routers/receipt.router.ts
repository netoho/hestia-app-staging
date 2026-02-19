import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/trpc';
import { ReceiptType, ReceiptStatus, PolicyStatus, DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { receiptService } from '@/lib/services/receiptService';
import { documentService } from '@/lib/services/documentService';
import { actorTokenService } from '@/lib/services/actorTokenService';
import { sendReceiptMagicLink } from '@/lib/services/emailService';
import { formatFullName } from '@/lib/utils/names';
import { prisma } from '@/lib/prisma';
import { getCategoryValidation } from '@/lib/constants/documentCategories';

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

const ReceiptTypeSchema = z.nativeEnum(ReceiptType);

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
    .mutation(async ({ input }) => {
      // Find all tenants with this email in approved policies
      const tenants = await prisma.tenant.findMany({
        where: {
          email: { equals: input.email, mode: 'insensitive' },
          policy: {
            status: PolicyStatus.APPROVED,
            activatedAt: { not: null },
          },
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
   * Get portal data: all policies for the tenant's email with receipts + service config
   */
  getPortalData: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);
      const email = tenant.email;

      // Find all tenants with same email in approved policies
      const allTenants = await prisma.tenant.findMany({
        where: {
          email: { equals: email, mode: 'insensitive' },
          policy: {
            status: PolicyStatus.APPROVED,
            activatedAt: { not: null },
          },
        },
        include: {
          policy: {
            include: {
              propertyDetails: {
                include: { propertyAddressDetails: true },
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

      // For each tenant/policy, compute required receipt types
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

  /**
   * Get presigned upload URL for a receipt
   */
  getUploadUrl: publicProcedure
    .input(z.object({
      token: z.string(),
      policyId: z.string(),
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      receiptType: ReceiptTypeSchema,
      fileName: z.string(),
      contentType: z.string(),
      fileSize: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);

      // Verify tenant belongs to this policy
      if (tenant.policyId !== input.policyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes acceso a esta protección' });
      }

      // Validate file
      const validation = getCategoryValidation();
      if (input.fileSize > validation.maxSizeMB * 1024 * 1024) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `El archivo excede el tamaño máximo de ${validation.maxSizeMB}MB` });
      }
      if (!validation.allowedMimeTypes.includes(input.contentType)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de archivo no permitido' });
      }

      // Check if receipt already exists for this period+type
      const existing = await prisma.tenantReceipt.findUnique({
        where: {
          policyId_year_month_receiptType: {
            policyId: input.policyId,
            year: input.year,
            month: input.month,
            receiptType: input.receiptType,
          },
        },
      });

      // If existing UPLOADED receipt, delete the old S3 file first
      if (existing?.s3Key && existing.status === ReceiptStatus.UPLOADED) {
        await documentService.deleteFile(existing.s3Key);
      }

      const policyNumber = tenant.policy.policyNumber;
      const s3Key = documentService.generateReceiptS3Key(
        policyNumber, tenant.id, input.year, input.month, input.receiptType, input.fileName
      );
      const bucket = process.env.AWS_S3_BUCKET || '';

      // Upsert a PENDING receipt record
      const receipt = await prisma.tenantReceipt.upsert({
        where: {
          policyId_year_month_receiptType: {
            policyId: input.policyId,
            year: input.year,
            month: input.month,
            receiptType: input.receiptType,
          },
        },
        create: {
          tenantId: tenant.id,
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
   * Confirm receipt upload
   */
  confirmUpload: publicProcedure
    .input(z.object({
      token: z.string(),
      receiptId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);

      const receipt = await prisma.tenantReceipt.findUnique({
        where: { id: input.receiptId },
      });

      if (!receipt || receipt.tenantId !== tenant.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comprobante no encontrado' });
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
   * Mark a receipt as not applicable for a given month
   */
  markNotApplicable: publicProcedure
    .input(z.object({
      token: z.string(),
      policyId: z.string(),
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      receiptType: ReceiptTypeSchema,
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);

      if (tenant.policyId !== input.policyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes acceso a esta protección' });
      }

      const receipt = await prisma.tenantReceipt.upsert({
        where: {
          policyId_year_month_receiptType: {
            policyId: input.policyId,
            year: input.year,
            month: input.month,
            receiptType: input.receiptType,
          },
        },
        create: {
          tenantId: tenant.id,
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
   * Undo not applicable: delete the NOT_APPLICABLE record
   */
  undoNotApplicable: publicProcedure
    .input(z.object({
      token: z.string(),
      receiptId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);

      const receipt = await prisma.tenantReceipt.findUnique({
        where: { id: input.receiptId },
      });

      if (!receipt || receipt.tenantId !== tenant.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
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
   * Delete an uploaded receipt
   */
  deleteReceipt: publicProcedure
    .input(z.object({
      token: z.string(),
      receiptId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);

      const receipt = await prisma.tenantReceipt.findUnique({
        where: { id: input.receiptId },
      });

      if (!receipt || receipt.tenantId !== tenant.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comprobante no encontrado' });
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
   * Get download URL for a receipt
   */
  getDownloadUrl: publicProcedure
    .input(z.object({
      token: z.string(),
      receiptId: z.string(),
    }))
    .query(async ({ input }) => {
      const tenant = await validateReceiptToken(input.token);

      const receipt = await prisma.tenantReceipt.findUnique({
        where: { id: input.receiptId },
      });

      if (!receipt || receipt.tenantId !== tenant.id) {
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

  // ========== ADMIN-FACING ==========

  /**
   * List all receipts for a policy (admin)
   */
  listByPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string(),
    }))
    .query(async ({ input }) => {
      const policy = await prisma.policy.findUnique({
        where: { id: input.policyId },
        include: {
          propertyDetails: true,
          tenant: { select: { id: true, firstName: true, paternalLastName: true, companyName: true } },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Protección no encontrada' });
      }

      if (policy.status !== 'APPROVED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Los comprobantes solo están disponibles para protecciones aprobadas' });
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
        tenant: policy.tenant,
        policyNumber: policy.policyNumber,
      };
    }),

  /**
   * Download a receipt (admin)
   */
  getDownloadUrlAdmin: protectedProcedure
    .input(z.object({
      receiptId: z.string(),
    }))
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
