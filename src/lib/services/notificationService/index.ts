import {
  generateAvalToken,
  generateJointObligorToken,
  generateLandlordToken,
  generateTenantToken
} from '@/lib/services/actorTokenService';
import prisma from "@/lib/prisma";
import { sendActorInvitation, sendPolicyCancellationEmail } from "@/lib/services/emailService";
import { formatFullName } from "@/lib/utils/names";
import {AvalType, JointObligorType, TenantType} from "@/prisma/generated/prisma-client/enums";
import { logPolicyActivity } from "@/lib/services/policyService";
import { ServiceError, ErrorCode } from '../types/errors';


const shouldProcessActor = (actorType: string, actors: string[]) => {
  return !actors || actors.length === 0 || actors.includes(actorType);
};

interface InvitationRequest {
  policyId: string;
  actors: string[];
  resend: boolean;
  initiatorName: string;
  initiatorId: string;
  ipAddress: string;
}

export const sendIncompleteActorInfoNotification = async (opts: InvitationRequest) => {
  const {
    policyId,
    actors,
    resend,
    initiatorName,
    initiatorId,
    ipAddress,
  } = opts;

  const policy = await prisma.policy.findUnique({
    where: {id: policyId},
    include: {
      propertyDetails: {
        include: {
          propertyAddressDetails: true,
        }
      },
      landlords: {
        where: {isPrimary: true},
        take: 1,
      },
      tenant: true,
      jointObligors: true,
      avals: true,
    },
  });

  if (!policy) {
    throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
  }

  const invitations = [];

  // Generate token for primary landlord only
  const primaryLandlord = policy.landlords![0]; // We already filtered for isPrimary=true

  if (shouldProcessActor('landlord', actors) && primaryLandlord && primaryLandlord.email && (resend || !primaryLandlord.informationComplete)) {
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
      propertyAddress: policy.propertyDetails?.propertyAddressDetails?.formattedAddress,
      expiryDate: tokenData.expiresAt,
      initiatorName,
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
  if (shouldProcessActor('tenant', actors) && policy.tenant && policy.tenant.email && (resend || !policy.tenant.informationComplete)) {
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
      propertyAddress: policy.propertyDetails?.propertyAddressDetails?.formattedAddress,
      expiryDate: tokenData.expiresAt,
      initiatorName,
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
    if (shouldProcessActor('joint-obligor', actors) && jo.email && (resend || !jo.informationComplete)) {
      const tokenData = await generateJointObligorToken(jo.id);

      const sent = await sendActorInvitation({
        actorType: 'jointObligor',
        isCompany: jo.jointObligorType === JointObligorType.COMPANY,
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
        propertyAddress: policy.propertyDetails?.propertyAddressDetails?.formattedAddress,
        expiryDate: tokenData.expiresAt,
        initiatorName,
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
    if (shouldProcessActor('aval', actors) && aval.email && (resend || !aval.informationComplete)) {
      const tokenData = await generateAvalToken(aval.id);

      const sent = await sendActorInvitation({
        actorType: 'aval',
        isCompany: aval.avalType === AvalType.COMPANY,
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
        propertyAddress: policy.propertyDetails?.propertyAddressDetails?.formattedAddress,
        expiryDate: tokenData.expiresAt,
        initiatorName,
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

  // Log activity
  await logPolicyActivity({
    policyId: policy.id,
    action: 'invitations_sent',
    description: `Invitations sent to ${invitations.length} actors`,
    details: {invitations: invitations.map(i => ({type: i.actorType, email: i.email, sent: i.sent}))},
    performedById: initiatorId,
    ipAddress,
  });

  return invitations;
}

// Send tenant replacement notification to manager and admins
export const sendTenantReplacementNotification = async (
  policyId: string,
  managedById: string | null
): Promise<void> => {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: {
      policyNumber: true,
      managedBy: {
        select: { email: true, name: true },
      },
    },
  });

  if (!policy) {
    console.error('Policy not found for tenant replacement notification:', policyId);
    return;
  }

  // Get all admin users
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true, email: true, name: true },
  });

  // Build recipient list (manager + admins, no duplicates)
  const recipients: Array<{ email: string; name: string | null }> = [];
  const addedEmails = new Set<string>();

  // Add manager if exists
  if (policy.managedBy?.email) {
    recipients.push({ email: policy.managedBy.email, name: policy.managedBy.name });
    addedEmails.add(policy.managedBy.email);
  }

  // Add admins (excluding already added manager)
  for (const admin of admins) {
    if (admin.email && !addedEmails.has(admin.email)) {
      recipients.push({ email: admin.email, name: admin.name });
      addedEmails.add(admin.email);
    }
  }

  const policyLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/policies/${policyId}`;

  // Send simple notification email to each recipient
  for (const recipient of recipients) {
    try {
      const { sendSimpleNotificationEmail } = await import('@/lib/services/emailService');
      await sendSimpleNotificationEmail({
        to: recipient.email,
        recipientName: recipient.name || undefined,
        subject: `Inquilino reemplazado en póliza #${policy.policyNumber}`,
        message: `El inquilino ha sido reemplazado en la póliza #${policy.policyNumber}. El proceso de recolección de información ha sido reiniciado.`,
        actionUrl: policyLink,
        actionText: 'Ver póliza',
      });
    } catch (error) {
      console.error('Failed to send tenant replacement notification to:', recipient.email, error);
    }
  }
};

// Send policy cancellation notification to all admin users
export const sendPolicyCancellationNotification = async (policyId: string): Promise<void> => {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: {
      policyNumber: true,
      cancellationReason: true,
      cancellationComment: true,
      cancelledAt: true,
      cancelledBy: {
        select: { name: true, email: true },
      },
    },
  });

  if (!policy || !policy.cancellationReason) {
    console.error('Policy not found or not cancelled:', policyId);
    return;
  }

  // Get all active admin users
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { email: true, name: true },
  });

  const policyLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/policies/${policyId}`;

  // Send to each admin
  for (const admin of admins) {
    if (!admin.email) continue;

    await sendPolicyCancellationEmail({
      adminEmail: admin.email,
      adminName: admin.name || undefined,
      policyNumber: policy.policyNumber,
      cancellationReason: policy.cancellationReason,
      cancellationComment: policy.cancellationComment || '',
      cancelledByName: policy.cancelledBy?.name || 'Sistema',
      cancelledAt: policy.cancelledAt || new Date(),
      policyLink,
    });
  }
}
