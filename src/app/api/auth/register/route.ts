import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';
import { userService } from '@/lib/services/userService';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Public registration only creates BROKER accounts
    // ADMIN/STAFF accounts must be created via admin invitation
    const result = await userService.create({
      email,
      password,
      name,
      role: 'BROKER',
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.getUserMessage?.() ?? result.error.message },
        { status: result.error.statusCode ?? 400 }
      );
    }

    const user = result.value;

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email || '',
      role: user.role
    });

    return NextResponse.json({
      user,
      token
    }, { status: 201 });

  } catch {
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
