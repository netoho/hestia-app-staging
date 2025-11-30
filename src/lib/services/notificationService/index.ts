import {
  generateAvalToken,
  generateJointObligorToken,
  generateLandlordToken,
  generateTenantToken
} from '@/lib/services/actorTokenService';
import prisma from "@/lib/prisma";
import {sendActorInvitation} from "@/lib/services/emailService";
import {formatFullName} from "@/lib/utils/names";
import {TenantType} from "@/prisma/generated/prisma-client/enums";
import {logPolicyActivity} from "@/lib/services/policyService";


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
    throw new Error('Policy not found');
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
      propertyAddress: policy.propertyDetails?.propertyAddressDetails,
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
    if (shouldProcessActor('jointObligor', actors) && jo.email && (resend || !jo.informationComplete)) {
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
