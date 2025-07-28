import { NextRequest, NextResponse } from 'next/server';
import { getPolicyByToken, addPolicyActivity } from '@/lib/services/policyApplicationService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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

    // Transform profile data based on tenant type
    let profileData = null;
    if (policy.tenantType === 'company' && policy.companyProfileData) {
      // Transform company profile data back to form format
      const companyProfile = policy.companyProfileData as any;
      const legalRep = companyProfile.legalRepresentative;
      
      if (legalRep) {
        profileData = {
          legalRepNationality: legalRep.nationality.toLowerCase(),
          legalRepCurp: legalRep.curp || '',
          legalRepPassport: legalRep.passport || '',
          legalRepFullName: legalRep.fullName,
          companyTaxAddress: companyProfile.taxAddress,
          companyTaxRegime: companyProfile.taxRegime,
        };
      }
    } else if (policy.profileData) {
      profileData = policy.profileData;
    }

    // Return policy data (excluding sensitive information)
    return NextResponse.json({
      id: policy.id,
      status: policy.status,
      currentStep: policy.currentStep,
      tenantType: policy.tenantType,
      tenantEmail: policy.tenantEmail,
      tenantName: policy.tenantName,
      companyName: policy.companyName,
      companyRfc: policy.companyRfc,
      legalRepresentativeName: policy.legalRepresentativeName,
      profileData: profileData,
      employmentData: policy.employmentData || policy.companyFinancialData,
      referencesData: policy.referencesData || policy.companyReferencesData,
      documentsData: policy.documentsData,
      packageId: policy.packageId,
      packageName: policy.packageName,
      price: policy.totalPrice,
      paymentStatus: policy.paymentStatus,
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