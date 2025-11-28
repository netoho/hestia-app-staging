import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPolicyById, addPolicyActivity } from '@/lib/services/policyApplicationService';
import { sendPolicyInvitation } from '@/lib/services/emailService';
import { PolicyStatus, PolicyStatusType } from '@/lib/prisma-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission (staff or admin only)
    if (!['staff', 'admin'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff and admin can resend invitations' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Get the policy
    const policy = await getPolicyById(id);
    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check if policy is in a state where resending makes sense
    const resendableStatuses: PolicyStatusType[] = [PolicyStatus.DRAFT, PolicyStatus.COLLECTING_INFO, PolicyStatus.UNDER_INVESTIGATION];
    if (!resendableStatuses.includes(policy.status)) {
      return NextResponse.json(
        { error: 'Cannot resend invitation for policies in this state' },
        { status: 400 }
      );
    }

    // Parse request body for optional data
    const body = await request.json().catch(() => ({}));
    const { tenantName, propertyAddress } = body;

    // Send the invitation email
    const emailSent = await sendPolicyInvitation({
      tenantEmail: policy.tenantEmail,
      tenantName: tenantName || undefined,
      propertyAddress: propertyAddress || undefined,
      accessToken: policy.accessToken,
      expiryDate: policy.tokenExpiry,
      initiatorName: authResult.user.name || authResult.user.email
    });

    if (emailSent) {
      // Log the resend activity
      await addPolicyActivity(
        policy.id,
        'invitation_resent',
        authResult.user.id,
        { 
          tenantEmail: policy.tenantEmail,
          resentBy: authResult.user.email
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully'
      });
    } else {
      // Log the failure
      await addPolicyActivity(
        policy.id,
        'invitation_resend_failed',
        authResult.user.id,
        { 
          tenantEmail: policy.tenantEmail,
          error: 'Email service error'
        }
      );

      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Resend invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}