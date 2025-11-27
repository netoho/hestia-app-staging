import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { ValidationStatus } from '@prisma/client';
import { validationService } from '@/lib/services/validationService';
import { reviewService } from '@/lib/services/reviewService';
import { getPolicyById } from '@/lib/services/policyService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { prisma } from '@/lib/prisma';
import { getDocumentDownloadUrl } from '@/lib/services/fileUploadService';

// Validation schemas
const ValidateSectionSchema = z.object({
  policyId: z.string(),
  actorType: z.enum(['landlord', 'tenant', 'jointObligor', 'aval']),
  actorId: z.string(),
  section: z.enum([
    'personal_info',
    'work_info',
    'financial_info',
    'references',
    'address',
    'company_info',
  ]),
  status: z.enum(['APPROVED', 'REJECTED', 'IN_REVIEW']),
  rejectionReason: z.string().optional(),
});

const ValidateDocumentSchema = z.object({
  policyId: z.string(),
  documentId: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'IN_REVIEW']),
  rejectionReason: z.string().optional(),
});

const AddNoteSchema = z.object({
  policyId: z.string(),
  note: z.string().min(1).max(5000),
  actorType: z.string().optional(),
  actorId: z.string().optional(),
  documentId: z.string().optional(),
});

const DeleteNoteSchema = z.object({
  policyId: z.string(),
  noteId: z.string(),
});

const GetProgressSchema = z.object({
  policyId: z.string(),
  detailed: z.boolean().optional().default(false),
});

