import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole, PolicyStatus, InvestigationStatus } from '@/types/policy';
import { v4 as uuidv4 } from 'uuid';

// GET investigation status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
    try {
      const { id } = await params;

      // Use Prisma
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          investigation: {
            include: {
              investigator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          investigation: policy.investigation,
          policy: {
            id: policy.id,
            policyNumber: policy.policyNumber,
            status: policy.status,
          },
        },
      });
    } catch (error) {
      console.error('Get investigation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get investigation' },
        { status: 500 }
      );
    }
  });
}

// POST start investigation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
    try {
      const { id } = await params;
      const data = await req.json();
      const { notes, priority } = data;

      // Use Prisma
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          investigation: true,
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check if investigation already exists
      if (policy.investigation) {
        return NextResponse.json(
          { success: false, error: 'Investigation already exists' },
          { status: 400 }
        );
      }

      // Create investigation
      const investigation = await prisma.investigation.create({
        data: {
          policyId: id,
          status: InvestigationStatus.IN_PROGRESS,
          startedAt: new Date(),
          investigatorId: user.id,
          notes,
          priority: priority || 'NORMAL',
        },
        include: {
          investigator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update policy status
      await prisma.policy.update({
        where: { id },
        data: { status: PolicyStatus.UNDER_INVESTIGATION },
      });

      // Log activity
      await prisma.policyActivity.create({
        data: {
          policyId: id,
          action: 'investigation_started',
          description: 'Investigation started',
          details: {
            investigatorId: user.id,
            priority,
            notes,
          },
          performedById: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: { investigation },
      });
    } catch (error) {
      console.error('Start investigation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to start investigation' },
        { status: 500 }
      );
    }
  });
}

// PUT update investigation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
    try {
      const { id } = await params;
      const data = await req.json();

      // Use Prisma
      const investigation = await prisma.investigation.findUnique({
        where: { policyId: id },
      });

      if (!investigation) {
        return NextResponse.json(
          { success: false, error: 'Investigation not found' },
          { status: 404 }
        );
      }

      // Update investigation
      const updatedInvestigation = await prisma.investigation.update({
        where: { id: investigation.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Check if investigation is complete
      const allVerified =
        updatedInvestigation.tenantVerified &&
        updatedInvestigation.jointObligorsVerified &&
        updatedInvestigation.avalsVerified &&
        updatedInvestigation.documentsVerified &&
        updatedInvestigation.incomeVerified &&
        updatedInvestigation.referencesVerified &&
        updatedInvestigation.propertyVerified;

      if (allVerified && data.recommendation) {
        // Complete investigation
        await prisma.investigation.update({
          where: { id: investigation.id },
          data: {
            status: InvestigationStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        // Update policy status based on recommendation
        let newStatus = PolicyStatus.UNDER_INVESTIGATION;
        if (data.recommendation === 'APPROVE') {
          newStatus = PolicyStatus.APPROVED;
        } else if (data.recommendation === 'REJECT') {
          newStatus = PolicyStatus.INVESTIGATION_REJECTED;
        } else if (data.recommendation === 'REQUIRES_REVIEW') {
          newStatus = PolicyStatus.PENDING_APPROVAL;
        }

        await prisma.policy.update({
          where: { id },
          data: { status: newStatus },
        });

        // Log activity
        await prisma.policyActivity.create({
          data: {
            policyId: id,
            action: 'investigation_completed',
            description: `Investigation completed with recommendation: ${data.recommendation}`,
            details: {
              recommendation: data.recommendation,
              investigatorId: user.id,
            },
            performedById: user.id,
          },
        });
      } else {
        // Log progress update
        await prisma.policyActivity.create({
          data: {
            policyId: id,
            action: 'investigation_updated',
            description: 'Investigation updated',
            details: data,
            performedById: user.id,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { investigation: updatedInvestigation },
      });
    } catch (error) {
      console.error('Update investigation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update investigation' },
        { status: 500 }
      );
    }
  });
}
