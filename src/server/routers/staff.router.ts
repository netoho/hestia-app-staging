import { z } from 'zod';
import {
  createTRPCRouter,
  adminProcedure,
} from '@/server/trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { generateInvitationToken } from '@/lib/services/userTokenService';
import { sendUserInvitation } from '@/lib/services/emailService';

const ListStaffSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'BROKER']).optional(),
});

const CreateStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['BROKER', 'ADMIN', 'STAFF']),
});

const UpdateStaffSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  role: z.enum(['BROKER', 'ADMIN', 'STAFF']).optional(),
});

export const staffRouter = createTRPCRouter({
  /**
   * List staff users with pagination and filters
   */
  list: adminProcedure
    .input(ListStaffSchema)
    .query(async ({ input }) => {
      const { page, limit, search, role } = input;
      const skip = (page - 1) * limit;

      const where: any = {
        isActive: true,
      };

      if (role) {
        where.role = role;
      }

      if (search?.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get a single staff user by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
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
   * Create a new staff user
   * Generates invitation token and sends invitation email
   */
  create: adminProcedure
    .input(CreateStaffSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, name, role } = input;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Create user without password - they'll set it via invitation
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          role,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Generate invitation token
      const token = await generateInvitationToken(newUser.id);

      // Build invitation URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const invitationUrl = `${appUrl}/onboard/${token}`;

      // Calculate expiry date (7 days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      // Get inviter info from context
      const inviter = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { name: true },
      });

      // Send invitation email
      const emailSent = await sendUserInvitation({
        email: newUser.email!,
        name: newUser.name || undefined,
        role: newUser.role as 'ADMIN' | 'STAFF' | 'BROKER',
        invitationUrl,
        expiryDate,
        inviterName: inviter?.name || undefined,
      });

      if (!emailSent) {
        console.error('Failed to send invitation email to:', newUser.email);
      }

      return {
        ...newUser,
        invitationSent: emailSent,
      };
    }),

  /**
   * Update a staff user
   */
  update: adminProcedure
    .input(UpdateStaffSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Soft delete (deactivate) a staff user
   * Sets isActive = false instead of deleting
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deactivation
      if (ctx.userId === input.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot deactivate yourself',
        });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: input.id },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Soft delete - set isActive to false
      await prisma.user.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),
});
