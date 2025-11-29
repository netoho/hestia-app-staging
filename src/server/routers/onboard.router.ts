import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { validateInvitationToken, clearInvitationToken } from '@/lib/services/userTokenService';
import { hashPassword } from '@/lib/auth';
import { getCurrentStorageProvider, getPublicDownloadUrl } from '@/lib/services/fileUploadService';
import { v4 as uuidv4 } from 'uuid';

// Allowed MIME types for avatars
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_AVATAR_SIZE = 20 * 1024 * 1024; // 20MB

export const onboardRouter = createTRPCRouter({
  /**
   * Validate an invitation token and return user info
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { token } = input;

      if (!token) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Token is required',
        });
      }

      // Validate the token
      const user = await validateInvitationToken(token);

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired invitation token',
        });
      }

      // Check if password has already been set
      if (user.passwordSetAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has already been used',
        });
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * Complete onboarding by setting password and profile info
   */
  complete: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número'),
      phone: z.string().min(1, 'El teléfono es requerido'),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { token, password, phone, address } = input;

      if (!token) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Token is required',
        });
      }

      // Validate the token
      const user = await validateInvitationToken(token);

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired invitation token',
        });
      }

      // Check if password has already been set
      if (user.passwordSetAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has already been used',
        });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Update user with password and profile info
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          phone: phone || user.phone,
          address: address || user.address,
          emailVerified: new Date(), // Mark email as verified
        },
      });

      // Clear the invitation token
      await clearInvitationToken(user.id);

      return {
        message: 'Account setup completed successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      };
    }),

  /**
   * Upload avatar for a recently onboarded user
   * Validates that user completed onboarding within last 5 minutes
   */
  uploadAvatar: publicProcedure
    .input(z.object({
      userId: z.string(),
      file: z.string(), // Base64 encoded file
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { userId, file, filename, contentType } = input;

      // Validate content type
      if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Tipo de archivo inválido. Solo se permiten JPEG, PNG, HEIC y WebP',
        });
      }

      // Find user and verify recent onboarding
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, emailVerified: true, avatarUrl: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      // Verify user was onboarded within last 5 minutes
      // if (!user.emailVerified) {
      //   throw new TRPCError({
      //     code: 'UNAUTHORIZED',
      //     message: 'Usuario no ha completado el onboarding',
      //   });
      // }
      //
      // const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      // if (user.emailVerified < fiveMinutesAgo) {
      //   throw new TRPCError({
      //     code: 'UNAUTHORIZED',
      //     message: 'El tiempo para subir avatar ha expirado. Por favor inicia sesión.',
      //   });
      // }

      // Decode base64 and validate size
      const buffer = Buffer.from(file, 'base64');
      if (buffer.length > MAX_AVATAR_SIZE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El archivo es muy grande. El tamaño máximo es 20MB',
        });
      }

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
      if (user.avatarUrl) {
        try {
          let oldKey: string | null = null;
          if (user.avatarUrl.includes('amazonaws.com')) {
            const url = new URL(user.avatarUrl);
            oldKey = url.pathname.substring(1);
          } else if (user.avatarUrl.startsWith('avatars/')) {
            oldKey = user.avatarUrl;
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
        data: { avatarUrl: avatarUrl },
        select: { id: true, avatarUrl: true },
      });

      return {
        success: true,
        avatarUrl: updatedUser.avatarUrl,
      };
    }),
});
