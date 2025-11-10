import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generatePasswordResetToken } from '@/lib/services/userTokenService';
import { sendPasswordResetEmail } from '@/lib/services/emailService';
import { passwordResetByEmailLimiter, passwordResetByIPLimiter, combineRateLimiters } from '@/lib/auth/rateLimiter';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, ingresa un correo electrónico válido'),
});

// Combined rate limiter for this endpoint
const rateLimiter = combineRateLimiters(passwordResetByEmailLimiter, passwordResetByIPLimiter);

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Add artificial delay to prevent timing attacks (1-2 seconds)
    const delayMs = Math.random() * 1000 + 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Generate password reset token (returns null if user not found)
    const tokenData = await generatePasswordResetToken(email);

    if (tokenData) {
      // Construct reset URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hestiaplp.com.mx';
      const resetUrl = `${baseUrl}/reset-password/${tokenData.token}`;

      // Send password reset email
      await sendPasswordResetEmail({
        email,
        resetUrl,
        expiryHours: 1,
      });

      // Log the password reset attempt (for security monitoring)
      console.log(`[SECURITY] Password reset requested for email: ${email.substring(0, 3)}***@***.*** at ${new Date().toISOString()}`);
    } else {
      // Log failed attempts (user not found) for security monitoring
      console.log(`[SECURITY] Password reset attempted for non-existent email: ${email.substring(0, 3)}***@***.*** at ${new Date().toISOString()}`);
    }

    // Always return the same response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'Si existe una cuenta con ese correo electrónico, recibirás un enlace para restablecer tu contraseña en breve.',
    });
  } catch (error) {
    console.error('[ERROR] Password reset request failed:', error);

    // Return generic error to avoid leaking information
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. Por favor, intenta de nuevo más tarde.' },
      { status: 500 }
    );
  }
}