import { NextRequest, NextResponse } from 'next/server';
import { getPolicyByToken, addPolicyActivity } from '@/lib/services/policyApplicationService';
import { PolicyStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas for each step
const profileSchema = z.object({
  nationality: z.enum(['mexican', 'foreign']),
  curp: z.string().optional(),
  passport: z.string().optional()
});

const employmentSchema = z.object({
  employmentStatus: z.string(),
  industry: z.string(),
  occupation: z.string(),
  companyName: z.string(),
  position: z.string(),
  companyWebsite: z.string().optional(),
  workAddress: z.string().optional(),
  incomeSource: z.string(),
  monthlyIncome: z.number(),
  creditCheckConsent: z.boolean()
});

const referencesSchema = z.object({
  personalReferenceName: z.string(),
  personalReferencePhone: z.string(),
  workReferenceName: z.string().optional(),
  workReferencePhone: z.string().optional(),
  landlordReferenceName: z.string().optional(),
  landlordReferencePhone: z.string().optional()
});

const documentsSchema = z.object({
  identificationCount: z.number(),
  incomeCount: z.number(),
  optionalCount: z.number(),
  incomeDocsHavePassword: z.enum(['yes', 'no'])
});

const stepSchemas: Record<string, z.ZodSchema> = {
  '1': profileSchema,
  '2': employmentSchema,
  '3': referencesSchema,
  '4': documentsSchema
};

const stepFields: Record<string, string> = {
  '1': 'profileData',
  '2': 'employmentData',
  '3': 'referencesData',
  '4': 'documentsData'
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; step: string }> }
) {
  try {
    const { token, step } = await params;

    // Validate step number
    if (!['1', '2', '3', '4'].includes(step)) {
      return NextResponse.json(
        { error: 'Invalid step number' },
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

    // Check if policy is in a valid state for updates
    if (policy.status !== PolicyStatus.SENT_TO_TENANT && 
        policy.status !== PolicyStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Policy cannot be modified in its current state' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const schema = stepSchemas[step];
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Update policy data
    const fieldName = stepFields[step];
    const stepNumber = parseInt(step);
    
    // When a step is completed, advance to the next step
    // Step 4 (documents) advances to step 5 (review), but stays IN_PROGRESS
    // Only the actual submission API should change status to SUBMITTED
    const nextStep = stepNumber + 1;
    const nextStatus = PolicyStatus.IN_PROGRESS; // Always stay IN_PROGRESS until actual submission
    
    // Determine the correct currentStep to advance to:
    // - If editing a previous step, go to the next sequential step (stepNumber + 1)
    // - If at current progress, advance normally but cap at current progress + 1
    let newCurrentStep: number;
    if (stepNumber < policy.currentStep) {
      // User is editing a previous step, advance sequentially
      newCurrentStep = stepNumber + 1;
    } else {
      // User is at current progress, advance normally
      newCurrentStep = Math.max(nextStep, policy.currentStep);
    }
    
    const updateData: any = {
      [fieldName]: validation.data,
      currentStep: newCurrentStep,
      status: nextStatus
    };

    const updatedPolicy = await prisma.policy.update({
      where: { id: policy.id },
      data: updateData
    });

    // Log activity
    await addPolicyActivity(
      policy.id,
      `step_${step}_completed`,
      'tenant',
      { step, data: validation.data },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    return NextResponse.json({
      success: true,
      currentStep: updatedPolicy.currentStep,
      status: updatedPolicy.status
    });

  } catch (error) {
    console.error('Update policy step error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
