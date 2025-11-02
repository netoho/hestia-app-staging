import prisma from '@/lib/prisma';
import { ActorVerificationStatus } from '@prisma/client';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, requireRole } from '@/lib/auth';
import { sendActorRejectionEmail } from '@/lib/services/emailService';
import { logPolicyActivity } from '@/lib/services/policyService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string; actorId: string }> }
) {
  try {
    const { id: policyId, type, actorId } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only STAFF and ADMIN can verify actors
    if (!requireRole(authResult.user.role, ['STAFF', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff and admin can verify actors' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Determine the model based on type
    let updateResult;
    let actorEmail = '';
    let actorName = '';

    const updateData = {
      verificationStatus: action === 'approve'
        ? ActorVerificationStatus.APPROVED
        : ActorVerificationStatus.REJECTED,
      verifiedAt: action === 'approve' ? new Date() : null,
      verifiedBy: action === 'approve' ? authResult.user.id : undefined,
      rejectedAt: action === 'reject' ? new Date() : null,
      rejectionReason: action === 'reject' ? reason : null,
    };

    switch (type) {
      case 'landlord':
        updateResult = await prisma.landlord.update({
          where: { id: actorId, policyId },
          data: updateData,
        });
        actorEmail = updateResult.email;
        actorName = updateResult.fullName || updateResult.companyName || '';
        break;

      case 'tenant':
        updateResult = await prisma.tenant.update({
          where: { id: actorId, policyId },
          data: updateData,
        });
        actorEmail = updateResult.email;
        actorName = updateResult.fullName || updateResult.companyName || '';
        break;

      case 'jointObligor':
        updateResult = await prisma.jointObligor.update({
          where: { id: actorId, policyId },
          data: updateData,
        });
        actorEmail = updateResult.email;
        actorName = updateResult.fullName || updateResult.companyName || '';
        break;

      case 'aval':
        updateResult = await prisma.aval.update({
          where: { id: actorId, policyId },
          data: updateData,
        });
        actorEmail = updateResult.email;
        actorName = updateResult.fullName || updateResult.companyName || '';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid actor type' },
          { status: 400 }
        );
    }

    // Log activity
    await logPolicyActivity({
      policyId,
      action: action === 'approve' ? `${type}_approved` : `${type}_rejected`,
      description: `${actorName} fue ${action === 'approve' ? 'aprobado' : 'rechazado'} por ${authResult.user.name || authResult.user.email}`,
      performedById: authResult.user.id
    });

    // Send rejection email if actor was rejected
    if (action === 'reject' && actorEmail) {
      try {
        await sendActorRejectionEmail({
          to: actorEmail,
          actorName,
          actorType: type,
          rejectionReason: reason,
          policyNumber: policyId,
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Check if all actors are approved and update policy status
    if (action === 'approve') {
      await checkAndUpdatePolicyStatus(policyId);
    }

    return NextResponse.json({
      success: true,
      data: updateResult,
    });
  } catch (error) {
    console.error('Actor verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function checkAndUpdatePolicyStatus(policyId: string) {
  try {
    // Fetch policy with all actors
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        landlords: true,
        tenant: true,
        jointObligors: true,
        avals: true,
      },
    });

    if (!policy) return;

    // Check if all actors are approved
    const landlordsApproved =
      policy.landlords.length > 0 &&
      policy.landlords.every(l => l.verificationStatus === ActorVerificationStatus.APPROVED);
    const tenantApproved = policy.tenant?.verificationStatus === ActorVerificationStatus.APPROVED;

    const jointObligorsApproved =
      !policy.jointObligors.length ||
      policy.jointObligors.every(jo => jo.verificationStatus === ActorVerificationStatus.APPROVED);

    const avalsApproved =
      !policy.avals.length ||
      policy.avals.every(a => a.verificationStatus === ActorVerificationStatus.APPROVED);

    const allActorsApproved = landlordsApproved && tenantApproved &&
                              jointObligorsApproved && avalsApproved;

    // Update policy status if all actors are approved and current status is appropriate
    if (allActorsApproved && policy.status === 'UNDER_INVESTIGATION') {
      await prisma.policy.update({
        where: { id: policyId },
        data: {
          status: 'PENDING_APPROVAL',
          updatedAt: new Date(),
        },
      });

      await logPolicyActivity({
        policyId,
        action: 'all_actors_approved',
        description: 'Todos los actores han sido aprobados. La protección está lista para aprobación final.',
        performedById: 'system'
      });
    }
  } catch (error) {
    console.error('Error checking policy status:', error);
  }
}
