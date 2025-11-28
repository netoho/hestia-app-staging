import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationToken, clearInvitationToken } from '@/lib/services/userTokenService';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Schema for onboarding data
const onboardingSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// GET: Validate invitation token and return user info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate the token
    const user = await validateInvitationToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 401 }
      );
    }

    // Check if password has already been set
    if (user.passwordSetAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    // Return user info for display
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}

// POST: Complete onboarding by setting password and profile info
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate the token
    const user = await validateInvitationToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 401 }
      );
    }

    // Check if password has already been set
    if (user.passwordSetAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = onboardingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { password, phone, address } = validation.data;

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

    return NextResponse.json({
      message: 'Account setup completed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete account setup' },
      { status: 500 }
    );
  }
}