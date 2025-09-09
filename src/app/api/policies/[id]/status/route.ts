import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { addPolicyActivity } from '@/lib/services/policyApplicationService';
import { PolicyStatus } from '@/lib/prisma-types';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, reason } = body;

    // Validate status
    if (!Object.values(PolicyStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get current policy
    const policy = await prisma.policy.findUnique({
      where: { id }
    });

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Update policy status
    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        status,
        reviewedBy: authResult.user.id,
        reviewedAt: new Date(),
        ...(reason && { reviewReason: reason }),
      }
    });

    // Log activity
    await addPolicyActivity(
      id,
      status.toLowerCase(),
      authResult.user.id,
      {
        previousStatus: policy.status,
        newStatus: status,
        reason,
        reviewedBy: authResult.user.email,
      },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    return NextResponse.json({
      success: true,
      policy: updatedPolicy
    });

  } catch (error) {
    console.error('Update policy status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}