export const reviewRouter = createTRPCRouter({
  /**
   * Get review progress for a policy
   * Supports both simple progress (numbers only) and detailed review data
   */
  getProgress: protectedProcedure
    .input(GetProgressSchema)
    .query(async ({ input, ctx }) => {
      // Check policy exists and user has access
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

      // Return detailed review data or simple progress
      if (input.detailed) {
        const reviewData = await reviewService.getPolicyReviewData(input.policyId);
        return reviewData;
      } else {
        const progress = await validationService.getValidationProgress(input.policyId);
        return progress;
      }
    }),

  /**
   * Validate a section for an actor
   * Only ADMIN and STAFF can validate
   */
  validateSection: adminProcedure
    .input(ValidateSectionSchema)
    .mutation(async ({ input, ctx }) => {
      // Check policy exists
      const policy = await getPolicyById(input.policyId);

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Check policy status allows validation
      const allowedStatuses = ['COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];
      if (!allowedStatuses.includes(policy.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot validate sections for policy in status ${policy.status}`,
        });
      }

      try {
        // Perform validation
        const result = await validationService.validateSection({
          policyId: input.policyId,
          actorType: input.actorType,
          actorId: input.actorId,
          section: input.section,
          status: input.status as ValidationStatus,
          validatedBy: ctx.userId,
          rejectionReason: input.rejectionReason,
        });

        // Log activity
        const actionDescription = input.status === 'APPROVED'
          ? `Approved ${input.section} section for ${input.actorType}`
          : input.status === 'REJECTED'
          ? `Rejected ${input.section} section for ${input.actorType}`
          : `Marked ${input.section} section as in review for ${input.actorType}`;

        await logPolicyActivity({
          policyId: input.policyId,
          action: 'validation',
          description: actionDescription,
          details: {
            actorType: input.actorType,
            actorId: input.actorId,
            section: input.section,
            status: input.status,
            rejectionReason: input.rejectionReason,
          },
          performedById: ctx.userId,
        });

        return {
          success: true,
          validation: result,
        };
      } catch (error) {
        console.error('Section validation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate section',
          cause: error,
        });
      }
    }),

  /**
   * Validate a document
   * Only ADMIN and STAFF can validate
   */
  validateDocument: adminProcedure
    .input(ValidateDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      // Check policy exists
      const policy = await getPolicyById(input.policyId);

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Check policy status allows validation
      const allowedStatuses = ['COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];
      if (!allowedStatuses.includes(policy.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot validate documents for policy in status ${policy.status}`,
        });
      }

      try {
        // Get document info for logging
        const document = await prisma.actorDocument.findUnique({
          where: { id: input.documentId },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Perform validation
        const result = await validationService.validateDocument({
          documentId: input.documentId,
          status: input.status as ValidationStatus,
          validatedBy: ctx.userId,
          rejectionReason: input.rejectionReason,
        });

        // Log activity
        const actionDescription = input.status === 'APPROVED'
          ? `Approved document: ${document.fileName}`
          : input.status === 'REJECTED'
          ? `Rejected document: ${document.fileName}`
          : `Marked document as in review: ${document.fileName}`;

        await logPolicyActivity({
          policyId: input.policyId,
          action: 'validation',
          description: actionDescription,
          details: {
            documentId: input.documentId,
            documentName: document.fileName,
            status: input.status,
            rejectionReason: input.rejectionReason,
          },
          performedById: ctx.userId,
        });

        return {
          success: true,
          validation: result,
        };
      } catch (error) {
        console.error('Document validation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate document',
          cause: error,
        });
      }
    }),

  /**
   * Add a review note
   * ADMIN, STAFF, and BROKER (own policies) can add notes
   */
  addNote: protectedProcedure
    .input(AddNoteSchema)
    .mutation(async ({ input, ctx }) => {
      // Check policy exists and user has access
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

      try {
        // Add the note
        const note = await validationService.addReviewNote({
          policyId: input.policyId,
          note: input.note,
          actorType: input.actorType,
          actorId: input.actorId,
          documentId: input.documentId,
          createdBy: ctx.userId,
        });

        // Log activity
        let noteContext = 'policy';
        if (input.actorType && input.actorId) {
          noteContext = `${input.actorType}`;
        } else if (input.documentId) {
          noteContext = 'document';
        }

        await logPolicyActivity({
          policyId: input.policyId,
          action: 'note_added',
          description: `Added review note to ${noteContext}`,
          details: {
            noteId: note.id,
            actorType: input.actorType,
            actorId: input.actorId,
            documentId: input.documentId,
          },
          performedById: ctx.userId,
        });

        return {
          success: true,
          note,
        };
      } catch (error) {
        console.error('Add note error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add note',
          cause: error,
        });
      }
    }),

  /**
   * Delete a review note
   * ADMIN and STAFF can delete any note
   * BROKER can delete own notes on own policies
   */
  deleteNote: protectedProcedure
    .input(DeleteNoteSchema)
    .mutation(async ({ input, ctx }) => {
      // Check policy exists and user has access
      const policy = await getPolicyById(input.policyId);

      if (!policy) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy not found',
        });
      }

      // Get the note to check ownership
      const note = await prisma.reviewNote.findUnique({
        where: { id: input.noteId },
      });

      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        });
      }

      // Check permissions
      if (ctx.userRole === 'BROKER') {
        // Brokers can only delete their own notes on their own policies
        if (policy.createdById !== ctx.userId || note.createdBy !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete your own notes on your own policies',
          });
        }
      }

      try {
        // Delete the note
        await prisma.reviewNote.delete({
          where: { id: input.noteId },
        });

        // Log activity
        await logPolicyActivity({
          policyId: input.policyId,
          action: 'note_deleted',
          description: 'Deleted review note',
          details: { noteId: input.noteId },
          performedById: ctx.userId,
        });

        return {
          success: true,
          deletedNoteId: input.noteId,
        };
      } catch (error) {
        console.error('Delete note error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete note',
          cause: error,
        });
      }
    }),

  /**
   * Get download URL for a document
   * Used by review UI to download documents for inspection
   */
  getDownloadUrl: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      documentId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // Check policy exists and user has access
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

      // Fetch document
      const document = await prisma.actorDocument.findUnique({
        where: { id: input.documentId },
      });

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