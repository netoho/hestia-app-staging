import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const landlordOverrideSchema = z.object({
  decision: z.enum(['PROCEED', 'REJECT']),
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
    const { decision, notes } = landlordOverrideSchema.parse(body);

    // Production mode implementation

    return await prisma.$transaction(async (tx) => {
        // Get the policy and existing investigation
        const policy = await tx.policy.findUnique({
          where: { id: policyId },
          include: {
            investigation: true
          }
        });

        if (!policy) {
          throw new Error('Policy not found');
        }

        if (!policy.investigation) {
          throw new Error('No investigation found for this policy');
        }

        if (policy.status !== 'INVESTIGATION_REJECTED') {
          throw new Error('Landlord override only available for rejected investigations');
        }

        if (policy.investigation.verdict !== 'REJECTED') {
          throw new Error('Investigation must be rejected to allow landlord override');
        }

        // Update investigation with landlord decision
        const updatedInvestigation = await tx.investigation.update({
          where: { id: policy.investigation.id },
          data: {
            landlordDecision: decision,
            landlordOverride: decision === 'PROCEED',
            landlordNotes: notes || null,
          }
        });

        // Determine new policy status based on decision
        let newStatus = 'INVESTIGATION_REJECTED';
        if (decision === 'PROCEED') {
          newStatus = 'CONTRACT_PENDING'; // Move to contract stage
        }

        // Update policy status
        await tx.policy.update({
          where: { id: policyId },
          data: { 
            status: newStatus as any
          }
        });

        // Add activity log
        await tx.policyActivity.create({
          data: {
            policyId: policyId,
            action: 'landlord_override',
            details: { 
              decision: decision,
              notes: notes || null,
              originalVerdict: 'REJECTED',
              overrideResult: decision === 'PROCEED' ? 'APPROVED' : 'CONFIRMED_REJECTED'
            },
            performedBy: authResult.user.id,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });

      return NextResponse.json({
        message: 'Landlord override processed successfully',
        investigation: updatedInvestigation,
        newStatus: newStatus
      });
    });
  } catch (error) {
    console.error('Landlord override error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process landlord override' },
      { status: 500 }
    );
  }
}