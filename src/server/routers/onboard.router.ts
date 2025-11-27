import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { validateInvitationToken, clearInvitationToken } from '@/lib/services/userTokenService';
import { hashPassword } from '@/lib/auth';

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
      password: z.string().min(6, 'Password must be at least 6 characters'),
      phone: z.string().optional(),
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
});
