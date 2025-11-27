import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { getDocumentDownloadUrl } from '@/lib/services/fileUploadService';

export const documentRouter = createTRPCRouter({
  listByPolicy: protectedProcedure
    .input(z.object({ policyId: z.string() }))
    .query(async ({ input }) => {
      // Placeholder
      return [];
    }),

  /**
   * Get download URL for a document
   * Auth traces document -> actor -> policy relationship
   */
  getDownloadUrl: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Fetch document with actor to trace policy ownership
      const document = await prisma.actorDocument.findUnique({
        where: { id: input.documentId },
        include: {
          actor: {
            select: {
              policy: {
                select: {
                  id: true,
                  createdById: true,
                },
              },
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Check access for brokers (ADMIN/STAFF bypass)
      if (ctx.userRole === 'BROKER') {
        const policyCreatorId = document.actor?.policy?.createdById;
        if (policyCreatorId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this document',
          });
        }
      }

      if (!document.s3Key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document has no associated file',
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