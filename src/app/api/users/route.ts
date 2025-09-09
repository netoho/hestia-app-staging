import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createUser } from '@/lib/services/userService';
import { z } from 'zod';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    // The 'role' field is now a string, so we just need to convert it to lowercase
    const formattedUsers = users.map((user: any) => ({
      ...user,
      role: user.role.toLowerCase()
    }))

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['broker', 'tenant', 'landlord']).default('tenant'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const newUser = await createUser(validation.data);

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
