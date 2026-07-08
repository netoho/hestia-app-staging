import { getPolicyById } from './index';
import { generateActorToken, type ActorType } from '@/lib/services/actorTokenService';
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

/** Fields every actor collection shares that a share link needs. */
interface ShareableActor {
  id: string;
  email: string;
  phone: string;
  companyName: string | null;
  firstName: string | null;
  middleName: string | null;
  paternalLastName: string | null;
  maternalLastName: string | null;
  informationComplete: boolean;
}

function actorDisplayName(actor: ShareableActor): string {
  return (
    actor.companyName ||
    (actor.firstName
      ? formatFullName(
          actor.firstName,
          actor.paternalLastName || '',
          actor.maternalLastName || '',
          actor.middleName || undefined,
        )
      : 'Sin nombre')
  );
}

/**
 * Build a share link for one actor, MINTING (or reusing) its portal token.
 *
 * `generateActorToken` is generate-or-reuse (idempotent): actors with a valid
 * token keep it, tokenless actors get one. This is what makes the modal show
 * ALL links — an admin-added co-tenant/co-owner (created empty, no token) or
 * anyone not yet invited would otherwise never appear (#216).
 */
async function buildActorShareLink(
  actor: ShareableActor,
  tokenActorType: ActorType,
  linkActorType: string,
): Promise<ShareLink> {
  const { url, expiresAt } = await generateActorToken(tokenActorType, actor.id);
  return {
    actorId: actor.id,
    actorType: linkActorType,
    actorName: actorDisplayName(actor),
    email: actor.email,
    phone: actor.phone,
    url,
    tokenExpiry: expiresAt,
    informationComplete: actor.informationComplete,
  };
}

/**
 * Get share links for EVERY actor on a policy (all landlords, all tenants,
 * all joint obligors, all avals). Each actor's portal token is minted-or-reused
 * so no actor is ever silently hidden for lack of a token.
 */
export async function getShareLinksForPolicy(
  policyId: string,
): Promise<GetShareLinksResult | null> {
  const policy = await getPolicyById(policyId);

  if (!policy) {
    return null;
  }

  const shareLinks: ShareLink[] = [];

  for (const landlord of policy.landlords || []) {
    shareLinks.push(await buildActorShareLink(landlord, 'landlord', 'landlord'));
  }
  for (const tenant of policy.tenants || []) {
    shareLinks.push(await buildActorShareLink(tenant, 'tenant', 'tenant'));
  }
  for (const jo of policy.jointObligors || []) {
    shareLinks.push(await buildActorShareLink(jo, 'jointObligor', 'joint-obligor'));
  }
  for (const aval of policy.avals || []) {
    shareLinks.push(await buildActorShareLink(aval, 'aval', 'aval'));
  }

  return {
    policyNumber: policy.policyNumber,
    shareLinks,
  };
}
