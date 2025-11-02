import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword, verifyAuth } from '@/lib/auth';
import { getUsers, createUser } from '@/lib/services/userService';
import { generateInvitationToken } from '@/lib/services/userTokenService';
import { sendUserInvitation } from '@/lib/services/emailService';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['BROKER', 'ADMIN', 'STAFF']),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(authResult.user.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, name, role } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Create user without password - they'll set it via invitation
    const newUser = await createUser({
      email,
      name,
      role,
      // No password provided - user will set it through invitation
    });

    // Generate invitation token
    const token = await generateInvitationToken(newUser.id);

    // Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${appUrl}/onboard/${token}`;

    // Calculate expiry date (7 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Send invitation email
    const emailSent = await sendUserInvitation({
      email: newUser.email!,
      name: newUser.name || undefined,
      role: newUser.role as 'ADMIN' | 'STAFF' | 'BROKER',
      invitationUrl,
      expiryDate,
      inviterName: authResult.user.name || undefined,
    });

    if (!emailSent) {
      console.error('Failed to send invitation email to:', newUser.email);
      // Don't fail the request, user can resend invitation later
    }

    return NextResponse.json({
      ...newUser,
      invitationSent: emailSent,
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(authResult.user.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await getUsers({
      role: role || undefined,
      search: search || undefined,
      page,
      limit,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
