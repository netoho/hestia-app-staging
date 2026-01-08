/**
 * Actor Type Mapping Utilities
 *
 * Consolidates actor type mapping logic used across the codebase.
 * Handles various naming conventions for actor types.
 */

/**
 * Actor types as used in tRPC routers
 */
export type RouterActorType = 'tenant' | 'landlord' | 'aval' | 'jointObligor';

/**
 * Actor types as used in URL paths (kebab-case)
 */
export type UrlActorType = 'tenant' | 'landlord' | 'aval' | 'joint-obligor';

/**
 * Database field names for actor relationships
 */
export type ActorFieldName = 'tenantId' | 'landlordId' | 'avalId' | 'jointObligorId';

/**
 * Maps router actor types to database field names
 */
export const actorFieldMap: Record<RouterActorType, ActorFieldName> = {
  tenant: 'tenantId',
  landlord: 'landlordId',
  aval: 'avalId',
  jointObligor: 'jointObligorId',
} as const;

/**
 * Maps URL actor types to database field names
 */
export const urlActorFieldMap: Record<UrlActorType, ActorFieldName> = {
  tenant: 'tenantId',
  landlord: 'landlordId',
  aval: 'avalId',
  'joint-obligor': 'jointObligorId',
} as const;

/**
 * Converts URL actor type to router actor type
 */
export const urlToRouterMap: Record<UrlActorType, RouterActorType> = {
  tenant: 'tenant',
  landlord: 'landlord',
  aval: 'aval',
  'joint-obligor': 'jointObligor',
} as const;

/**
 * Converts router actor type to URL actor type
 */
export const routerToUrlMap: Record<RouterActorType, UrlActorType> = {
  tenant: 'tenant',
  landlord: 'landlord',
  aval: 'aval',
  jointObligor: 'joint-obligor',
} as const;

/**
 * Gets the database field name for an actor type
 * Supports both router and URL formats
 */
export function getActorFieldName(actorType: RouterActorType | UrlActorType): ActorFieldName {
  // Check URL format first (has dash)
  if (actorType === 'joint-obligor') {
    return 'jointObligorId';
  }
  // Otherwise use router format
  return actorFieldMap[actorType as RouterActorType];
}

/**
 * Builds a where clause for querying by actor
 * @param actorType - The type of actor (supports both formats)
 * @param actorId - The actor's ID
 * @returns Where clause object for Prisma queries
 */
export function buildActorWhereClause(
  actorType: RouterActorType | UrlActorType,
  actorId: string
): Record<string, string> {
  const fieldName = getActorFieldName(actorType);
  return { [fieldName]: actorId };
}

/**
 * Checks if a string is a valid router actor type
 */
export function isValidRouterActorType(type: string): type is RouterActorType {
  return ['tenant', 'landlord', 'aval', 'jointObligor'].includes(type);
}

/**
 * Checks if a string is a valid URL actor type
 */
export function isValidUrlActorType(type: string): type is UrlActorType {
  return ['tenant', 'landlord', 'aval', 'joint-obligor'].includes(type);
}

/**
 * Normalizes any actor type format to router format
 */
export function normalizeToRouterType(actorType: string): RouterActorType {
  if (actorType === 'joint-obligor') {
    return 'jointObligor';
  }
  if (actorType === 'obligor') {
    return 'jointObligor';
  }
  if (isValidRouterActorType(actorType)) {
    return actorType;
  }
  throw new Error(`Invalid actor type: ${actorType}`);
}

/**
 * Normalizes any actor type format to URL format
 */
export function normalizeToUrlType(actorType: string): UrlActorType {
  if (actorType === 'jointObligor' || actorType === 'obligor') {
    return 'joint-obligor';
  }
  if (isValidUrlActorType(actorType)) {
    return actorType;
  }
  throw new Error(`Invalid actor type: ${actorType}`);
}

/**
 * Display names for actor types (Spanish)
 */
export const actorDisplayNames: Record<RouterActorType, string> = {
  tenant: 'Inquilino',
  landlord: 'Arrendador',
  aval: 'Aval',
  jointObligor: 'Obligado Solidario',
} as const;

/**
 * Gets display name for an actor type
 */
export function getActorDisplayName(actorType: RouterActorType | UrlActorType): string {
  const normalized = normalizeToRouterType(actorType);
  return actorDisplayNames[normalized];
}
