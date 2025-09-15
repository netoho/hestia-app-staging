import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Production mode implementation
    console.log(`Production mode: Marking contract as signed for policy ${policyId}`);

    return await prisma.$transaction(async (tx) => {
        // Get the policy
        const policy = await tx.policy.findUnique({
          where: { id: policyId },
          include: {
            contracts: {
              where: { isCurrent: true }
            }
          }
        });

        if (!policy) {
          throw new Error('Policy not found');
        }

        // Check if policy has an uploaded contract
        if (policy.status !== 'CONTRACT_UPLOADED') {
          throw new Error('Contract must be uploaded before it can be marked as signed');
        }

        if (policy.contracts.length === 0) {
          throw new Error('No contract found to mark as signed');
        }

        // Check if already signed
        if (policy.contractSignedAt) {
          throw new Error('Contract is already marked as signed');
        }

        const signedAt = new Date();
        const policyExpiresAt = new Date();
        policyExpiresAt.setMonth(policyExpiresAt.getMonth() + policy.contractLength);

        // Update policy status
        const updatedPolicy = await tx.policy.update({
          where: { id: policyId },
          data: { 
            status: 'CONTRACT_SIGNED',
            contractSignedAt: signedAt,
            policyExpiresAt: policyExpiresAt
          }
        });

        // Add activity log
        await tx.policyActivity.create({
          data: {
            policyId: policyId,
            action: 'contract_signed',
            details: { 
              signedAt: signedAt,
              contractLength: policy.contractLength,
              expiresAt: policyExpiresAt,
              markedBy: authResult.user.email
            },
            performedBy: authResult.user.id,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });

      return NextResponse.json({
        message: 'Contract marked as signed successfully',
        signedAt: signedAt,
        policyExpiresAt: policyExpiresAt
      });
    });
  } catch (error) {
    console.error('Mark contract signed error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark contract as signed' },
      { status: 500 }
    );
  }
}