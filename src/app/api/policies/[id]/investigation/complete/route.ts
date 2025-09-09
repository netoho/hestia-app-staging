import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { isDemoMode } from '@/lib/env-check';
import { DemoORM } from '@/lib/services/demoDatabase';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const completeInvestigationSchema = z.object({
  verdict: z.enum(['APPROVED', 'REJECTED', 'HIGH_RISK']),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
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
    const { verdict, riskLevel, rejectionReason, notes } = completeInvestigationSchema.parse(body);

    // Calculate response time
    const completedAt = new Date();

    if (isDemoMode()) {
      // Demo mode implementation
      console.log(`Demo mode: Completing investigation for policy ${policyId} with verdict ${verdict}`);
      
      // Get the policy
      const policy = await DemoORM.findUniquePolicy({ id: policyId });
      if (!policy) {
        return NextResponse.json(
          { error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check if policy is in investigation
      if (policy.status !== 'INVESTIGATION_IN_PROGRESS') {
        return NextResponse.json(
          { error: 'Policy is not under investigation' },
          { status: 400 }
        );
      }

      // Calculate response time
      const startTime = policy.investigationStartedAt ? new Date(policy.investigationStartedAt) : new Date();
      const responseTimeHours = Math.round((completedAt.getTime() - startTime.getTime()) / (1000 * 60 * 60));

      // Determine new policy status based on verdict
      let newStatus = 'INVESTIGATION_APPROVED';
      if (verdict === 'REJECTED') {
        newStatus = 'INVESTIGATION_REJECTED';
      } else if (verdict === 'HIGH_RISK') {
        newStatus = 'INVESTIGATION_APPROVED'; // High risk is still approved, but flagged
      }

      // Update policy status
      await DemoORM.updatePolicy(
        { id: policyId },
        { 
          status: newStatus,
          investigationCompletedAt: completedAt
        }
      );

      // Create/update investigation record (demo mode simulation)
      const investigation = {
        id: `demo-investigation-${policyId}`,
        policyId: policyId,
        verdict: verdict,
        riskLevel: riskLevel || (verdict === 'HIGH_RISK' ? 'HIGH' : 'LOW'),
        rejectedBy: verdict === 'REJECTED' ? 'STAFF' : null,
        rejectionReason: verdict === 'REJECTED' ? rejectionReason : null,
        rejectedAt: verdict === 'REJECTED' ? completedAt : null,
        landlordDecision: null,
        landlordOverride: false,
        landlordNotes: null,
        assignedTo: authResult.user.id,
        completedBy: authResult.user.id,
        completedAt: completedAt,
        responseTimeHours: responseTimeHours,
        notes: notes || null,
        createdAt: policy.investigationStartedAt || new Date(),
        updatedAt: completedAt,
      };

      // Add activity
      await DemoORM.createPolicyActivity({
        policyId: policyId,
        action: 'investigation_completed',
        details: { 
          verdict: verdict,
          riskLevel: riskLevel,
          rejectionReason: rejectionReason,
          responseTimeHours: responseTimeHours,
          notes: notes || null
        },
        performedBy: authResult.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json({
        message: 'Investigation completed successfully',
        investigation
      });
    } else {
      // Production mode implementation
      console.log(`Production mode: Completing investigation for policy ${policyId} with verdict ${verdict}`);
      
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

        if (policy.status !== 'INVESTIGATION_IN_PROGRESS') {
          throw new Error('Policy is not under investigation');
        }

        // Calculate response time
        const startTime = policy.investigationStartedAt || new Date();
        const responseTimeHours = Math.round((completedAt.getTime() - startTime.getTime()) / (1000 * 60 * 60));

        // Update investigation
        const updatedInvestigation = await tx.investigation.update({
          where: { id: policy.investigation.id },
          data: {
            verdict: verdict,
            riskLevel: riskLevel || (verdict === 'HIGH_RISK' ? 'HIGH' : 'LOW'),
            rejectedBy: verdict === 'REJECTED' ? 'STAFF' : null,
            rejectionReason: verdict === 'REJECTED' ? rejectionReason : null,
            rejectedAt: verdict === 'REJECTED' ? completedAt : null,
            completedBy: authResult.user.id,
            completedAt: completedAt,
            responseTimeHours: responseTimeHours,
            notes: notes || policy.investigation.notes,
          }
        });

        // Determine new policy status based on verdict
        let newStatus = 'INVESTIGATION_APPROVED';
        if (verdict === 'REJECTED') {
          newStatus = 'INVESTIGATION_REJECTED';
        }

        // Update policy status
        await tx.policy.update({
          where: { id: policyId },
          data: { 
            status: newStatus as any,
            investigationCompletedAt: completedAt
          }
        });

        // Add activity log
        await tx.policyActivity.create({
          data: {
            policyId: policyId,
            action: 'investigation_completed',
            details: { 
              verdict: verdict,
              riskLevel: riskLevel,
              rejectionReason: rejectionReason,
              responseTimeHours: responseTimeHours,
              notes: notes || null
            },
            performedBy: authResult.user.id,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });

        return NextResponse.json({
          message: 'Investigation completed successfully',
          investigation: updatedInvestigation
        });
      });
    }
  } catch (error) {
    console.error('Complete investigation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete investigation' },
      { status: 500 }
    );
  }
}