import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, dualAuthProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { DocumentCategory } from '@/prisma/generated/prisma-client/enums';
import { documentService } from '@/lib/services/DocumentService';
import { ActorAuthService } from '@/lib/services/ActorAuthService';

// Actor types schema (shared with actor router)
const ActorTypeSchema = z.enum(['tenant', 'landlord', 'aval', 'jointObligor']);

export const documentRouter = createTRPCRouter({
  /**
   * Get presigned URL for document upload
   * Creates a pending document record and returns URL for direct S3 upload
   */
  getUploadUrl: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      category: z.nativeEnum(DocumentCategory),
      documentType: z.string(),
      fileName: z.string(),
      contentType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

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

      // Check if editing is allowed for actors
      if (!auth.canEdit && auth.authType === 'actor') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot upload documents after completing information',
        });
      }

      // Get policy number for S3 path
      const policy = auth.actor.policy;
      const policyNumber = policy?.policyNumber || auth.actor.policyId;

      // Determine uploader
      const uploadedBy = auth.authType === 'admin' ? auth.userId || 'admin' : 'self';

      try {
        const result = await documentService.generateUploadUrl({
          policyNumber,
          policyId: auth.actor.policyId,
          actorType: input.type,
          actorId: auth.actor.id,
          category: input.category,
          documentType: input.documentType,
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
          uploadedBy,
        });

        return {
          success: true,
          uploadUrl: result.uploadUrl,
          documentId: result.documentId,
          s3Key: result.s3Key,
          expiresIn: result.expiresIn,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to generate upload URL',
        });
      }
    }),

  /**
   * Confirm upload completed
   * Verifies file exists in S3 and marks document as complete
   */
  confirmUpload: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      documentId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

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

      // Verify document belongs to this actor
      const document = await documentService.getById(input.documentId);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Check ownership
      const actorField = input.type === 'jointObligor' ? 'jointObligorId' : `${input.type}Id`;
      if ((document as any)[actorField] !== auth.actor.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Document does not belong to this actor',
        });
      }

      try {
        const result = await documentService.confirmUpload(input.documentId);

        return {
          success: result.success,
          document: result.document,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to confirm upload',
        });
      }
    }),

  /**
   * List documents for an actor
   */
  listDocuments: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

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

      const documents = await documentService.getByActor(auth.actor.id, input.type);

      return {
        success: true,
        documents,
      };
    }),

  /**
   * Delete a document
   */
  deleteDocument: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      documentId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

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

      // Check if editing is allowed for actors
      if (!auth.canEdit && auth.authType === 'actor') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete documents after completing information',
        });
      }

      // Get document and verify ownership
      const document = await documentService.getById(input.documentId);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Check ownership for actor auth
      if (auth.authType === 'actor') {
        const actorField = input.type === 'jointObligor' ? 'jointObligorId' : `${input.type}Id`;
        if ((document as any)[actorField] !== auth.actor.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This document does not belong to this actor',
          });
        }
      }

      const deleted = await documentService.deleteDocument(input.documentId);

      if (!deleted) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete document',
        });
      }

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    }),

  /**
   * Get presigned download URL for a document
   */
  getDownloadUrl: dualAuthProcedure
    .input(z.object({
      type: ActorTypeSchema,
      identifier: z.string(),
      documentId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const authService = new ActorAuthService();

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

      const document = await documentService.getById(input.documentId);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Check ownership for actor auth
      if (auth.authType === 'actor') {
        const actorField = input.type === 'jointObligor' ? 'jointObligorId' : `${input.type}Id`;
        if ((document as any)[actorField] !== auth.actor.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This document does not belong to this actor',
          });
        }
      }

      if (!document.s3Key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document has no associated file',
        });
      }

      const downloadUrl = await documentService.getDownloadUrl(
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

  // ============================================
  // ADMIN-ONLY PROCEDURES (for broker portal)
  // ============================================

  /**
   * Get download URL by document ID (admin/broker only)
   * Used in broker dashboard to download actor documents
   */
  getDownloadUrlById: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const document = await documentService.getById(input.documentId);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      if (!document.s3Key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document has no associated file',
        });
      }

      // Check access for brokers (ADMIN/STAFF bypass)
      if (ctx.userRole === 'BROKER') {
        const actorId = (document.landlordId || document.tenantId || document.jointObligorId || document.avalId) as string;

        const policy = await ctx.prisma.policy.findFirst({
          where: {
            OR: [
              { landlords: { some: { id: actorId } } },
              { tenant: { id: actorId } },
              { jointObligors: { some: { id: actorId } } },
              { avals: { some: { id: actorId } } },
            ],
          },
          select: { createdById: true },
        });

        if (policy?.createdById !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this document',
          });
        }
      }

      const downloadUrl = await documentService.getDownloadUrl(
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

  /**
   * List documents by policy (admin/broker only)
   */
  listByPolicy: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Get all actors for this policy and their documents
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: input.policyId },
        include: {
          tenant: {
            include: { documents: true },
          },
          landlords: {
            include: { documents: true },
          },
          jointObligors: {
            include: { documents: true },
          },
          avals: {
            include: { documents: true },
          },
        },
      });

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Check broker access
      if (ctx.userRole === 'BROKER' && policy.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this policy',
        });
      }

      // Collect all documents
      const documents = [
        ...(policy.tenant?.documents || []).map(d => ({ ...d, actorType: 'tenant' as const })),
        ...policy.landlords.flatMap(l => l.documents.map(d => ({ ...d, actorType: 'landlord' as const }))),
        ...policy.jointObligors.flatMap(jo => jo.documents.map(d => ({ ...d, actorType: 'jointObligor' as const }))),
        ...policy.avals.flatMap(a => a.documents.map(d => ({ ...d, actorType: 'aval' as const }))),
      ];

      return documents;
    }),
});
