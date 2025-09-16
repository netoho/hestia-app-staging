import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { requireRole } from '@/lib/auth';

import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';
import { individualTenantSchema, companyTenantSchema, personalReferenceSchema } from '@/lib/validations/policy';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch policy with tenant information
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            references: true,
            documents: true,
          }
        },
      },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

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

    // Brokers can only see their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: policy.tenant,
    });
  } catch (error) {
    console.error('Error fetching tenant information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant information' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Fetch policy
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        tenant: true,
      },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check authorization - Only ADMIN and STAFF can edit tenant info via this endpoint
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!requireRole(user.role, ['ADMIN', 'STAFF'])) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only ADMIN and STAFF can edit tenant information' },
        { status: 403 }
      );
    }

    // Extract references from body
    const { references, ...tenantData } = body;

    // Validate tenant data with Zod
    try {
      // Determine which schema to use based on tenant type
      const tenantType = tenantData.tenantType || 'INDIVIDUAL';

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

    // Create or update tenant information
    let tenant;
    if (policy.tenant) {
      // Update existing tenant
      tenant = await prisma.tenant.update({
        where: { id: policy.tenant.id },
        data: {
          tenantType: tenantData.tenantType || 'INDIVIDUAL',
          fullName: tenantData.fullName || null,
          nationality: tenantData.nationality || null,
          curp: tenantData.curp || null,
          rfc: tenantData.rfc || null,
          passport: tenantData.passport || null,
          companyName: tenantData.companyName || null,
          companyRfc: tenantData.companyRfc || null,
          legalRepName: tenantData.legalRepName || null,
          legalRepId: tenantData.legalRepId || null,
          companyAddress: tenantData.companyAddress || null,
          email: tenantData.email,
          phone: tenantData.phone,
          employmentStatus: tenantData.employmentStatus || null,
          occupation: tenantData.occupation || null,
          employerName: tenantData.employerName || null,
          position: tenantData.position || null,
          monthlyIncome: tenantData.monthlyIncome || null,
          incomeSource: tenantData.incomeSource || null,
          informationComplete: tenantData.informationComplete || false,
          completedAt: tenantData.informationComplete ? new Date() : null,
          additionalInfo: tenantData.additionalInfo || null,
        },
      });

      // Update references if provided
      if (references && references.length > 0) {
        // Delete existing references
        await prisma.personalReference.deleteMany({
          where: { tenantId: tenant.id }
        });

        // Create new references
        await prisma.personalReference.createMany({
          data: references.map((ref: any) => ({
            tenantId: tenant!.id,
            name: ref.name,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            occupation: ref.occupation || null,
          }))
        });
      }
    } else {
      // Create new tenant
      tenant = await prisma.tenant.create({
        data: {
          policyId: id,
          tenantType: tenantData.tenantType || 'INDIVIDUAL',
          fullName: tenantData.fullName || null,
          nationality: tenantData.nationality || null,
          curp: tenantData.curp || null,
          rfc: tenantData.rfc || null,
          passport: tenantData.passport || null,
          companyName: tenantData.companyName || null,
          companyRfc: tenantData.companyRfc || null,
          legalRepName: tenantData.legalRepName || null,
          legalRepId: tenantData.legalRepId || null,
          companyAddress: tenantData.companyAddress || null,
          email: tenantData.email,
          phone: tenantData.phone,
          employmentStatus: tenantData.employmentStatus || null,
          occupation: tenantData.occupation || null,
          employerName: tenantData.employerName || null,
          position: tenantData.position || null,
          monthlyIncome: tenantData.monthlyIncome || null,
          incomeSource: tenantData.incomeSource || null,
          informationComplete: tenantData.informationComplete || false,
          completedAt: tenantData.informationComplete ? new Date() : null,
          additionalInfo: tenantData.additionalInfo || null,
        },
      });

      // Create references if provided
      if (references && references.length > 0) {
        await prisma.personalReference.createMany({
          data: references.map((ref: any) => ({
            tenantId: tenant!.id,
            name: ref.name,
            phone: ref.phone,
            email: ref.email || null,
            relationship: ref.relationship,
            occupation: ref.occupation || null,
          }))
        });
      }
    }

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: policy.tenant ? 'tenant_updated' : 'tenant_created',
      description: policy.tenant
        ? 'Tenant information updated by internal team'
        : 'Tenant information created by internal team',
      performedById: user.id,
      details: {
        tenantId: tenant.id,
        tenantType: tenant.tenantType,
        informationComplete: tenant.informationComplete,
        updatedBy: user.email,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    // Check if we should update policy status
    if (tenant.informationComplete) {
      // Check if all actors have completed their information
      const updatedPolicy = await prisma.policy.findUnique({
        where: { id },
        include: {
          landlord: true,
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (updatedPolicy) {
        let allActorsComplete = true;

        // Check landlord
        if (!updatedPolicy.landlord?.informationComplete) {
          allActorsComplete = false;
        }

        // Check tenant
        if (!updatedPolicy.tenant?.informationComplete) {
          allActorsComplete = false;
        }

        // Check joint obligors based on guarantor type
        if (
          (updatedPolicy.guarantorType === 'JOINT_OBLIGOR' || updatedPolicy.guarantorType === 'BOTH') &&
          updatedPolicy.jointObligors.length === 0
        ) {
          allActorsComplete = false;
        } else {
          for (const jo of updatedPolicy.jointObligors) {
            if (!jo.informationComplete) {
              allActorsComplete = false;
              break;
            }
          }
        }

        // Check avals based on guarantor type
        if (
          (updatedPolicy.guarantorType === 'AVAL' || updatedPolicy.guarantorType === 'BOTH') &&
          updatedPolicy.avals.length === 0
        ) {
          allActorsComplete = false;
        } else {
          for (const aval of updatedPolicy.avals) {
            if (!aval.informationComplete) {
              allActorsComplete = false;
              break;
            }
          }
        }

        // If all actors are complete and status is COLLECTING_INFO, transition to UNDER_INVESTIGATION
        if (allActorsComplete && updatedPolicy.status === 'COLLECTING_INFO') {
          const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');
          await transitionPolicyStatus(id, 'UNDER_INVESTIGATION', user.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('Error saving tenant information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save tenant information' },
      { status: 500 }
    );
  }
}

// Endpoint to get tenant references
export async function GET_REFERENCES(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, tenantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId } = await params;

    const references = await prisma.personalReference.findMany({
      where: { tenantId },
    });

    return NextResponse.json({
      success: true,
      data: references,
    });
  } catch (error) {
    console.error('Error fetching references:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch references' },
      { status: 500 }
    );
  }
}
