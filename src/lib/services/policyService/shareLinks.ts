import { getPolicyById } from './index';
import { generateActorUrl } from '@/lib/services/actorTokenService';
import { formatFullName } from '@/lib/utils/names';

export interface ShareLink {
  actorId: string;
  actorType: string;
  actorName: string;
  email: string;
  phone: string;
  url: string;
  tokenExpiry: Date | null;
  informationComplete: boolean;
}

export interface GetShareLinksResult {
  policyNumber: string;
  shareLinks: ShareLink[];
}

/**
 * Get share links for all actors on a policy.
 * Returns URLs with access tokens for landlords, tenants, joint obligors, and avals.
 */
export async function getShareLinksForPolicy(
  policyId: string
): Promise<GetShareLinksResult | null> {
  const policy = await getPolicyById(policyId);

  if (!policy) {
    return null;
  }

  // Build share links for all actors
  const shareLinks: ShareLink[] = [];

  // Landlords (all of them — every landlord gets a share link)
  for (const landlord of policy.landlords || []) {
    if (landlord.accessToken) {
      shareLinks.push({
        actorId: landlord.id,
        actorType: 'landlord',
        actorName:
          landlord.companyName ||
          (landlord.firstName
            ? formatFullName(
                landlord.firstName,
                landlord.paternalLastName || '',
                landlord.maternalLastName || '',
                landlord.middleName || undefined
              )
            : 'Sin nombre'),
        email: landlord.email,
        phone: landlord.phone,
        url: generateActorUrl(landlord.accessToken, 'landlord'),
        tokenExpiry: landlord.tokenExpiry,
        informationComplete: landlord.informationComplete,
      });
    }
  }

  // Tenants (all of them — every tenant gets their own share link)
  for (const tenant of policy.tenants || []) {
    if (tenant.accessToken) {
      shareLinks.push({
        actorId: tenant.id,
        actorType: 'tenant',
        actorName:
          tenant.companyName ||
          (tenant.firstName
            ? formatFullName(
                tenant.firstName,
                tenant.paternalLastName || '',
                tenant.maternalLastName || '',
                tenant.middleName || undefined
              )
            : 'Sin nombre'),
        email: tenant.email,
        phone: tenant.phone,
        url: generateActorUrl(tenant.accessToken, 'tenant'),
        tokenExpiry: tenant.tokenExpiry,
        informationComplete: tenant.informationComplete,
      });
    }
  }

  // Joint Obligors
  for (const jo of policy.jointObligors || []) {
    if (jo.accessToken) {
      shareLinks.push({
        actorId: jo.id,
        actorType: 'joint-obligor',
        actorName:
          jo.companyName ||
          (jo.firstName
            ? formatFullName(
                jo.firstName,
                jo.paternalLastName || '',
                jo.maternalLastName || '',
                jo.middleName || undefined
              )
            : 'Sin nombre'),
        email: jo.email,
        phone: jo.phone,
        url: generateActorUrl(jo.accessToken, 'joint-obligor'),
        tokenExpiry: jo.tokenExpiry,
        informationComplete: jo.informationComplete,
      });
    }
  }

  // Avals
  for (const aval of policy.avals || []) {
    if (aval.accessToken) {
      shareLinks.push({
        actorId: aval.id,
        actorType: 'aval',
        actorName:
          aval.companyName ||
          (aval.firstName
            ? formatFullName(
                aval.firstName,
                aval.paternalLastName || '',
                aval.maternalLastName || '',
                aval.middleName || undefined
              )
            : 'Sin nombre'),
        email: aval.email,
        phone: aval.phone,
        url: generateActorUrl(aval.accessToken, 'aval'),
        tokenExpiry: aval.tokenExpiry,
        informationComplete: aval.informationComplete,
      });
    }
  }

  return {
    policyNumber: policy.policyNumber,
    shareLinks,
  };
}
