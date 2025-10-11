import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { sendActorInvitation } from '@/lib/services/emailService';
import {
  generateLandlordToken,
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
          landlord: true,
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

      // Log actors found for debugging
      console.log('Sending invitations for policy:', policy.policyNumber);
      console.log('Actors found:', {
        landlord: policy.landlord ? `${policy.landlord.email} (completed: ${policy.landlord.informationComplete})` : 'none',
        tenant: policy.tenant ? `${policy.tenant.email} (completed: ${policy.tenant.informationComplete})` : 'none',
        jointObligors: policy.jointObligors.map(jo => `${jo.email} (completed: ${jo.informationComplete})`),
        avals: policy.avals.map(a => `${a.email} (completed: ${a.informationComplete})`)
      });

      // Generate token for landlord
      if (policy.landlord && policy.landlord.email && !policy.landlord.informationComplete) {
        const tokenData = await generateLandlordToken(policy.landlord.id);

        const sent = await sendActorInvitation({
          actorType: 'landlord' as any,
          email: policy.landlord.email,
          name: policy.landlord.fullName || policy.landlord.companyName || 'Arrendador',
          token: tokenData.token,
          url: tokenData.url,
          policyNumber: policy.policyNumber,
          propertyAddress: policy.propertyAddress,
          expiryDate: tokenData.expiresAt,
          initiatorName: user.name || user.email,
        });

        invitations.push({
          actorType: 'landlord',
          email: policy.landlord.email,
          sent,
          token: tokenData.token,
          url: tokenData.url,
          expiresAt: tokenData.expiresAt,
        });
      }

      // Generate token for tenant
      if (policy.tenant && policy.tenant.email && !policy.tenant.informationComplete) {
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
        if (jo.email && !jo.informationComplete) {
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
        if (aval.email && !aval.informationComplete) {
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
      await logPolicyActivity({
        policyId: policy.id,
        action: 'invitations_sent',
        description: `Invitations sent to ${invitations.length} actors`,
        details: {invitations: invitations.map(i => ({type: i.actorType, email: i.email, sent: i.sent}))},
        performedById: user.id,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });

      // Log summary for debugging
      console.log('Invitations sent summary:', {
        total: invitations.length,
        landlord: invitations.filter(i => i.actorType === 'landlord').length,
        tenant: invitations.filter(i => i.actorType === 'tenant').length,
        jointObligors: invitations.filter(i => i.actorType === 'jointObligor').length,
        avals: invitations.filter(i => i.actorType === 'aval').length,
        details: invitations.map(i => ({ type: i.actorType, email: i.email, sent: i.sent }))
      });

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
