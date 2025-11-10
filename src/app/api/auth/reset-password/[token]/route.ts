import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validatePasswordResetToken, clearPasswordResetToken } from '@/lib/services/userTokenService';
import { hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/services/emailService';

// Password validation schema with complexity requirements
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// GET: Validate token and return user info
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    // Validate token
    const user = await validatePasswordResetToken(token);

    if (!user) {
      return NextResponse.json(
        {
          error: 'Token inválido o expirado',
          expired: true
        },
        { status: 400 }
      );
    }

    // Return masked email for confirmation
    const email = user.email || '';
    const [localPart, domain] = email.split('@');
    const maskedEmail = localPart.length > 2
      ? `${localPart.substring(0, 2)}***@${domain}`
      : `***@${domain}`;

    return NextResponse.json({
      success: true,
      email: maskedEmail,
      name: user.name,
    });
  } catch (error) {
    console.error('[ERROR] Token validation failed:', error);
    return NextResponse.json(
      { error: 'Error al validar el token' },
      { status: 500 }
    );
  }
}

// POST: Reset password with valid token
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Validate token again
    const user = await validatePasswordResetToken(token);

    if (!user) {
      return NextResponse.json(
        {
          error: 'Token inválido o expirado',
          expired: true
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token in a transaction
    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordSetAt: new Date(),
          // Clear reset token
          resetToken: null,
          resetTokenExpiry: null,
          // Also verify email if not already verified
          emailVerified: user.email ? new Date() : undefined,
        },
      });

      // Invalidate all existing sessions for this user (force re-login)
      await tx.session.deleteMany({
        where: { userId: user.id },
      });
    });

    // Log successful password reset for security monitoring
    console.log(`[SECURITY] Password successfully reset for user: ${user.id} at ${new Date().toISOString()}`);

    // Send confirmation email
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hestiaplp.com.mx';
      await sendPasswordConfirmationEmail({
        email: user.email || '',
        name: user.name,
        loginUrl: `${baseUrl}/login`,
      });
    } catch (emailError) {
      // Don't fail the reset if confirmation email fails
      console.error('[WARNING] Failed to send password reset confirmation email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error) {
    console.error('[ERROR] Password reset failed:', error);
    return NextResponse.json(
      { error: 'Error al restablecer la contraseña. Por favor, intenta de nuevo.' },
      { status: 500 }
    );
  }
}

// Helper function to send confirmation email (add to emailService later)
async function sendPasswordConfirmationEmail(data: { email: string; name?: string; loginUrl: string }) {
  // For now, we'll just log it
  console.log(`[INFO] Password reset confirmation would be sent to ${data.email}`);
  // TODO: Implement confirmation email template
  return true;
}