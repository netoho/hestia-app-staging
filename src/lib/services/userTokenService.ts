import prisma from '@/lib/prisma';
import { generateSecureToken } from '@/lib/utils/tokenUtils';
/**
 * Service for managing user invitation and password reset tokens
 */

/**
 * Generate an invitation token for a user
 * @param userId - The user ID to generate a token for
 * @param expiryDays - Number of days until token expires (default: 7)
 * @returns The generated token (unhashed)
 */
export async function generateInvitationToken(userId: string, expiryDays: number = 7): Promise<string> {
  const token = generateSecureToken();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  await prisma.user.update({
    where: { id: userId },
    data: {
      invitationToken: token,
      invitationTokenExpiry: expiryDate,
    },
  });

  return token;
}

/**
 * Validate an invitation token
 * @param token - The token to validate
 * @returns The user if token is valid, null otherwise
 */
export async function validateInvitationToken(token: string) {
  if (!token) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      invitationToken: token,
      invitationTokenExpiry: {
        gt: new Date(),
      },
      isActive: true,
    },
  });

  return user;
}

/**
 * Clear invitation token for a user (after successful use)
 * @param userId - The user ID to clear token for
 */
export async function clearInvitationToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      invitationToken: null,
      invitationTokenExpiry: null,
      passwordSetAt: new Date(),
    },
  });
}

/**
 * Check if a user has set their password
 * @param userId - The user ID to check
 * @returns True if password has been set
 */
export async function hasSetPassword(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordSetAt: true },
  });

  return user?.passwordSetAt !== null;
}

/**
 * Regenerate an invitation token (for resending invitations)
 * @param userId - The user ID to regenerate token for
 * @returns The new token
 */
export async function regenerateInvitationToken(userId: string): Promise<string> {
  // First check if user has already set password
  const hasPassword = await hasSetPassword(userId);
  if (hasPassword) {
    throw new Error('User has already set their password');
  }

  // Generate new token
  return generateInvitationToken(userId);
}

/**
 * Get invitation status for a user
 * @param userId - The user ID to check
 * @returns Status object with invitation details
 */
export async function getInvitationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      invitationToken: true,
      invitationTokenExpiry: true,
      passwordSetAt: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  const hasToken = !!user.invitationToken;
  const isExpired = user.invitationTokenExpiry ? user.invitationTokenExpiry < now : true;
  const isComplete = !!user.passwordSetAt;

  return {
    hasPendingInvitation: hasToken && !isExpired && !isComplete,
    invitationExpired: hasToken && isExpired && !isComplete,
    invitationComplete: isComplete,
    emailVerified: !!user.emailVerified,
    expiryDate: user.invitationTokenExpiry,
  };
}

// ============================================
// PASSWORD RESET TOKEN FUNCTIONS
// ============================================

/**
 * Generate a password reset token for a user by email
 * @param email - The email address to generate a token for
 * @param expiryHours - Number of hours until token expires (default: 1)
 * @returns The generated token and user ID if found, null if email not found
 */
export async function generatePasswordResetToken(email: string, expiryHours: number = 1): Promise<{ token: string; userId: string } | null> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, isActive: true },
  });

  // Don't reveal if user exists - return null silently
  if (!user || !user.isActive) {
    return null;
  }

  const token = generateSecureToken();
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + expiryHours);

  // Update user with reset token, invalidating any previous reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpiry: expiryDate,
    },
  });

  return { token, userId: user.id };
}

/**
 * Validate a password reset token
 * @param token - The token to validate
 * @returns The user if token is valid, null otherwise
 */
export async function validatePasswordResetToken(token: string) {
  if (!token) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return user;
}

/**
 * Clear password reset token for a user (after successful use)
 * @param userId - The user ID to clear token for
 */
export async function clearPasswordResetToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: null,
      resetTokenExpiry: null,
      passwordSetAt: new Date(),
    },
  });
}

/**
 * Check if a password reset token exists and is valid
 * @param email - The email to check
 * @returns True if a valid reset token exists
 */
export async function hasActivePasswordResetToken(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      resetToken: true,
      resetTokenExpiry: true,
    },
  });

  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    return false;
  }

  return user.resetTokenExpiry > new Date();
}
