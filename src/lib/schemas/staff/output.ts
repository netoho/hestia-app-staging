/**
 * Output schemas for staff.* tRPC procedures.
 *
 * Admin-only management of internal users (ADMIN/STAFF/BROKER roles).
 */

import { z } from 'zod';
import { UserRole } from '@/prisma/generated/prisma-client/enums';

const StaffListItemShape = z.object({
  id: z.string(),
  internalId: z.number(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  avatarUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// staff.list — paginated
export const StaffListOutput = z.object({
  users: z.array(StaffListItemShape),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type StaffListOutput = z.infer<typeof StaffListOutput>;

// staff.getById
export const StaffGetByIdOutput = StaffListItemShape;
export type StaffGetByIdOutput = z.infer<typeof StaffGetByIdOutput>;

// staff.create — full user + invitationSent flag
export const StaffCreateOutput = z
  .object({
    id: z.string(),
    internalId: z.number(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    role: z.nativeEnum(UserRole),
    invitationSent: z.boolean(),
  })
  .passthrough();
export type StaffCreateOutput = z.infer<typeof StaffCreateOutput>;

// staff.update — returns updated User row
export const StaffUpdateOutput = z
  .object({
    id: z.string(),
    internalId: z.number(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    role: z.nativeEnum(UserRole),
  })
  .passthrough();
export type StaffUpdateOutput = z.infer<typeof StaffUpdateOutput>;

// staff.delete
export const StaffDeleteOutput = z.object({
  success: z.literal(true),
});
export type StaffDeleteOutput = z.infer<typeof StaffDeleteOutput>;
