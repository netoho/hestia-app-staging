/**
 * Helpers for tests that need to invoke actor-portal procedures with a real
 * access token. The `dualAuthProcedure` middleware accepts either a session
 * or a token; the actor router's services then resolve the actor row from
 * `accessToken` matching.
 *
 * We mint tokens via the real `actorTokenService.generateActorToken(...)` so
 * that the token-validation logic is exercised end-to-end (per the saved
 * decision: never mock token validation).
 */

import { actorTokenService } from '@/lib/services/actorTokenService';
import { prisma } from '../utils/database';
import { createTokenCaller } from './callers';

type Caller = ReturnType<typeof createTokenCaller>['caller'];
type ActorType = 'tenant' | 'landlord' | 'jointObligor' | 'aval';

/**
 * Mint a real access token for the given actor and return both the token and
 * a `tokenCaller` configured with that token.
 */
export async function mintActorToken(
  actorType: ActorType,
  actorId: string,
): Promise<{ token: string; expiresAt: Date; caller: Caller }> {
  const { token, expiresAt } = await actorTokenService.generateActorToken(actorType, actorId);
  const { caller } = createTokenCaller(token);
  return { token, expiresAt, caller };
}

export const mintTenantToken = (id: string) => mintActorToken('tenant', id);
export const mintLandlordToken = (id: string) => mintActorToken('landlord', id);
export const mintJointObligorToken = (id: string) => mintActorToken('jointObligor', id);
export const mintAvalToken = (id: string) => mintActorToken('aval', id);

/**
 * Force-expire the token on an actor row. Useful for tests that exercise the
 * "token expired" branch of getByToken / getManyByToken.
 */
export async function expireActorToken(actorType: ActorType, actorId: string): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  switch (actorType) {
    case 'tenant':
      await prisma.tenant.update({ where: { id: actorId }, data: { tokenExpiry: yesterday } });
      return;
    case 'landlord':
      await prisma.landlord.update({ where: { id: actorId }, data: { tokenExpiry: yesterday } });
      return;
    case 'jointObligor':
      await prisma.jointObligor.update({ where: { id: actorId }, data: { tokenExpiry: yesterday } });
      return;
    case 'aval':
      await prisma.aval.update({ where: { id: actorId }, data: { tokenExpiry: yesterday } });
      return;
  }
}
