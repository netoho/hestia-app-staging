import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, tenantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, tenantId } = await params;

    // Verify tenant belongs to the policy
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        policyId: id,
      },
      include: {
        references: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user can access this policy
    const policy = await prisma.policy.findUnique({
      where: { id },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Brokers can only see their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tenant.references || [],
    });
  } catch (error) {
    console.error('Error fetching references:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch references' },
      { status: 500 }
    );
  }
}