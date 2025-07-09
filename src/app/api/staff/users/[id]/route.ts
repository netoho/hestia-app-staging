import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, requireRole, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['broker', 'tenant', 'landlord', 'staff']).optional(),
  password: z.string().min(6).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has staff role
    if (!requireRole(auth.role, ['staff'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        brokerPolicies: { select: { id: true } },
        tenantPolicies: { select: { id: true } },
        landlordPolicies: { select: { id: true } }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has staff role
    if (!requireRole(auth.role, ['staff'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { email, name, role, password } = validation.data;
    
    // Prepare update data
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (password !== undefined) updateData.password = await hashPassword(password);
    
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has staff role
    if (!requireRole(auth.role, ['staff'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Prevent self-deletion
    if (auth.userId === params.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }
    
    await prisma.user.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}