import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createPolicy, updatePolicyStatus, addPolicyActivity } from '@/lib/services/policyApplicationService';
import { sendPolicyInvitation } from '@/lib/services/emailService';
import { PolicyStatus } from '@/lib/prisma-types';
import { z } from 'zod';

// Request validation schema
const initiatePolicySchema = z.object({
  tenantEmail: z.string().email('Invalid email address'),
  tenantPhone: z.string().optional(),
  tenantName: z.string().optional(),
  propertyId: z.string().optional(),
  propertyAddress: z.string().optional()
});

export async function POST(request: NextRequest) {
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
        { error: 'Forbidden: Only staff and admin can initiate policies' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = initiatePolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tenantEmail, tenantPhone, tenantName, propertyId, propertyAddress } = validation.data;

    // Create the policy
    const policy = await createPolicy({
      propertyId,
      initiatedBy: authResult.user.id,
      tenantEmail,
      tenantPhone
    });

    // Send invitation email
    const emailSent = await sendPolicyInvitation({
      tenantEmail,
      tenantName,
      propertyAddress,
      accessToken: policy.accessToken,
      expiryDate: policy.tokenExpiry,
      initiatorName: authResult.user.name || authResult.user.email
    });

    if (emailSent) {
      // Update policy status to SENT_TO_TENANT
      await updatePolicyStatus(
        policy.id,
        PolicyStatus.SENT_TO_TENANT,
        authResult.user.id
      );

      // Add activity log
      await addPolicyActivity(
        policy.id,
        'invitation_sent',
        authResult.user.id,
        { tenantEmail }
      );
    } else {
      // Log email failure but don't fail the whole operation
      await addPolicyActivity(
        policy.id,
        'invitation_failed',
        authResult.user.id,
        { tenantEmail, error: 'Email service error' }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      policy: {
        id: policy.id,
        tenantEmail: policy.tenantEmail,
        status: policy.status,
        accessToken: policy.accessToken,
        tokenExpiry: policy.tokenExpiry,
        emailSent
      },
      message: emailSent 
        ? 'Policy created and invitation sent successfully' 
        : 'Policy created but email sending failed. Please resend the invitation.'
    });

  } catch (error) {
    console.error('Policy initiation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}