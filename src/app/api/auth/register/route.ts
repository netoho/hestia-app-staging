import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';
import { UserRole } from "@/prisma/generated/prisma-client/enums";

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

    // Hash password and create user
    // Public registration only creates BROKER accounts
    // ADMIN/STAFF accounts must be created via admin invitation
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.BROKER
      }
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email || '',
      role: user.role
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      token
    }, { status: 201 });

  } catch {
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
