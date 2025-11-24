import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { validationService, ActorType, SectionType } from '@/lib/services/validationService';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Request validation schema
const validateSectionSchema = z.object({
  actorType: z.enum(['landlord', 'tenant', 'jointObligor', 'aval']),
  actorId: z.string().min(1),
  section: z.enum(['personal_info', 'work_info', 'financial_info', 'references', 'address', 'company_info']),
  status: z.enum(['APPROVED', 'REJECTED', 'IN_REVIEW']),
  rejectionReason: z.string().optional()
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session and check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !['STAFF', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Validate request body
    const body = await request.json();
    const validatedData = validateSectionSchema.parse(body);

    // Check if policy exists and user has access
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        status: true,
        createdById: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check policy status - should be in a reviewable state
    const reviewableStatuses = ['COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];
    if (!reviewableStatuses.includes(policy.status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Policy is not in a reviewable status',
          currentStatus: policy.status
        },
        { status: 400 }
      );
    }

    // Verify the actor exists and belongs to this policy
    const actorCheck = await verifyActorBelongsToPolicy(
      policyId,
      validatedData.actorType,
      validatedData.actorId
    );

    if (!actorCheck) {
      return NextResponse.json(
        {
          success: false,
          message: 'Actor not found or does not belong to this policy'
        },
        { status: 404 }
      );
    }

    // Get client IP for logging
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // Perform the validation
    const result = await validationService.validateSection({
      policyId,
      actorType: validatedData.actorType as ActorType,
      actorId: validatedData.actorId,
      section: validatedData.section as SectionType,
      status: validatedData.status as any,
      rejectionReason: validatedData.rejectionReason,
      validatedBy: user.id,
      ipAddress
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Section ${validatedData.section} ${validatedData.status.toLowerCase()}`
    });

  } catch (error) {
    console.error('Error in validate-section endpoint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while validating the section',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to verify actor belongs to policy
async function verifyActorBelongsToPolicy(
  policyId: string,
  actorType: string,
  actorId: string
): Promise<boolean> {
  switch (actorType) {
    case 'landlord':
      const landlord = await prisma.landlord.findFirst({
        where: { id: actorId, policyId }
      });
      return !!landlord;

    case 'tenant':
      const tenant = await prisma.tenant.findFirst({
        where: { id: actorId, policyId }
      });
      return !!tenant;

    case 'jointObligor':
      const jointObligor = await prisma.jointObligor.findFirst({
        where: { id: actorId, policyId }
      });
      return !!jointObligor;

    case 'aval':
      const aval = await prisma.aval.findFirst({
        where: { id: actorId, policyId }
      });
      return !!aval;

    default:
      return false;
  }
}

// GET endpoint to fetch section validation status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session and check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !['STAFF', 'ADMIN', 'BROKER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const actorType = searchParams.get('actorType');
    const actorId = searchParams.get('actorId');

    // Build query
    const where: any = {};
    if (actorType) where.actorType = actorType;
    if (actorId) where.actorId = actorId;

    // If specific actor requested, verify it belongs to the policy
    if (actorType && actorId) {
      const belongsToPolicy = await verifyActorBelongsToPolicy(policyId, actorType, actorId);
      if (!belongsToPolicy) {
        return NextResponse.json(
          { success: false, message: 'Actor not found or does not belong to this policy' },
          { status: 404 }
        );
      }
    } else {
      // Get all actors for this policy to filter validations
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: {
          landlords: { select: { id: true } },
          tenant: { select: { id: true } },
          jointObligors: { select: { id: true } },
          avals: { select: { id: true } }
        }
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, message: 'Policy not found' },
          { status: 404 }
        );
      }

      // Build OR conditions for all actors in the policy
      const actorConditions = [];
      policy.landlords?.forEach(l =>
        actorConditions.push({ actorType: 'landlord', actorId: l.id })
      );
      if (policy.tenant) {
        actorConditions.push({ actorType: 'tenant', actorId: policy.tenant.id });
      }
      policy.jointObligors?.forEach(jo =>
        actorConditions.push({ actorType: 'jointObligor', actorId: jo.id })
      );
      policy.avals?.forEach(a =>
        actorConditions.push({ actorType: 'aval', actorId: a.id })
      );

      if (actorConditions.length > 0) {
        where.OR = actorConditions;
      }
    }

    // Get section validations
    const validations = await prisma.actorSectionValidation.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    // Get validator names
    const validatorIds = [...new Set(validations.map(v => v.validatedBy).filter(Boolean))];
    const validators = await prisma.user.findMany({
      where: { id: { in: validatorIds as string[] } },
      select: { id: true, name: true, email: true }
    });
    const validatorMap = new Map(validators.map(v => [v.id, v]));

    // Enhance validations with validator info
    const enhancedValidations = validations.map(v => ({
      ...v,
      validator: v.validatedBy ? validatorMap.get(v.validatedBy) : null
    }));

    return NextResponse.json({
      success: true,
      data: enhancedValidations
    });

  } catch (error) {
    console.error('Error fetching section validations:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching validations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}