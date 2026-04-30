/**
 * Output schemas for onboard.* tRPC procedures.
 *
 * Staff invitation flow: validate token → set password → optionally upload
 * avatar within a 5-minute window.
 */

import { z } from 'zod';
import { UserRole } from '@/prisma/generated/prisma-client/enums';

const OnboardUserShape = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.nativeEnum(UserRole),
});

// onboard.validateToken
export const OnboardValidateTokenOutput = z.object({
  user: OnboardUserShape,
});
export type OnboardValidateTokenOutput = z.infer<typeof OnboardValidateTokenOutput>;

// onboard.complete
export const OnboardCompleteOutput = z.object({
  message: z.string(),
  user: OnboardUserShape,
});
export type OnboardCompleteOutput = z.infer<typeof OnboardCompleteOutput>;

// onboard.uploadAvatar
export const OnboardUploadAvatarOutput = z.object({
  success: z.literal(true),
  avatarUrl: z.string().nullable(),
});
export type OnboardUploadAvatarOutput = z.infer<typeof OnboardUploadAvatarOutput>;
