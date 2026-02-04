import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure, publicProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import {
  InvestigationVerdict,
  RiskLevel,
  DocumentCategory,
} from '@/prisma/generated/prisma-client/enums';
import { randomBytes, timingSafeEqual } from 'crypto';
import { documentService } from '@/lib/services/documentService';

// These types will be generated after running prisma migrate
// For now, define them locally to match schema.prisma
type ApproverType = 'BROKER' | 'LANDLORD';
import {
  getInvestigationTokenExpiryDate,
  getVerdictLabel,
  getRiskLevelLabel,
  getInvestigatedActorLabel,
  INVESTIGATION_FORM_LIMITS,
} from '@/lib/constants/investigationConfig';
import {
  sendInvestigationSubmittedEmail,
  sendInvestigationApprovalRequestEmail,
  sendInvestigationResultEmail,
} from '@/lib/services/emailService';
import { formatFullName } from '@/lib/utils/names';

// Generate token for approval links
const generateToken = () => randomBytes(32).toString('hex');

// Timing-safe token comparison
const safeCompareTokens = (a: string | null, b: string): boolean => {
  if (!a) return false;
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

// Get app base URL
const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Actor type schema (use enum after migration is run)
const InvestigatedActorTypeSchema = z.enum(['TENANT', 'JOINT_OBLIGOR', 'AVAL']);

// Helper to get actor name
const getActorName = (actor: {
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  companyName?: string;
} | null): string => {
  if (!actor) return 'Actor desconocido';
  return actor.companyName || formatFullName(
    actor.firstName,
    actor.paternalLastName,
    actor.maternalLastName,
    actor.middleName,
  );
};

export const investigationRouter = createTRPCRouter({
  /**
   * Create a new investigation for an actor (Admin/Staff only)
   * Does NOT submit - allows staff to add documents before submitting
   */
  create: adminProcedure
    .input(z.object({
      policyId: z.string().cuid('ID de póliza inválido'),
      actorType: InvestigatedActorTypeSchema,
      actorId: z.string().cuid('ID de actor inválido'),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify the actor exists and belongs to the policy
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: input.policyId },
        include: {
          tenant: true,
          jointObligors: true,
          avals: true,
          landlords: { where: { isPrimary: true } },
          createdBy: { select: { id: true, email: true } },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Policy not found' });
      }

      // Verify actor exists in policy
      let actorExists = false;
      if (input.actorType === 'TENANT' && policy.tenant?.id === input.actorId) {
        actorExists = true;
      } else if (input.actorType === 'JOINT_OBLIGOR') {
        actorExists = policy.jointObligors.some(jo => jo.id === input.actorId);
      } else if (input.actorType === 'AVAL') {
        actorExists = policy.avals.some(a => a.id === input.actorId);
      }

      if (!actorExists) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Actor not found in policy' });
      }

      // Create investigation record
      const investigation = await ctx.prisma.actorInvestigation.create({
        data: {
          policyId: input.policyId,
          actorType: input.actorType,
          actorId: input.actorId,
          submittedBy: ctx.userId,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        investigation,
      };
    }),

  /**
   * Get investigation by ID (Admin/Staff only)
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().cuid('ID de investigación inválido') }))
    .query(async ({ input, ctx }) => {
      const investigation = await ctx.prisma.actorInvestigation.findUnique({
        where: { id: input.id },
        include: {
          documents: true,
          policy: {
            include: {
              tenant: true,
              jointObligors: true,
              avals: true,
              landlords: { where: { isPrimary: true } },
              createdBy: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      // Get actor details
      let actor = null;
      if (investigation.actorType === 'TENANT') {
        actor = investigation.policy.tenant;
      } else if (investigation.actorType === 'JOINT_OBLIGOR') {
        actor = investigation.policy.jointObligors.find(jo => jo.id === investigation.actorId);
      } else if (investigation.actorType === 'AVAL') {
        actor = investigation.policy.avals.find(a => a.id === investigation.actorId);
      }

      return {
        ...investigation,
        actor,
      };
    }),

  /**
   * Get investigations by actor (Admin/Staff only)
   */
  getByActor: adminProcedure
    .input(z.object({
      actorType: InvestigatedActorTypeSchema,
      actorId: z.string().cuid('ID de actor inválido'),
    }))
    .query(async ({ input, ctx }) => {
      const investigations = await ctx.prisma.actorInvestigation.findMany({
        where: {
          actorType: input.actorType,
          actorId: input.actorId,
        },
        include: {
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return investigations;
    }),

  /**
   * Get all investigations for a policy (Admin/Staff/Broker)
   * Includes resolved actor names
   */
  getByPolicy: protectedProcedure
    .input(z.object({
      policyId: z.string().cuid('ID de póliza inválido'),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify access and get policy with actors for name resolution
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: input.policyId },
        include: {
          tenant: {
            select: { id: true, firstName: true, middleName: true, paternalLastName: true, maternalLastName: true, companyName: true },
          },
          jointObligors: {
            select: { id: true, firstName: true, middleName: true, paternalLastName: true, maternalLastName: true, companyName: true },
          },
          avals: {
            select: { id: true, firstName: true, middleName: true, paternalLastName: true, maternalLastName: true, companyName: true },
          },
          createdBy: { select: { id: true } },
        },
      });

      if (!policy) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Policy not found' });
      }

      // Brokers can only see their own policies; ADMIN and STAFF can see all
      if (ctx.userRole === 'BROKER' && policy.createdById !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const investigations = await ctx.prisma.actorInvestigation.findMany({
        where: {
          policyId: input.policyId,
          ...(input.status && { status: input.status }),
        },
        include: {
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Resolve actor names
      const investigationsWithActorNames = investigations.map((inv) => {
        let actor = null;
        if (inv.actorType === 'TENANT') {
          actor = policy.tenant;
        } else if (inv.actorType === 'JOINT_OBLIGOR') {
          actor = policy.jointObligors.find(jo => jo.id === inv.actorId);
        } else if (inv.actorType === 'AVAL') {
          actor = policy.avals.find(a => a.id === inv.actorId);
        }

        return {
          ...inv,
          actorName: getActorName(actor),
          documentsCount: inv.documents.length,
        };
      });

      return investigationsWithActorNames;
    }),

  /**
   * Update investigation findings (Admin/Staff only)
   */
  update: adminProcedure
    .input(z.object({
      id: z.string().cuid('ID de investigación inválido'),
      findings: z.string().max(INVESTIGATION_FORM_LIMITS.findings.max).optional(),
      verdict: z.nativeEnum(InvestigationVerdict).optional(),
      riskLevel: z.nativeEnum(RiskLevel).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const investigation = await ctx.prisma.actorInvestigation.findUnique({
        where: { id: input.id },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      // Cannot update if already submitted or processed (FIXED: && -> ||)
      if (investigation.status !== 'PENDING' || investigation.submittedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot update submitted investigation'
        });
      }

      const updated = await ctx.prisma.actorInvestigation.update({
        where: { id: input.id },
        data: {
          findings: input.findings,
          verdict: input.verdict,
          riskLevel: input.riskLevel,
        },
      });

      return { success: true, investigation: updated };
    }),

  /**
   * Delete investigation (Admin/Staff only)
   * Only allows deleting drafts (PENDING, not yet submitted)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid('ID de investigación inválido') }))
    .mutation(async ({ input, ctx }) => {
      const investigation = await ctx.prisma.actorInvestigation.findUnique({
        where: { id: input.id },
        include: { documents: true },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      // Only allow deleting drafts (PENDING and not submitted)
      if (investigation.status !== 'PENDING' || investigation.submittedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solo se pueden eliminar investigaciones en borrador',
        });
      }

      // Delete documents from S3 and database in transaction
      await ctx.prisma.$transaction(async (tx) => {
        // Delete S3 files first
        if (investigation.documents.length > 0) {
          for (const doc of investigation.documents) {
            try {
              await documentService.deleteFile(doc.s3Key);
            } catch (error) {
              console.error(`Failed to delete S3 file ${doc.s3Key}:`, error);
              // Continue with other deletions
            }
          }

          // Delete document records
          await tx.actorInvestigationDocument.deleteMany({
            where: { investigationId: input.id },
          });
        }

        // Delete investigation
        await tx.actorInvestigation.delete({
          where: { id: input.id },
        });
      });

      // Log activity
      await ctx.prisma.policyActivity.create({
        data: {
          policyId: investigation.policyId,
          action: 'investigation_deleted',
          description: 'Investigación eliminada',
          performedById: ctx.userId,
          performedByType: 'user',
          details: {
            investigationId: input.id,
            actorType: investigation.actorType,
            actorId: investigation.actorId,
          },
        },
      });

      return { success: true };
    }),

  /**
   * Get presigned URL for document upload (Admin/Staff only)
   */
  getDocumentUploadUrl: adminProcedure
    .input(z.object({
      investigationId: z.string().cuid('ID de investigación inválido'),
      fileName: z.string().min(1, 'Nombre de archivo requerido'),
      contentType: z.string().min(1, 'Tipo de contenido requerido'),
      fileSize: z.number().positive('Tamaño de archivo inválido'),
    }))
    .mutation(async ({ input, ctx }) => {
      const investigation = await ctx.prisma.actorInvestigation.findUnique({
        where: { id: input.investigationId },
        include: {
          policy: { select: { policyNumber: true } },
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      try {
        const result = await documentService.generateInvestigationUploadUrl({
          policyNumber: investigation.policy.policyNumber,
          investigationId: input.investigationId,
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
          category: DocumentCategory.INVESTIGATION_SUPPORT,
        });

        return {
          success: true,
          uploadUrl: result.uploadUrl,
          documentId: result.documentId,
          s3Key: result.s3Key,
          expiresIn: result.expiresIn,
        };
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Remove document from investigation (Admin/Staff only)
   */
  removeDocument: adminProcedure
    .input(z.object({
      investigationId: z.string().cuid('ID de investigación inválido'),
      documentId: z.string().cuid('ID de documento inválido'),
    }))
    .mutation(async ({ input }) => {
      const document = await documentService.getInvestigationDocument(input.documentId);

      if (!document || document.investigationId !== input.investigationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      const success = await documentService.deleteInvestigationDocument(input.documentId);

      if (!success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete document' });
      }

      return { success: true };
    }),

  /**
   * Get document download URL (Admin/Staff only)
   */
  getDocumentDownloadUrl: adminProcedure
    .input(z.object({ documentId: z.string().cuid('ID de documento inválido') }))
    .query(async ({ input }) => {
      const document = await documentService.getInvestigationDocument(input.documentId);

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      const downloadUrl = await documentService.getDownloadUrl(
        document.s3Key,
        document.originalName,
        300
      );

      return {
        success: true,
        downloadUrl,
        fileName: document.originalName,
        expiresIn: 300,
      };
    }),

  /**
   * Submit investigation for approval (Admin/Staff only)
   * Generates tokens and sends notifications
   */
  submit: adminProcedure
    .input(z.object({
      id: z.string().cuid('ID de investigación inválido'),
      findings: z.string()
        .min(INVESTIGATION_FORM_LIMITS.findings.min, `Los comentarios deben tener al menos ${INVESTIGATION_FORM_LIMITS.findings.min} caracteres`)
        .max(INVESTIGATION_FORM_LIMITS.findings.max),
      verdict: z.nativeEnum(InvestigationVerdict),
      riskLevel: z.nativeEnum(RiskLevel),
    }))
    .mutation(async ({ input, ctx }) => {
      const investigation = await ctx.prisma.actorInvestigation.findUnique({
        where: { id: input.id },
        include: {
          policy: {
            include: {
              tenant: true,
              jointObligors: true,
              avals: true,
              landlords: { where: { isPrimary: true } },
              createdBy: { select: { id: true, email: true, name: true } },
              propertyDetails: {
                include: { propertyAddressDetails: true },
              },
            },
          },
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      // Check documents exist (mandatory)
      const documentsCount = await ctx.prisma.actorInvestigationDocument.count({
        where: { investigationId: input.id },
      });

      if (documentsCount === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Debe subir al menos un documento de soporte antes de enviar la investigación',
        });
      }

      // Early check for already submitted (will be enforced atomically below)
      if (investigation.submittedAt) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Investigation already submitted'
        });
      }

      const primaryLandlord = investigation.policy.landlords[0];
      const broker = investigation.policy.createdBy;

      // Validate that we have broker and landlord
      if (!broker?.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La póliza no tiene un broker asignado',
        });
      }

      if (!primaryLandlord?.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La póliza no tiene un arrendador principal con email',
        });
      }

      // Get actor details
      let actor = null;
      if (investigation.actorType === 'TENANT') {
        actor = investigation.policy.tenant;
      } else if (investigation.actorType === 'JOINT_OBLIGOR') {
        actor = investigation.policy.jointObligors.find(jo => jo.id === investigation.actorId);
      } else if (investigation.actorType === 'AVAL') {
        actor = investigation.policy.avals.find(a => a.id === investigation.actorId);
      }

      // Get current user (submitter)
      const submitter = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { name: true, email: true },
      });

      // Generate approval tokens
      const brokerToken = generateToken();
      const landlordToken = generateToken();
      const tokenExpiry = getInvestigationTokenExpiryDate();

      // Atomic update with submittedAt check to prevent race condition
      const updated = await ctx.prisma.$transaction(async (tx) => {
        // Try to update only if not yet submitted
        const result = await tx.actorInvestigation.updateMany({
          where: {
            id: input.id,
            submittedAt: null, // Atomic check
          },
          data: {
            findings: input.findings.trim(),
            verdict: input.verdict,
            riskLevel: input.riskLevel,
            submittedAt: new Date(),
            brokerToken,
            landlordToken,
            tokenExpiry,
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Investigation already submitted'
          });
        }

        // Return the updated investigation
        return tx.actorInvestigation.findUnique({
          where: { id: input.id },
        });
      });

      if (!updated) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update investigation' });
      }

      // Log activity
      await ctx.prisma.policyActivity.create({
        data: {
          policyId: investigation.policyId,
          action: 'investigation_submitted',
          description: `Investigación enviada para aprobación`,
          performedById: ctx.userId,
          performedByType: 'user',
          details: {
            investigationId: input.id,
            actorType: investigation.actorType,
            actorId: investigation.actorId,
            verdict: input.verdict,
            riskLevel: input.riskLevel,
          },
        },
      });

      // Prepare common email data
      const baseUrl = getBaseUrl();
      const actorName = getActorName(actor);
      const propertyAddress = investigation.policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'Dirección no disponible';
      const verdictLabel = getVerdictLabel(input.verdict);
      const riskLevelLabel = getRiskLevelLabel(input.riskLevel);
      const policyUrl = `${baseUrl}/dashboard/policies/${investigation.policyId}`;

      // Send email to broker
      await sendInvestigationApprovalRequestEmail({
        email: broker.email,
        recipientName: broker.name || undefined,
        recipientType: 'BROKER',
        policyNumber: investigation.policy.policyNumber,
        propertyAddress,
        actorType: investigation.actorType,
        actorName,
        verdict: verdictLabel,
        riskLevel: riskLevelLabel,
        approvalUrl: `${baseUrl}/investigation/approve/${brokerToken}`,
        expiryDate: tokenExpiry,
      });

      // Send email to landlord
      const landlordName = primaryLandlord.companyName || formatFullName({
        firstName: primaryLandlord.firstName,
        middleName: primaryLandlord.middleName,
        paternalLastName: primaryLandlord.paternalLastName,
        maternalLastName: primaryLandlord.maternalLastName,
      });

      await sendInvestigationApprovalRequestEmail({
        email: primaryLandlord.email,
        recipientName: landlordName || undefined,
        recipientType: 'LANDLORD',
        policyNumber: investigation.policy.policyNumber,
        propertyAddress,
        actorType: investigation.actorType,
        actorName,
        verdict: verdictLabel,
        riskLevel: riskLevelLabel,
        approvalUrl: `${baseUrl}/investigation/approve/${landlordToken}`,
        expiryDate: tokenExpiry,
      });

      // Send notification to admins
      const admins = await ctx.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        if (admin.email) {
          await sendInvestigationSubmittedEmail({
            email: admin.email,
            policyNumber: investigation.policy.policyNumber,
            propertyAddress,
            actorType: investigation.actorType,
            actorName,
            verdict: verdictLabel,
            riskLevel: riskLevelLabel,
            submittedBy: submitter?.name || submitter?.email || 'Staff',
            submittedAt: new Date(),
            policyUrl,
          });
        }
      }

      return {
        success: true,
        investigation: updated,
        approvalUrls: {
          broker: `${baseUrl}/investigation/approve/${brokerToken}`,
          landlord: `${baseUrl}/investigation/approve/${landlordToken}`,
          brokerPhone: broker.email, // For WhatsApp - broker doesn't have phone in User model
          landlordPhone: primaryLandlord?.phone || null,
          brokerName: broker.name || 'Broker',
          landlordName: landlordName,
        },
      };
    }),

  /**
   * Get investigation by approval token (Public)
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1, 'Token requerido') }))
    .query(async ({ input, ctx }) => {
      // Find by either broker or landlord token
      const investigation = await ctx.prisma.actorInvestigation.findFirst({
        where: {
          OR: [
            { brokerToken: input.token },
            { landlordToken: input.token },
          ],
        },
        include: {
          documents: true,
          policy: {
            select: {
              id: true,
              policyNumber: true,
              rentAmount: true,
              propertyDetails: {
                include: {
                  propertyAddressDetails: true,
                },
              },
            },
          },
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Token inválido' });
      }

      // Check token expiry (use <= for industry standard)
      if (investigation.tokenExpiry && investigation.tokenExpiry <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expired' });
      }

      // Determine token type using timing-safe comparison
      const isBrokerToken = safeCompareTokens(investigation.brokerToken, input.token);
      const isLandlordToken = safeCompareTokens(investigation.landlordToken, input.token);
      if (!isBrokerToken && !isLandlordToken) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Token inválido' });
      }
      const tokenType = isBrokerToken ? 'BROKER' : 'LANDLORD';

      // Get actor details (excluding internal notes)
      let actor = null;
      if (investigation.actorType === 'TENANT') {
        actor = await ctx.prisma.tenant.findUnique({
          where: { id: investigation.actorId },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            paternalLastName: true,
            maternalLastName: true,
            companyName: true,
            tenantType: true,
            email: true,
            phone: true,
          },
        });
      } else if (investigation.actorType === 'JOINT_OBLIGOR') {
        actor = await ctx.prisma.jointObligor.findUnique({
          where: { id: investigation.actorId },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            paternalLastName: true,
            maternalLastName: true,
            companyName: true,
            jointObligorType: true,
            email: true,
            phone: true,
          },
        });
      } else if (investigation.actorType === 'AVAL') {
        actor = await ctx.prisma.aval.findUnique({
          where: { id: investigation.actorId },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            paternalLastName: true,
            maternalLastName: true,
            companyName: true,
            avalType: true,
            email: true,
            phone: true,
          },
        });
      }

      // Return without internal tokens
      return {
        id: investigation.id,
        actorType: investigation.actorType,
        actor,
        findings: investigation.findings,
        verdict: investigation.verdict,
        riskLevel: investigation.riskLevel,
        status: investigation.status,
        approvedAt: investigation.approvedAt,
        approvedByType: investigation.approvedByType,
        documents: investigation.documents,
        policy: investigation.policy,
        tokenType,
        submittedAt: investigation.submittedAt,
      };
    }),

  /**
   * Get document download URL by token (Public)
   */
  getDocumentDownloadUrlByToken: publicProcedure
    .input(z.object({
      token: z.string().min(1, 'Token requerido'),
      documentId: z.string().cuid('ID de documento inválido'),
    }))
    .query(async ({ input, ctx }) => {
      // Verify token is valid
      const investigation = await ctx.prisma.actorInvestigation.findFirst({
        where: {
          OR: [
            { brokerToken: input.token },
            { landlordToken: input.token },
          ],
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      if (investigation.tokenExpiry && investigation.tokenExpiry <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expired' });
      }

      // Get document
      const document = await documentService.getInvestigationDocument(input.documentId);

      if (!document || document.investigationId !== investigation.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      const downloadUrl = await documentService.getDownloadUrl(
        document.s3Key,
        document.originalName,
        300
      );

      return {
        success: true,
        downloadUrl,
        fileName: document.originalName,
        expiresIn: 300,
      };
    }),

  /**
   * Approve investigation (Public - via token)
   * Uses atomic transaction to prevent race conditions
   */
  approve: publicProcedure
    .input(z.object({
      token: z.string().min(1, 'Token requerido'),
      notes: z.string().max(INVESTIGATION_FORM_LIMITS.approvalNotes.max).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // First, find the investigation to get all data for emails
      const investigation = await ctx.prisma.actorInvestigation.findFirst({
        where: {
          OR: [
            { brokerToken: input.token },
            { landlordToken: input.token },
          ],
        },
        include: {
          policy: {
            include: {
              tenant: true,
              jointObligors: true,
              avals: true,
              landlords: { where: { isPrimary: true } },
              createdBy: { select: { id: true, email: true, name: true } },
              propertyDetails: {
                include: { propertyAddressDetails: true },
              },
            },
          },
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      if (investigation.tokenExpiry && investigation.tokenExpiry <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expired' });
      }

      // Determine approver type using timing-safe comparison
      const isBroker = safeCompareTokens(investigation.brokerToken, input.token);
      const approverType: ApproverType = isBroker ? 'BROKER' : 'LANDLORD';

      const broker = investigation.policy.createdBy;
      const primaryLandlord = investigation.policy.landlords[0];

      // Validate we have both parties for notifications
      if (!broker?.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Broker not found' });
      }

      // Use approver ID consistently (broker ID or landlord ID)
      const approvedBy = isBroker ? broker.id : (primaryLandlord?.id || 'unknown');

      // Atomic update with status check to prevent race condition
      const updated = await ctx.prisma.$transaction(async (tx) => {
        // Try to update only if status is still PENDING
        const result = await tx.actorInvestigation.updateMany({
          where: {
            id: investigation.id,
            status: 'PENDING', // Atomic check
          },
          data: {
            status: 'APPROVED',
            approvedBy,
            approvedByType: approverType,
            approvedAt: new Date(),
            approvalNotes: input.notes?.trim(),
            // Invalidate both tokens
            brokerToken: null,
            landlordToken: null,
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Investigation already processed by another party'
          });
        }

        // Return the updated investigation
        return tx.actorInvestigation.findUnique({
          where: { id: investigation.id },
        });
      });

      if (!updated) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update investigation' });
      }

      // Log activity
      await ctx.prisma.policyActivity.create({
        data: {
          policyId: investigation.policyId,
          action: 'investigation_approved',
          description: `Investigación aprobada por ${approverType === 'BROKER' ? 'el broker' : 'el arrendador'}`,
          performedById: approvedBy,
          performedByType: approverType === 'BROKER' ? 'user' : 'landlord',
          details: {
            investigationId: investigation.id,
            actorType: investigation.actorType,
            actorId: investigation.actorId,
            approverType,
          },
        },
      });

      // Send notification emails
      const baseUrl = getBaseUrl();
      const policyUrl = `${baseUrl}/dashboard/policies/${investigation.policyId}`;
      const propertyAddress = investigation.policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'Dirección no disponible';

      // Get actor name
      let actor = null;
      if (investigation.actorType === 'TENANT') {
        actor = investigation.policy.tenant;
      } else if (investigation.actorType === 'JOINT_OBLIGOR') {
        actor = investigation.policy.jointObligors.find(jo => jo.id === investigation.actorId);
      } else if (investigation.actorType === 'AVAL') {
        actor = investigation.policy.avals.find(a => a.id === investigation.actorId);
      }
      const actorName = getActorName(actor);
      const approverName = isBroker ? (broker.name || 'Broker') : getActorName(primaryLandlord);

      // Send to admins
      const admins = await ctx.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        if (admin.email) {
          await sendInvestigationResultEmail({
            email: admin.email,
            recipientName: admin.name || undefined,
            recipientType: 'ADMIN',
            policyNumber: investigation.policy.policyNumber,
            propertyAddress,
            actorType: investigation.actorType,
            actorName,
            result: 'APPROVED',
            approvedBy: approverName,
            approvedByType: approverType,
            approvedAt: new Date(),
            notes: input.notes?.trim(),
            policyUrl,
          });
        }
      }

      // Send to broker
      if (broker.email) {
        await sendInvestigationResultEmail({
          email: broker.email,
          recipientName: broker.name || undefined,
          recipientType: 'BROKER',
          policyNumber: investigation.policy.policyNumber,
          propertyAddress,
          actorType: investigation.actorType,
          actorName,
          result: 'APPROVED',
          approvedBy: approverName,
          approvedByType: approverType,
          approvedAt: new Date(),
          notes: input.notes?.trim(),
          policyUrl,
        });
      }

      // Send to landlord
      if (primaryLandlord?.email) {
        const landlordName = getActorName(primaryLandlord);
        await sendInvestigationResultEmail({
          email: primaryLandlord.email,
          recipientName: landlordName || undefined,
          recipientType: 'LANDLORD',
          policyNumber: investigation.policy.policyNumber,
          propertyAddress,
          actorType: investigation.actorType,
          actorName,
          result: 'APPROVED',
          approvedBy: approverName,
          approvedByType: approverType,
          approvedAt: new Date(),
          notes: input.notes?.trim(),
        });
      }

      return {
        success: true,
        investigation: updated,
      };
    }),

  /**
   * Reject investigation (Public - via token)
   * Uses atomic transaction to prevent race conditions
   */
  reject: publicProcedure
    .input(z.object({
      token: z.string().min(1, 'Token requerido'),
      reason: z.string()
        .min(INVESTIGATION_FORM_LIMITS.rejectionReason.min, `El motivo debe tener al menos ${INVESTIGATION_FORM_LIMITS.rejectionReason.min} caracteres`)
        .max(INVESTIGATION_FORM_LIMITS.rejectionReason.max),
    }))
    .mutation(async ({ input, ctx }) => {
      // First, find the investigation to get all data for emails
      const investigation = await ctx.prisma.actorInvestigation.findFirst({
        where: {
          OR: [
            { brokerToken: input.token },
            { landlordToken: input.token },
          ],
        },
        include: {
          policy: {
            include: {
              tenant: true,
              jointObligors: true,
              avals: true,
              landlords: { where: { isPrimary: true } },
              createdBy: { select: { id: true, email: true, name: true } },
              propertyDetails: {
                include: { propertyAddressDetails: true },
              },
            },
          },
        },
      });

      if (!investigation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Investigation not found' });
      }

      if (investigation.tokenExpiry && investigation.tokenExpiry <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expired' });
      }

      // Determine rejector type using timing-safe comparison
      const isBroker = safeCompareTokens(investigation.brokerToken, input.token);
      const approverType: ApproverType = isBroker ? 'BROKER' : 'LANDLORD';

      const broker = investigation.policy.createdBy;
      const primaryLandlord = investigation.policy.landlords[0];

      // Validate we have broker
      if (!broker?.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Broker not found' });
      }

      // Use approver ID consistently
      const approvedBy = isBroker ? broker.id : (primaryLandlord?.id || 'unknown');

      // Atomic update with status check to prevent race condition
      const updated = await ctx.prisma.$transaction(async (tx) => {
        // Try to update only if status is still PENDING
        const result = await tx.actorInvestigation.updateMany({
          where: {
            id: investigation.id,
            status: 'PENDING', // Atomic check
          },
          data: {
            status: 'REJECTED',
            approvedBy,
            approvedByType: approverType,
            approvedAt: new Date(),
            rejectionReason: input.reason.trim(),
            // Invalidate both tokens
            brokerToken: null,
            landlordToken: null,
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Investigation already processed by another party'
          });
        }

        // Return the updated investigation
        return tx.actorInvestigation.findUnique({
          where: { id: investigation.id },
        });
      });

      if (!updated) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update investigation' });
      }

      // Log activity
      await ctx.prisma.policyActivity.create({
        data: {
          policyId: investigation.policyId,
          action: 'investigation_rejected',
          description: `Investigación rechazada por ${approverType === 'BROKER' ? 'el broker' : 'el arrendador'}`,
          performedById: approvedBy,
          performedByType: approverType === 'BROKER' ? 'user' : 'landlord',
          details: {
            investigationId: investigation.id,
            actorType: investigation.actorType,
            actorId: investigation.actorId,
            approverType,
            reason: input.reason.trim(),
          },
        },
      });

      // Send notification emails
      const baseUrl = getBaseUrl();
      const policyUrl = `${baseUrl}/dashboard/policies/${investigation.policyId}`;
      const propertyAddress = investigation.policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'Dirección no disponible';

      // Get actor name
      let actor = null;
      if (investigation.actorType === 'TENANT') {
        actor = investigation.policy.tenant;
      } else if (investigation.actorType === 'JOINT_OBLIGOR') {
        actor = investigation.policy.jointObligors.find(jo => jo.id === investigation.actorId);
      } else if (investigation.actorType === 'AVAL') {
        actor = investigation.policy.avals.find(a => a.id === investigation.actorId);
      }
      const actorName = getActorName(actor);
      const rejecterName = isBroker ? (broker.name || 'Broker') : getActorName(primaryLandlord);

      // Send to admins
      const admins = await ctx.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        if (admin.email) {
          await sendInvestigationResultEmail({
            email: admin.email,
            recipientName: admin.name || undefined,
            recipientType: 'ADMIN',
            policyNumber: investigation.policy.policyNumber,
            propertyAddress,
            actorType: investigation.actorType,
            actorName,
            result: 'REJECTED',
            approvedBy: rejecterName,
            approvedByType: approverType,
            approvedAt: new Date(),
            rejectionReason: input.reason.trim(),
            policyUrl,
          });
        }
      }

      // Send to broker
      if (broker.email) {
        await sendInvestigationResultEmail({
          email: broker.email,
          recipientName: broker.name || undefined,
          recipientType: 'BROKER',
          policyNumber: investigation.policy.policyNumber,
          propertyAddress,
          actorType: investigation.actorType,
          actorName,
          result: 'REJECTED',
          approvedBy: rejecterName,
          approvedByType: approverType,
          approvedAt: new Date(),
          rejectionReason: input.reason.trim(),
          policyUrl,
        });
      }

      // Send to landlord
      if (primaryLandlord?.email) {
        const landlordName = getActorName(primaryLandlord);
        await sendInvestigationResultEmail({
          email: primaryLandlord.email,
          recipientName: landlordName || undefined,
          recipientType: 'LANDLORD',
          policyNumber: investigation.policy.policyNumber,
          propertyAddress,
          actorType: investigation.actorType,
          actorName,
          result: 'REJECTED',
          approvedBy: rejecterName,
          approvedByType: approverType,
          approvedAt: new Date(),
          rejectionReason: input.reason.trim(),
        });
      }

      return {
        success: true,
        investigation: updated,
      };
    }),
});
