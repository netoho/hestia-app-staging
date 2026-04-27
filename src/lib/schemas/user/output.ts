/**
 * Output schemas for user.* tRPC procedures.
 *
 * The `userService.update(...)` call returns a User row whose exact shape
 * is what the frontend reads. Locking the shape here means dropping a
 * column from the User select set will break the corresponding test.
 */

import { z } from 'zod';
import { UserRole } from '@/prisma/generated/prisma-client/enums';

// Mirrors what userService selects (`userSelect`). `emailVerified`,
// `password`, and the various invitation/reset token fields are intentionally
// excluded — userService never returns them.
const UserPublicShape = z.object({
  id: z.string(),
  internalId: z.number(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// `getProfile` selects a narrower subset.
export const UserGetProfileOutput = z.object({
  id: z.string(),
  internalId: z.number(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  createdAt: z.date(),
});
export type UserGetProfileOutput = z.infer<typeof UserGetProfileOutput>;

// `updateProfile` returns the full updated User from userService.update.
export const UserUpdateProfileOutput = UserPublicShape.passthrough();
export type UserUpdateProfileOutput = z.infer<typeof UserUpdateProfileOutput>;

// `uploadAvatar`
export const UserUploadAvatarOutput = z.object({
  success: z.literal(true),
  avatarUrl: z.string().nullable(),
  user: UserPublicShape.passthrough(),
});
export type UserUploadAvatarOutput = z.infer<typeof UserUploadAvatarOutput>;

// `deleteAvatar` — returns the updated User.
export const UserDeleteAvatarOutput = UserPublicShape.passthrough();
export type UserDeleteAvatarOutput = z.infer<typeof UserDeleteAvatarOutput>;

// `getStats`
export const UserGetStatsOutput = z.object({
  totalPolicies: z.number(),
  activePolicies: z.number(),
  pendingPolicies: z.number(),
});
export type UserGetStatsOutput = z.infer<typeof UserGetStatsOutput>;

// Re-export for staff/onboard reuse.
export { UserPublicShape };
