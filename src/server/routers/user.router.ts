import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

// Schema for updating user profile
const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
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
      const { currentPassword, newPassword, email, ...profileData } = input;

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const dataToUpdate: any = { ...profileData };

      // Handle email change
      if (email && email !== user.email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use',
          });
        }
        dataToUpdate.email = email;
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Current password is required',
          });
        }
        if (!user.password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot change password - no password set',
          });
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid current password',
          });
        }
        dataToUpdate.password = await bcrypt.hash(newPassword, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: ctx.userId },
        data: dataToUpdate,
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