import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword, verifyAuth } from '@/lib/auth';
import { getUsers, createUser } from '@/lib/services/userService';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { isDemoMode, DemoORM } from '@/lib/services/demoDatabase';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['broker', 'tenant', 'landlord', 'staff']),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(authResult.user.role, ['staff', 'admin'])) {
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
    
    const { email, name, password, role } = validation.data;

    // Check if user already exists
    let existingUser;
    if (isDemoMode()) {
      existingUser = await DemoORM.findUniqueUser({ email });
    } else {
      existingUser = await prisma.user.findUnique({ where: { email } });
    }
    
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const newUser = await createUser({
      email,
      name,
      password,
      role
    });

    return NextResponse.json(newUser, { status: 201 });

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
    
    if (!requireRole(authResult.user.role, ['staff', 'admin'])) {
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
