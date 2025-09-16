import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';
import { avalSchema, personalReferenceSchema } from '@/lib/validations/policy';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, actorId } = await params;

    // Fetch aval with references
    const aval = await prisma.aval.findFirst({
      where: {
        id: actorId,
        policyId: id,
      },
      include: {
        references: true,
        documents: true,
      },
    });

    if (!aval) {
      return NextResponse.json(
        { success: false, error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Fetch policy for additional info
    const policy = await prisma.policy.findUnique({
      where: { id },
      select: {
        policyNumber: true,
        propertyAddress: true,
        createdById: true,
      },
    });

    // Check authorization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only ADMIN and STAFF can access this endpoint
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: aval,
      policyNumber: policy?.policyNumber,
      policyPropertyAddress: policy?.propertyAddress,
    });
  } catch (error) {
    console.error('Error fetching aval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch aval information' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, actorId } = await params;
    const body = await req.json();

    // Check authorization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only ADMIN and STAFF can edit aval information' },
        { status: 403 }
      );
    }

    // Verify aval belongs to the policy
    const existingAval = await prisma.aval.findFirst({
      where: {
        id: actorId,
        policyId: id,
      },
    });

    if (!existingAval) {
      return NextResponse.json(
        { success: false, error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Extract references from body
    const { references, ...avalData } = body;

    // Validate aval data with Zod
    try {
      avalSchema.parse(avalData);

      // Validate references if provided
      if (references && references.length > 0) {
        if (references.length < 3) {
          throw new Error('Se requieren al menos 3 referencias');
        }
        references.forEach((ref: any) => {
          personalReferenceSchema.parse(ref);
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }
      if (error instanceof Error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    // Update aval
    const updatedAval = await prisma.aval.update({
      where: { id: actorId },
      data: {
        fullName: avalData.fullName,
        email: avalData.email,
        phone: avalData.phone,
        nationality: avalData.nationality,
        curp: avalData.curp || null,
        rfc: avalData.rfc || null,
        passport: avalData.passport || null,
        address: avalData.address || null,
        employmentStatus: avalData.employmentStatus,
        occupation: avalData.occupation,
        companyName: avalData.companyName,
        position: avalData.position,
        monthlyIncome: avalData.monthlyIncome,
        incomeSource: avalData.incomeSource,
        propertyAddress: avalData.propertyAddress,
        propertyValue: avalData.propertyValue,
        propertyDeedNumber: avalData.propertyDeedNumber || null,
        propertyRegistry: avalData.propertyRegistry || null,
        informationComplete: avalData.informationComplete || false,
        completedAt: avalData.informationComplete ? new Date() : null,
        additionalInfo: avalData.additionalInfo || null,
      },
    });

    // Update references if provided
    if (references && references.length > 0) {
      // Delete existing references
      await prisma.personalReference.deleteMany({
        where: { avalId: actorId }
      });

      // Create new references
      await prisma.personalReference.createMany({
        data: references.map((ref: any) => ({
          avalId: actorId,
          name: ref.name,
          phone: ref.phone,
          email: ref.email || null,
          relationship: ref.relationship,
          occupation: ref.occupation || null,
        }))
      });
    }

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: 'aval_updated',
      description: 'Aval information updated by internal team',
      performedById: user.id,
      details: {
        avalId: actorId,
        avalName: updatedAval.fullName,
        propertyAddress: updatedAval.propertyAddress,
        informationComplete: updatedAval.informationComplete,
        updatedBy: user.email,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    // Check if we should update policy status
    if (updatedAval.informationComplete) {
      // Check if all actors have completed their information
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          landlord: true,
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (policy) {
        let allActorsComplete = true;

        // Check landlord
        if (!policy.landlord?.informationComplete) {
          allActorsComplete = false;
        }

        // Check tenant
        if (!policy.tenant?.informationComplete) {
          allActorsComplete = false;
        }

        // Check joint obligors if needed
        if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
          for (const jo of policy.jointObligors) {
            if (!jo.informationComplete) {
              allActorsComplete = false;
              break;
            }
          }
        }

        // Check all avals
        for (const aval of policy.avals) {
          if (!aval.informationComplete) {
            allActorsComplete = false;
            break;
          }
        }

        // If all actors are complete and status is COLLECTING_INFO, transition to UNDER_INVESTIGATION
        if (allActorsComplete && policy.status === 'COLLECTING_INFO') {
          const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');
          await transitionPolicyStatus(id, 'UNDER_INVESTIGATION', user.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedAval,
    });
  } catch (error) {
    console.error('Error updating aval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update aval information' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, actorId } = await params;

    // Only ADMIN can delete aval
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only ADMIN can delete avals' },
        { status: 403 }
      );
    }

    // Verify aval belongs to the policy
    const aval = await prisma.aval.findFirst({
      where: {
        id: actorId,
        policyId: id,
      },
    });

    if (!aval) {
      return NextResponse.json(
        { success: false, error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Delete aval (references will be cascade deleted)
    await prisma.aval.delete({
      where: { id: actorId },
    });

    // Log activity
    await logPolicyActivity(id, {
      action: 'aval_deleted',
      description: 'Aval deleted',
      performedById: user.id,
      details: {
        avalId: actorId,
        avalName: aval.fullName,
        propertyAddress: aval.propertyAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Aval deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting aval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete aval' },
      { status: 500 }
    );
  }
}
