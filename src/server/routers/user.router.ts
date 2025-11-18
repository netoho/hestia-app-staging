import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

// Schema for updating user profile
const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
});

export const userRouter = createTRPCRouter({
  /**
   * Get current user profile
   */
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          address: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  /**
   * Update current user profile
   */
  updateProfile: protectedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.userId },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          address: true,
          avatarUrl: true,
          role: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Upload user avatar (placeholder - AWS integration needed)
   */
  uploadAvatar: protectedProcedure
    .input(z.object({
      file: z.string(), // Base64 encoded file
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement AWS S3 upload when AWS utilities are available
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Avatar upload not yet implemented',
      });
    }),

  /**
   * Delete user avatar (placeholder - AWS integration needed)
   */
  deleteAvatar: protectedProcedure
    .mutation(async ({ ctx }) => {
      // TODO: Implement AWS S3 delete when AWS utilities are available
      const updatedUser = await prisma.user.update({
        where: { id: ctx.userId },
        data: { avatarUrl: null },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Get user statistics (for dashboard)
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const [totalPolicies, activePolicies, pendingPolicies] = await Promise.all([
        prisma.policy.count({
          where: { createdById: ctx.userId },
        }),
        prisma.policy.count({
          where: {
            createdById: ctx.userId,
            status: { in: ['ACTIVE', 'CONTRACT_SIGNED'] },
          },
        }),
        prisma.policy.count({
          where: {
            createdById: ctx.userId,
            status: { in: ['COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'] },
          },
        }),
      ]);

      return {
        totalPolicies,
        activePolicies,
        pendingPolicies,
      };
    }),
});