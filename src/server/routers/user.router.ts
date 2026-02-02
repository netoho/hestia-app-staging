import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getCurrentStorageProvider, getPublicDownloadUrl } from '@/lib/services/fileUploadService';
import { v4 as uuidv4 } from 'uuid';
import {
  throwNotFound,
  throwConflict,
  throwValidationError,
  throwInternalError,
} from '@/lib/utils/trpcErrorHandler';

// Allowed MIME types for avatars
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_AVATAR_SIZE = 20 * 1024 * 1024; // 20MB

// Schema for updating user profile
const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1, 'Phone is required'),
  companyName: z.string().optional(),
  address: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .optional(),
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
          address: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throwNotFound('User', ctx.userId);
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
        throwNotFound('User', ctx.userId);
      }

      const dataToUpdate: Record<string, unknown> = { ...profileData };

      // Handle email change
      if (email && email !== user.email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          throwConflict('Email');
        }
        dataToUpdate.email = email;
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          throwValidationError('Current password is required');
        }
        if (!user.password) {
          throwValidationError('Cannot change password - no password set');
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          throwValidationError('Invalid current password');
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
          address: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Upload user avatar
   */
  uploadAvatar: protectedProcedure
    .input(z.object({
      file: z.string(), // Base64 encoded file
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { file, filename, contentType } = input;
      const userId = ctx.userId;

      // Validate content type
      if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
        throwValidationError('Invalid file type. Only JPEG, PNG, HEIC and WebP are allowed');
      }

      // Decode base64 and validate size
      const buffer = Buffer.from(file, 'base64');
      if (buffer.length > MAX_AVATAR_SIZE) {
        throwValidationError('File is too large. Maximum size is 20MB');
      }

      // Get current user for old avatar cleanup
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });

      // Generate unique filename and S3 key
      const fileExtension = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueId = uuidv4();
      const s3Key = `avatars/${userId}/${uniqueId}.${fileExtension}`;

      // Upload to S3
      const storageProvider = getCurrentStorageProvider();
      const uploadedPath = await storageProvider.publicUpload({
        path: s3Key,
        file: {
          buffer,
          originalName: filename,
          mimeType: contentType,
          size: buffer.length,
        },
        contentType,
        metadata: {
          userId,
          imageType: 'avatar',
        },
      });

      if (!uploadedPath) {
        throwInternalError('Failed to upload avatar');
      }

      // Get public URL
      const avatarUrl = getPublicDownloadUrl(uploadedPath);

      // Delete old avatar if exists
      if (currentUser?.avatarUrl) {
        try {
          let oldKey: string | null = null;
          if (currentUser.avatarUrl.includes('amazonaws.com')) {
            const url = new URL(currentUser.avatarUrl);
            oldKey = url.pathname.substring(1);
          } else if (currentUser.avatarUrl.startsWith('avatars/')) {
            oldKey = currentUser.avatarUrl;
          }
          if (oldKey && oldKey.startsWith('avatars/')) {
            await storageProvider.delete(oldKey);
          }
        } catch {
          // Ignore deletion errors
        }
      }

      // Update user's avatar URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      return {
        success: true,
        avatarUrl: updatedUser.avatarUrl,
        user: updatedUser,
      };
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
