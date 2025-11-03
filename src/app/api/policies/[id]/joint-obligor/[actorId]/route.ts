import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';
import { jointObligorSchema, personalReferenceSchema } from '@/lib/validations/policy';
import { z } from 'zod';
import { formatFullName } from '@/lib/utils/names';

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

    // Fetch joint obligor with references
    const jointObligor = await prisma.jointObligor.findFirst({
      where: {
        id: actorId,
        policyId: id,
      },
      include: {
        references: true,
        documents: true,
      },
    });

    if (!jointObligor) {
      return NextResponse.json(
        { success: false, error: 'Joint obligor not found' },
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
      data: jointObligor,
      policyNumber: policy?.policyNumber,
      propertyAddress: policy?.propertyAddress,
    });
  } catch (error) {
    console.error('Error fetching joint obligor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch joint obligor information' },
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
        { success: false, error: 'Forbidden - Only ADMIN and STAFF can edit joint obligor information' },
        { status: 403 }
      );
    }

    // Verify joint obligor belongs to the policy
    const existingJointObligor = await prisma.jointObligor.findFirst({
      where: {
        id: actorId,
        policyId: id,
      },
    });

    if (!existingJointObligor) {
      return NextResponse.json(
        { success: false, error: 'Joint obligor not found' },
        { status: 404 }
      );
    }

    // Extract references from body
    const { references, ...jointObligorData } = body;

    // Validate joint obligor data with Zod
    try {
      jointObligorSchema.parse(jointObligorData);

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

    // Update joint obligor
    const updatedJointObligor = await prisma.jointObligor.update({
      where: { id: actorId },
      data: {
        // Personal information for individuals
        firstName: jointObligorData.firstName || null,
        middleName: jointObligorData.middleName || null,
        paternalLastName: jointObligorData.paternalLastName || null,
        maternalLastName: jointObligorData.maternalLastName || null,
        nationality: jointObligorData.nationality,
        curp: jointObligorData.curp || null,
        rfc: jointObligorData.rfc || null,
        passport: jointObligorData.passport || null,

        // Company information
        isCompany: jointObligorData.isCompany || false,
        companyName: jointObligorData.companyName || null,
        companyRfc: jointObligorData.companyRfc || null,

        // Legal representative information for companies
        legalRepFirstName: jointObligorData.legalRepFirstName || null,
        legalRepMiddleName: jointObligorData.legalRepMiddleName || null,
        legalRepPaternalLastName: jointObligorData.legalRepPaternalLastName || null,
        legalRepMaternalLastName: jointObligorData.legalRepMaternalLastName || null,
        legalRepPosition: jointObligorData.legalRepPosition || null,
        legalRepRfc: jointObligorData.legalRepRfc || null,
        legalRepPhone: jointObligorData.legalRepPhone || null,
        legalRepEmail: jointObligorData.legalRepEmail || null,

        // Contact and employment
        email: jointObligorData.email,
        phone: jointObligorData.phone,
        address: jointObligorData.address || null,
        employmentStatus: jointObligorData.employmentStatus,
        occupation: jointObligorData.occupation,
        employerName: jointObligorData.employerName || null,
        position: jointObligorData.position,
        monthlyIncome: jointObligorData.monthlyIncome,
        incomeSource: jointObligorData.incomeSource,

        // Status
        informationComplete: jointObligorData.informationComplete || false,
        completedAt: jointObligorData.informationComplete ? new Date() : null,
        additionalInfo: jointObligorData.additionalInfo || null,
      },
    });

    // Update references if provided
    if (references && references.length > 0) {
      // Delete existing references
      await prisma.personalReference.deleteMany({
        where: { jointObligorId: actorId }
      });

      // Create new references
      await prisma.personalReference.createMany({
        data: references.map((ref: any) => ({
          jointObligorId: actorId,
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
      action: 'joint_obligor_updated',
      description: 'Joint obligor information updated by internal team',
      performedById: user.id,
      details: {
        jointObligorId: actorId,
        jointObligorName: updatedJointObligor.companyName ||
          (updatedJointObligor.firstName ? formatFullName(
            updatedJointObligor.firstName,
            updatedJointObligor.paternalLastName || '',
            updatedJointObligor.maternalLastName || '',
            updatedJointObligor.middleName || undefined
          ) : ''),
        informationComplete: updatedJointObligor.informationComplete,
        updatedBy: user.email,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    // Check if we should update policy status
    if (updatedJointObligor.informationComplete) {
      // Check if all actors have completed their information
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          landlords: true,
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (policy) {
        let allActorsComplete = true;

        // Check all landlords
        if (policy.landlords.some(landlord => !landlord.informationComplete)) {
          allActorsComplete = false;
        }

        // Check tenant
        if (!policy.tenant?.informationComplete) {
          allActorsComplete = false;
        }

        // Check all joint obligors
        for (const jo of policy.jointObligors) {
          if (!jo.informationComplete) {
            allActorsComplete = false;
            break;
          }
        }

        // Check avals if needed
        if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
          for (const aval of policy.avals) {
            if (!aval.informationComplete) {
              allActorsComplete = false;
              break;
            }
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
      data: updatedJointObligor,
    });
  } catch (error) {
    console.error('Error updating joint obligor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update joint obligor information' },
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

    // Only ADMIN can delete joint obligor
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only ADMIN can delete joint obligors' },
        { status: 403 }
      );
    }

    // Verify joint obligor belongs to the policy
    const jointObligor = await prisma.jointObligor.findFirst({
      where: {
        id: actorId,
        policyId: id,
      },
    });

    if (!jointObligor) {
      return NextResponse.json(
        { success: false, error: 'Joint obligor not found' },
        { status: 404 }
      );
    }

    // Delete joint obligor (references will be cascade deleted)
    await prisma.jointObligor.delete({
      where: { id: actorId },
    });

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: 'joint_obligor_deleted',
      description: 'Joint obligor deleted',
      performedById: user.id,
      details: {
        jointObligorId: actorId,
        jointObligorName: jointObligor.companyName ||
          (jointObligor.firstName ? formatFullName(
            jointObligor.firstName,
            jointObligor.paternalLastName || '',
            jointObligor.maternalLastName || '',
            jointObligor.middleName || undefined
          ) : ''),
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Joint obligor deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting joint obligor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete joint obligor' },
      { status: 500 }
    );
  }
}
