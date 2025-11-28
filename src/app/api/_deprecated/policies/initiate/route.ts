import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createPolicy, updatePolicyStatus, addPolicyActivity } from '@/lib/services/policyApplicationService';
import { sendPolicyInvitation } from '@/lib/services/emailService';
import { PolicyStatus } from '@/lib/enums';
import { z } from 'zod';

// Request validation schema
const initiatePolicySchema = z.object({
  // Tenant type
  tenantType: z.enum(['individual', 'company']).default('individual'),
  
  // Common fields
  tenantEmail: z.string().email('Invalid email address'),
  tenantPhone: z.string().optional(),
  
  // Individual tenant fields
  tenantName: z.string().optional(),
  
  // Company tenant fields
  companyName: z.string().optional(),
  companyRfc: z.string().optional(),
  legalRepresentativeName: z.string().optional(),
  legalRepresentativeId: z.string().optional(),
  companyAddress: z.string().optional(),
  
  // Property info
  propertyId: z.string().optional(),
  propertyAddress: z.string().optional(),
  
  // Package and pricing
  packageId: z.string().min(1, 'Package is required'),
  price: z.number().min(0, 'Price must be positive'),
  investigationFee: z.number().min(0, 'Investigation fee must be positive').default(200),
  tenantPaymentPercent: z.number().min(0).max(100, 'Percentage must be between 0 and 100').default(100),
  landlordPaymentPercent: z.number().min(0).max(100, 'Percentage must be between 0 and 100').default(0),
  contractLength: z.number().min(1).max(60, 'Contract length must be between 1 and 60 months').default(12),
}).refine((data) => data.tenantPaymentPercent + data.landlordPaymentPercent === 100, {
  message: "Payment percentages must add up to 100%",
  path: ["tenantPaymentPercent"],
}).superRefine((data, ctx) => {
  // Validate required fields based on tenant type
  if (data.tenantType === 'individual' && !data.tenantName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Tenant name is required for individual tenants",
      path: ["tenantName"],
    });
  } else if (data.tenantType === 'company') {
    if (!data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required for company tenants",
        path: ["companyName"],
      });
    }
    if (!data.companyRfc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company RFC is required for company tenants",
        path: ["companyRfc"],
      });
    }
    if (!data.legalRepresentativeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Legal representative name is required for company tenants",
        path: ["legalRepresentativeName"],
      });
    }
  }
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

    const { 
      tenantType,
      tenantEmail, 
      tenantPhone, 
      tenantName,
      companyName,
      companyRfc,
      legalRepresentativeName,
      legalRepresentativeId,
      companyAddress,
      propertyId, 
      propertyAddress, 
      packageId, 
      price,
      investigationFee,
      tenantPaymentPercent,
      landlordPaymentPercent,
      contractLength
    } = validation.data;

    // Fetch package details to get the package name
    const packages = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/packages`);
    const packagesData = await packages.json();
    const selectedPackage = packagesData.find((pkg: any) => pkg.id === packageId);
    const packageName = selectedPackage?.name || 'Unknown Package';

    // Create the policy
    const policy = await createPolicy({
      propertyId,
      propertyAddress,
      initiatedBy: authResult.user.id,
      tenantType: tenantType as 'individual' | 'company',
      tenantEmail,
      tenantPhone,
      tenantName: tenantType === 'individual' ? tenantName : undefined,
      companyName,
      companyRfc,
      legalRepresentativeName,
      legalRepresentativeId,
      companyAddress,
      packageId,
      packageName,
      price,
      investigationFee,
      tenantPaymentPercent,
      landlordPaymentPercent,
      contractLength
    });

    // Send invitation email
    const emailSent = await sendPolicyInvitation({
      tenantEmail,
      tenantName: tenantType === 'individual' ? tenantName : companyName,
      propertyAddress,
      accessToken: policy.accessToken,
      expiryDate: policy.tokenExpiry,
      initiatorName: authResult.user.name || authResult.user.email
    });

    let finalStatus = policy.status;

    if (emailSent) {
      // Update policy status to COLLECTING_INFO
      await updatePolicyStatus(
        policy.id,
        PolicyStatus.COLLECTING_INFO,
        authResult.user.id
      );
      finalStatus = PolicyStatus.COLLECTING_INFO;

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
        status: finalStatus,
        accessToken: policy.accessToken,
        tokenExpiry: policy.tokenExpiry
      },
      emailSent,
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
