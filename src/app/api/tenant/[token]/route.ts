import { NextRequest, NextResponse } from 'next/server';
import { getPolicyByToken, addPolicyActivity } from '@/lib/services/policyApplicationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Get policy by token
    const policy = await getPolicyByToken(token);

    if (!policy) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Log activity
    await addPolicyActivity(
      policy.id,
      'policy_accessed',
      'tenant',
      null,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    // Return policy data (excluding sensitive information)
    return NextResponse.json({
      id: policy.id,
      status: policy.status,
      currentStep: policy.currentStep,
      tenantEmail: policy.tenantEmail,
      profileData: policy.profileData,
      employmentData: policy.employmentData,
      referencesData: policy.referencesData,
      documentsData: policy.documentsData,
      documents: policy.documents.map(doc => ({
        id: doc.id,
        category: doc.category,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt
      }))
    });

  } catch (error) {
    console.error('Get policy by token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}