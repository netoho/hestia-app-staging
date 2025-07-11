import { NextRequest, NextResponse } from 'next/server';
import { getPolicyByToken, updatePolicyStatus, addPolicyActivity } from '@/lib/services/policyApplicationService';
import { validatePolicyDocuments } from '@/lib/services/fileUploadService';
import { sendPolicySubmissionConfirmation } from '@/lib/services/emailService';
import { PolicyStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get policy by token
    const policy = await getPolicyByToken(token);

    if (!policy) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if policy is in a valid state
    if (policy.status !== PolicyStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Policy must be in progress to submit' },
        { status: 400 }
      );
    }

    // Validate all required data is present
    const missingSteps = [];
    if (!policy.profileData) missingSteps.push('Profile information');
    if (!policy.employmentData) missingSteps.push('Employment information');
    if (!policy.referencesData) missingSteps.push('References');

    if (missingSteps.length > 0) {
      return NextResponse.json(
        { 
          error: 'Incomplete application',
          missing: missingSteps 
        },
        { status: 400 }
      );
    }

    // Validate documents
    const documentValidation = await validatePolicyDocuments(policy.id);
    if (!documentValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Missing required documents',
          missing: documentValidation.missing 
        },
        { status: 400 }
      );
    }

    // Update policy status to SUBMITTED
    const submittedAt = new Date();
    await updatePolicyStatus(
      policy.id,
      PolicyStatus.SUBMITTED,
      'tenant',
      { 
        submittedAt,
        currentStep: 5 // Mark as complete
      }
    );

    // Log activity
    await addPolicyActivity(
      policy.id,
      'application_submitted',
      'tenant',
      { submittedAt },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    // Send confirmation email
    try {
      await sendPolicySubmissionConfirmation({
        tenantEmail: policy.tenantEmail,
        tenantName: (policy.profileData as any)?.name,
        policyId: policy.id,
        submittedAt
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the submission if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      policyId: policy.id,
      submittedAt
    });

  } catch (error) {
    console.error('Submit policy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}