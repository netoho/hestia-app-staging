/**
 * Type-safe Prisma actor delegate accessor
 *
 * Replaces dynamic `(prisma as any)[model]` access with a type-safe utility.
 */

import type { PrismaClient } from '@/prisma/generated/prisma-client/client';

// Transaction client type (same as used in actorTokenService)
type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Union type for supported clients
type PrismaClientOrTransaction = PrismaClient | TransactionClient;

// Actor type literals
export type ActorTableName = 'landlord' | 'tenant' | 'aval' | 'jointObligor';

// Map actor types to their Prisma delegates
type ActorDelegateMap<T extends PrismaClientOrTransaction> = {
  landlord: T['landlord'];
  tenant: T['tenant'];
  aval: T['aval'];
  jointObligor: T['jointObligor'];
};

/**
 * Get a type-safe Prisma delegate for an actor type.
 *
 * @example
 * // Instead of: (prisma as any)[model].update(...)
 * const delegate = getActorDelegate(prisma, 'landlord');
 * await delegate.update({ where: { id }, data });
 *
 * @example
 * // Works with transaction clients too
 * await prisma.$transaction(async (tx) => {
 *   const delegate = getActorDelegate(tx, 'tenant');
 *   await delegate.findUnique({ where: { id } });
 * });
 */
export function getActorDelegate<
  T extends PrismaClientOrTransaction,
  K extends ActorTableName
>(client: T, actorType: K): ActorDelegateMap<T>[K] {
  const delegates: ActorDelegateMap<T> = {
    landlord: client.landlord,
    tenant: client.tenant,
    aval: client.aval,
    jointObligor: client.jointObligor,
  };
  return delegates[actorType];
}

// Type mapping from URL path segments to actor table names
const urlTypeToActorType: Record<string, ActorTableName> = {
  'tenant': 'tenant',
  'joint-obligor': 'jointObligor',
  'aval': 'aval',
  'landlord': 'landlord',
};

/**
 * Convert URL actor type to Prisma table name.
 * Returns undefined for invalid types.
 */
export function urlTypeToTableName(urlType: string): ActorTableName | undefined {
  return urlTypeToActorType[urlType];
}
