import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { getCurrentStorageProvider, getPublicDownloadUrl } from '@/lib/services/fileUploadService';
import { v4 as uuidv4 } from 'uuid';

// Allowed MIME types for avatars
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_AVATAR_SIZE = 20 * 1024 * 1024; // 20MB

// Schema for updating user profile
const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1, 'El teléfono es requerido'),
  companyName: z.string().optional(),
  address: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
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
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Tipo de archivo inválido. Solo se permiten JPEG, PNG, HEIC y WebP',
        });
      }

      // Decode base64 and validate size
      const buffer = Buffer.from(file, 'base64');
      if (buffer.length > MAX_AVATAR_SIZE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El archivo es muy grande. El tamaño máximo es 20MB',
        });
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
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al subir el avatar',
        });
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
        } catch (error) {
          console.error('Failed to delete old avatar:', error);
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
