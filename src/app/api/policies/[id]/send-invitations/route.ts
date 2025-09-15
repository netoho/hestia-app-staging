import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { sendActorInvitation } from '@/lib/services/emailService';
import {
  generateTenantToken,
  generateJointObligorToken,
  generateAvalToken
} from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
    try {
      const { id } = await params;

      // Use Prisma
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check if user can access this policy
      if (user.role === UserRole.BROKER && policy.createdById !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const invitations = [];

      // Generate token for tenant
      if (policy.tenant && policy.tenant.email) {
        const tokenData = await generateTenantToken(policy.tenant.id);

        const sent = await sendActorInvitation({
          actorType: 'tenant',
          email: policy.tenant.email,
          name: policy.tenant.fullName || 'Inquilino',
          token: tokenData.token,
          url: tokenData.url,
          policyNumber: policy.policyNumber,
          propertyAddress: policy.propertyAddress,
          expiryDate: tokenData.expiresAt,
          initiatorName: user.name || user.email,
        });

        invitations.push({
          actorType: 'tenant',
          email: policy.tenant.email,
          sent,
          token: tokenData.token,
          url: tokenData.url,
          expiresAt: tokenData.expiresAt,
        });
      }

      // Generate tokens for joint obligors
      for (const jo of policy.jointObligors) {
        if (jo.email) {
          const tokenData = await generateJointObligorToken(jo.id);

          const sent = await sendActorInvitation({
            actorType: 'joint_obligor',
            email: jo.email,
            name: jo.fullName || 'Obligado Solidario',
            token: tokenData.token,
            url: tokenData.url,
            policyNumber: policy.policyNumber,
            propertyAddress: policy.propertyAddress,
            expiryDate: tokenData.expiresAt,
            initiatorName: user.name || user.email,
          });

          invitations.push({
            actorType: 'jointObligor',
            email: jo.email,
            sent,
            token: tokenData.token,
            url: tokenData.url,
            expiresAt: tokenData.expiresAt,
          });
        }
      }

      // Generate tokens for avals
      for (const aval of policy.avals) {
        if (aval.email) {
          const tokenData = await generateAvalToken(aval.id);

          const sent = await sendActorInvitation({
            actorType: 'aval',
            email: aval.email,
            name: aval.fullName || 'Aval',
            token: tokenData.token,
            url: tokenData.url,
            policyNumber: policy.policyNumber,
            propertyAddress: policy.propertyAddress,
            expiryDate: tokenData.expiresAt,
            initiatorName: user.name || user.email,
          });

          invitations.push({
            actorType: 'aval',
            email: aval.email,
            sent,
            token: tokenData.token,
            url: tokenData.url,
            expiresAt: tokenData.expiresAt,
          });
        }
      }

      // Update policy status to COLLECTING_INFO
      const transitionResult = await transitionPolicyStatus(
        policy.id,
        'COLLECTING_INFO',
        user.id,
        'Actor invitations sent'
      );

      if (!transitionResult.success) {
        console.warn('Failed to transition policy status:', transitionResult.error);
      }

      // Log activity
      await logPolicyActivity(
        policy.id,
        'invitations_sent',
        `Invitations sent to ${invitations.length} actors`,
        { invitations: invitations.map(i => ({ type: i.actorType, email: i.email, sent: i.sent })) },
        user.id
      );

      return NextResponse.json({
        success: true,
        data: { invitations },
      });
    } catch (error) {
      console.error('Send invitations error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send invitations' },
        { status: 500 }
      );
    }
  });
}
