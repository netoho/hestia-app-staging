import { NextRequest, NextResponse } from 'next/server';
import { TenantType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { sendActorInvitation } from '@/lib/services/emailService';
import { formatFullName } from '@/lib/utils/names';
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

      // Parse request body
      const body = await req.json().catch(() => ({}));
      const { actors, resend = false } = body as { actors?: string[], resend?: boolean };

      // Use Prisma - only include primary landlord for invitations
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          landlords: {
            where: { isPrimary: true },
            take: 1,
          },
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

      // Helper to check if actor type should be processed
      const shouldProcessActor = (actorType: string) => {
        return !actors || actors.length === 0 || actors.includes(actorType);
      };

      // Generate token for primary landlord only
      const primaryLandlord = policy.landlords[0]; // We already filtered for isPrimary=true
      if (shouldProcessActor('landlord') && primaryLandlord && primaryLandlord.email && (resend || !primaryLandlord.informationComplete)) {
        const tokenData = await generateLandlordToken(primaryLandlord.id);

        const sent = await sendActorInvitation({
          actorType: 'landlord' as any,
          isCompany: primaryLandlord.isCompany,
          email: primaryLandlord.email,
          name: primaryLandlord.companyName ||
            (primaryLandlord.firstName ? formatFullName(
              primaryLandlord.firstName,
              primaryLandlord.paternalLastName || '',
              primaryLandlord.maternalLastName || '',
              primaryLandlord.middleName || undefined
            ) : 'Arrendador'),
          token: tokenData.token,
          url: tokenData.url,
          policyNumber: policy.policyNumber,
          propertyAddress: policy.propertyAddress,
          expiryDate: tokenData.expiresAt,
          initiatorName: user.name || user.email,
        });

        invitations.push({
          actorType: 'landlord',
          email: primaryLandlord.email,
          sent,
          token: tokenData.token,
          url: tokenData.url,
          expiresAt: tokenData.expiresAt,
        });
      }

      // Generate token for tenant
      if (shouldProcessActor('tenant') && policy.tenant && policy.tenant.email && (resend || !policy.tenant.informationComplete)) {
        const tokenData = await generateTenantToken(policy.tenant.id);

        const sent = await sendActorInvitation({
          actorType: 'tenant',
          isCompany: policy.tenant.tenantType === TenantType.COMPANY,
          email: policy.tenant.email,
          name: policy.tenant.companyName ||
            (policy.tenant.firstName ? formatFullName(
              policy.tenant.firstName,
              policy.tenant.paternalLastName || '',
              policy.tenant.maternalLastName || '',
              policy.tenant.middleName || undefined
            ) : 'Inquilino'),
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
        if (shouldProcessActor('jointObligor') && jo.email && (resend || !jo.informationComplete)) {
          const tokenData = await generateJointObligorToken(jo.id);

          const sent = await sendActorInvitation({
            actorType: 'jointObligor',
            isCompany: jo.isCompany,
            email: jo.email,
            name: jo.companyName ||
              (jo.firstName ? formatFullName(
                jo.firstName,
                jo.paternalLastName || '',
                jo.maternalLastName || '',
                jo.middleName || undefined
              ) : 'Obligado Solidario'),
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
        if (shouldProcessActor('aval') && aval.email && (resend || !aval.informationComplete)) {
          const tokenData = await generateAvalToken(aval.id);

          const sent = await sendActorInvitation({
            actorType: 'aval',
            isCompany: aval.isCompany,
            email: aval.email,
            name: aval.companyName ||
              (aval.firstName ? formatFullName(
                aval.firstName,
                aval.paternalLastName || '',
                aval.maternalLastName || '',
                aval.middleName || undefined
              ) : 'Aval'),
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
      // console.log('Invitations sent summary:', {
      //   targetedActors: actors || 'all',
      //   resendMode: resend,
      //   total: invitations.length,
      //   landlord: invitations.filter(i => i.actorType === 'landlord').length,
      //   tenant: invitations.filter(i => i.actorType === 'tenant').length,
      //   jointObligors: invitations.filter(i => i.actorType === 'jointObligor').length,
      //   avals: invitations.filter(i => i.actorType === 'aval').length,
      //   details: invitations.map(i => ({ type: i.actorType, email: i.email, sent: i.sent }))
      // });

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
