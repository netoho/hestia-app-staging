import { NextRequest, NextResponse } from 'next/server';
import { getPolicyByToken, addPolicyActivity, updatePolicyData } from '@/lib/services/policyApplicationService';
import { PolicyStatus } from '@/lib/prisma-types';
import { isDemoMode } from '@/lib/env-check';
import { DemoORM } from '@/lib/services/demoDatabase';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas for each step
const profileSchema = z.object({
  nationality: z.enum(['MEXICAN', 'FOREIGN']),
  curp: z.string().optional(),
  passport: z.string().optional()
});

const employmentSchema = z.object({
  employmentStatus: z.enum(['employed', 'self-employed', 'unemployed', 'student', 'retired']),
  industry: z.string().min(1),
  occupation: z.string().min(1),
  companyName: z.string().min(1),
  position: z.string().min(1),
  companyWebsite: z.string().optional(),
  workAddress: z.string().optional(),
  incomeSource: z.enum(['salary', 'business', 'freelance', 'benefits', 'other']),
  monthlyIncome: z.number().positive(),
  creditCheckConsent: z.boolean()
});

const referencesSchema = z.object({
  personalReferenceName: z.string().min(1),
  personalReferencePhone: z.string().min(1),
  workReferenceName: z.string().optional(),
  workReferencePhone: z.string().optional(),
  landlordReferenceName: z.string().optional(),
  landlordReferencePhone: z.string().optional()
});

const documentsSchema = z.object({
  identificationCount: z.number(),
  incomeCount: z.number(),
  optionalCount: z.number(),
  incomeDocsHavePassword: z.enum(['YES', 'NO'])
});

const guarantorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  relationship: z.enum(['parent', 'sibling', 'friend', 'colleague', 'other']),
  address: z.string().optional()
});

const stepSchemas: Record<string, z.ZodSchema> = {
  '1': profileSchema,
  '2': employmentSchema,
  '3': referencesSchema,
  '4': documentsSchema,
  '5': guarantorSchema
};

const stepFields: Record<string, string> = {
  '1': 'profileData',
  '2': 'employmentData',
  '3': 'referencesData',
  '4': 'documentsData',
  '5': 'guarantorData'
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; step: string }> }
) {
  try {
    const { token, step } = await params;

    // Validate step number
    if (!['1', '2', '3', '4', '5', '6', '7'].includes(step)) {
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
    if (policy.status !== PolicyStatus.INVESTIGATION_PENDING && 
        policy.status !== PolicyStatus.INVESTIGATION_IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Policy cannot be modified in its current state' },
        { status: 400 }
      );
    }

    const stepNumber = parseInt(step);
    
    // For steps 6 (payment) and 7 (review), we don't save form data  
    if (step === '6' || step === '7') {
      // Step 6 (payment) - just advance the step, payment is handled separately
      // Step 7 (review) - just advance the step, this is the final step before submission
      
      // For step 7 (review), check if payment is completed
      if (step === '7' && policy.paymentStatus !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Payment must be completed before proceeding to review' },
          { status: 400 }
        );
      }
      
      const nextStep = stepNumber + 1;
      const newCurrentStep = Math.max(nextStep, policy.currentStep);
      
      let updatedPolicy;
      if (isDemoMode()) {
        updatedPolicy = await DemoORM.updatePolicy(
          { id: policy.id },
          {
            currentStep: newCurrentStep,
            status: PolicyStatus.INVESTIGATION_IN_PROGRESS
          }
        );
      } else {
        updatedPolicy = await prisma.policy.update({
          where: { id: policy.id },
          data: {
            currentStep: newCurrentStep,
            status: PolicyStatus.INVESTIGATION_IN_PROGRESS
          }
        });
      }

      // Log activity
      await addPolicyActivity(
        policy.id,
        `step_${step}_completed`,
        'tenant',
        { step },
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      );

      return NextResponse.json({
        success: true,
        currentStep: updatedPolicy.currentStep,
        status: updatedPolicy.status
      });
    }

    // For steps 1-5, validate and save form data
    const body = await request.json();
    const schema = stepSchemas[step];
    
    if (!schema) {
      return NextResponse.json(
        { error: 'No validation schema defined for this step' },
        { status: 400 }
      );
    }
    
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Save data to structured models and update policy
    const nextStep = stepNumber + 1;
    const nextStatus = PolicyStatus.INVESTIGATION_IN_PROGRESS;
    
    // Determine the correct currentStep to advance to
    let newCurrentStep: number;
    if (stepNumber < policy.currentStep) {
      newCurrentStep = stepNumber + 1;
    } else {
      newCurrentStep = Math.max(nextStep, policy.currentStep);
    }

    let updatedPolicy;
    if (isDemoMode()) {
      // For demo mode, keep using JSON fields for now
      const fieldName = stepFields[step];
      const updateData: any = {
        [fieldName]: validation.data,
        currentStep: newCurrentStep,
        status: nextStatus
      };
      updatedPolicy = await DemoORM.updatePolicy(
        { id: policy.id },
        updateData
      );
    } else {
      // For production, use structured models
      await prisma.$transaction(async (tx) => {
        // Save step data to appropriate model
        if (step === '1') {
          // Profile data
          await tx.tenantProfile.upsert({
            where: { policyId: policy.id },
            update: validation.data,
            create: {
              policyId: policy.id,
              ...validation.data
            }
          });
        } else if (step === '2') {
          // Employment data
          await tx.tenantEmployment.upsert({
            where: { policyId: policy.id },
            update: validation.data,
            create: {
              policyId: policy.id,
              ...validation.data
            }
          });
        } else if (step === '3') {
          // References data
          await tx.tenantReferences.upsert({
            where: { policyId: policy.id },
            update: validation.data,
            create: {
              policyId: policy.id,
              ...validation.data
            }
          });
        } else if (step === '4') {
          // Documents data
          await tx.tenantDocuments.upsert({
            where: { policyId: policy.id },
            update: validation.data,
            create: {
              policyId: policy.id,
              ...validation.data
            }
          });
        } else if (step === '5') {
          // Guarantor data
          await tx.tenantGuarantor.upsert({
            where: { policyId: policy.id },
            update: validation.data,
            create: {
              policyId: policy.id,
              ...validation.data
            }
          });
        }

        // Update policy progress
        updatedPolicy = await tx.policy.update({
          where: { id: policy.id },
          data: {
            currentStep: newCurrentStep,
            status: nextStatus
          }
        });
      });
    }

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
