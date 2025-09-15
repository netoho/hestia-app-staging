import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const startInvestigationSchema = z.object({
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission (staff/admin only)
    if (!['staff', 'admin'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id: policyId } = await params;
    const body = await request.json();
    const { assignedTo, notes } = startInvestigationSchema.parse(body);

    // Production mode implementation
    console.log(`Production mode: Starting investigation for policy ${policyId}`);

    return await prisma.$transaction(async (tx) => {
        // Get the policy
        const policy = await tx.policy.findUnique({
          where: { id: policyId }
        });

        if (!policy) {
          throw new Error('Policy not found');
        }

        // Check if investigation already exists
        const existingInvestigation = await tx.investigation.findUnique({
          where: { policyId: policyId }
        });

        if (existingInvestigation) {
          throw new Error('Investigation already exists for this policy');
        }

        if (policy.status !== 'INVESTIGATION_PENDING') {
          throw new Error('Investigation can only be started for pending policies');
        }

        // Create investigation
        const investigation = await tx.investigation.create({
          data: {
            policyId: policyId,
            assignedTo: assignedTo || authResult.user.id,
            notes: notes || null,
            responseTimeHours: null,
          }
        });

        // Update policy status
        await tx.policy.update({
          where: { id: policyId },
          data: { 
            status: 'INVESTIGATION_IN_PROGRESS',
            investigationStartedAt: new Date()
          }
        });

        // Add activity log
        await tx.policyActivity.create({
          data: {
            policyId: policyId,
            action: 'investigation_started',
            details: { 
              assignedTo: investigation.assignedTo,
              notes: notes || null
            },
            performedBy: authResult.user.id,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });

      return NextResponse.json({
        message: 'Investigation started successfully',
        investigation
      });
    });
  } catch (error) {
    console.error('Start investigation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start investigation' },
      { status: 500 }
    );
  }
}