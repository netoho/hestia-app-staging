import { NextRequest, NextResponse } from 'next/server';
import { withPolicyAuth } from '@/lib/middleware/policyAuth';
import { updatePolicyStatus, logPolicyActivity } from '@/lib/services/policyService';

export const GET = withPolicyAuth(async (
  request: NextRequest,
  { params },
  authResult
) => {
  try {
    // Policy is already loaded and authorized by middleware
    return NextResponse.json(authResult.policy);

  } catch (error) {
    console.error('Get policy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = withPolicyAuth(async (
  request: NextRequest,
  { params },
  authResult
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewNotes, reviewReason } = body;

    // Only ADMIN and STAFF can update policy status
    if (authResult.user.role === 'BROKER') {
      return NextResponse.json(
        { error: 'Forbidden: Brokers cannot update policy status' },
        { status: 403 }
      );
    }

    // Update policy status using service
    const updatedPolicy = await updatePolicyStatus(
      id,
      status,
      authResult.user.id,
      reviewNotes,
      reviewReason
    );

    if (!updatedPolicy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: status.toLowerCase(),
      description: `Policy status updated to ${status}`,
      details: {
        status,
        reviewNotes,
        reviewReason,
        managedBy: authResult.user.email,
      },
      performedById: authResult.user.id,
      performedByActor: undefined,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    });

    return NextResponse.json(updatedPolicy);

  } catch (error) {
    console.error('Update policy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
