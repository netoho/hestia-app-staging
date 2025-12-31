import prisma from "@/lib/prisma";
import { generateSecureToken } from '@/lib/utils/tokenUtils';
import type { PrismaClient } from "@/prisma/generated/prisma-client/client";
import { TOKEN_CONFIG } from "@/lib/constants/businessConfig";

// Transaction client type
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Generate expires at date based on TOKEN_CONFIG.EXPIRATION_DAYS
 */
export function generateExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_CONFIG.EXPIRATION_DAYS);

  return expiresAt;
}

/**
 * Generate access URL for an actor
 */
export function generateActorUrl(token: string, actorType: 'tenant' | 'joint-obligor' | 'aval' | 'landlord'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/actor/${actorType}/${token}`;
}

/**
 * Check if token is still valid (not expired)
 */
function isTokenValid(accessToken: string | null, tokenExpiry: Date | null): boolean {
  if (!accessToken || !tokenExpiry) return false;
  return tokenExpiry >= new Date();
}

// Actor type definitions
export type ActorType = 'tenant' | 'jointObligor' | 'aval' | 'landlord';
type ActorUrlType = 'tenant' | 'joint-obligor' | 'aval' | 'landlord';

// Mapping from ActorType to URL path segment
const actorTypeToUrlType: Record<ActorType, ActorUrlType> = {
  tenant: 'tenant',
  jointObligor: 'joint-obligor',
  aval: 'aval',
  landlord: 'landlord'
};

// Mapping from ActorType to Prisma model name
const actorTypeToPrismaModel = {
  tenant: 'tenant',
  jointObligor: 'jointObligor',
  aval: 'aval',
  landlord: 'landlord'
} as const;

/**
 * Update actor token in database
 */
async function updateActorToken(
  tx: TransactionClient,
  actorType: ActorType,
  actorId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const model = actorTypeToPrismaModel[actorType];
  await (tx[model] as any).update({
    where: { id: actorId },
    data: { accessToken: token, tokenExpiry: expiresAt }
  });
}

/**
 * Find actor and get current token info
 */
async function findActorToken(
  tx: TransactionClient,
  actorType: ActorType,
  actorId: string
): Promise<{ accessToken: string | null; tokenExpiry: Date | null } | null> {
  const model = actorTypeToPrismaModel[actorType];
  return (tx[model] as any).findUnique({
    where: { id: actorId },
    select: { accessToken: true, tokenExpiry: true }
  });
}

/**
 * Generate or reuse existing valid token for an actor
 * @param tx - Transaction client for atomic operations
 */
async function generateOrReuseToken(
  tx: TransactionClient,
  actorType: ActorType,
  actorId: string,
  currentToken: string | null,
  currentExpiry: Date | null
): Promise<{ token: string; url: string; expiresAt: Date }> {
  const urlType = actorTypeToUrlType[actorType];

  // If valid token exists, return it
  if (isTokenValid(currentToken, currentExpiry)) {
    return {
      token: currentToken!,
      url: generateActorUrl(currentToken!, urlType),
      expiresAt: currentExpiry!
    };
  }

  // Generate new token
  const token = generateSecureToken();
  const expiresAt = generateExpiresAt();

  // Update database
  await updateActorToken(tx, actorType, actorId, token, expiresAt);

  return {
    token,
    url: generateActorUrl(token, urlType),
    expiresAt
  };
}

/**
 * Generic function to generate or reuse token for any actor type
 */
export async function generateActorToken(
  actorType: ActorType,
  actorId: string
): Promise<{ token: string; url: string; expiresAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const actor = await findActorToken(tx, actorType, actorId);
    return generateOrReuseToken(
      tx,
      actorType,
      actorId,
      actor?.accessToken || null,
      actor?.tokenExpiry || null
    );
  });
}

// Backwards-compatible wrapper functions
export const generateTenantToken = (tenantId: string) => generateActorToken('tenant', tenantId);
export const generateJointObligorToken = (jointObligorId: string) => generateActorToken('jointObligor', jointObligorId);
export const generateAvalToken = (avalId: string) => generateActorToken('aval', avalId);

/**
 * Validate a tenant token
 */
export async function validateTenantToken(token: string): Promise<{ valid: boolean; tenant?: any; message?: string; completed?: boolean }> {
  const tenant = await prisma.tenant.findFirst({
    where: {
      accessToken: token
    },
    include: {
      policy: true,
      documents: true,
      personalReferences: true,
      addressDetails: true,
      employerAddressDetails: true,
      previousRentalAddressDetails: true
    }
  });

  if (!tenant) {
    return { valid: false, message: 'Token inválido' };
  }

  if (tenant.tokenExpiry && tenant.tokenExpiry < new Date()) {
    return { valid: false, message: 'Token expirado' };
  }

  if (tenant.informationComplete) {
    return { valid: true, tenant, completed: true, message: 'La información ya fue completada y está en proceso de revisión' };
  }

  return { valid: true, tenant };
}

/**
 * Validate a joint obligor token
 */
export async function validateJointObligorToken(token: string): Promise<{ valid: boolean; jointObligor?: any; message?: string }> {
  const jointObligor = await prisma.jointObligor.findFirst({
    where: {
      accessToken: token
    },
    include: {
      policy: true,
      documents: true,
      personalReferences: true,
      commercialReferences: true,
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true
    }
  });

  if (!jointObligor) {
    return { valid: false, message: 'Token inválido' };
  }

  if (jointObligor.tokenExpiry && jointObligor.tokenExpiry < new Date()) {
    return { valid: false, message: 'Token expirado' };
  }

  return { valid: true, jointObligor };
}

/**
 * Validate an aval token
 */
export async function validateAvalToken(token: string): Promise<{ valid: boolean; aval?: any; message?: string; completed?: boolean }> {
  const aval = await prisma.aval.findFirst({
    where: {
      accessToken: token
    },
    include: {
      policy: true,
      documents: true,
      personalReferences: true,
      commercialReferences: true,
      addressDetails: true,
      employerAddressDetails: true,
      guaranteePropertyDetails: true
    }
  });

  if (!aval) {
    return { valid: false, message: 'Token inválido' };
  }

  if (aval.tokenExpiry && aval.tokenExpiry < new Date()) {
    return { valid: false, message: 'Token expirado' };
  }

  return { valid: true, aval };
}

export const generateLandlordToken = (landlordId: string) => generateActorToken('landlord', landlordId);

/**
 * Validate a landlord token
 */
export async function validateLandlordToken(token: string): Promise<{ valid: boolean; landlord?: any; message?: string; completed?: boolean }> {
  const landlord = await prisma.landlord.findFirst({
    where: {
      accessToken: token
    },
    include: {
      policy: {
        include: {
          propertyDetails: {
            include: {
              propertyAddressDetails: true
            }
          }
        }
      },
      documents: true,
      addressDetails: true
    }
  });

  if (!landlord) {
    return { valid: false, message: 'Token inválido' };
  }

  if (landlord.tokenExpiry && landlord.tokenExpiry < new Date()) {
    return { valid: false, message: 'Token expirado' };
  }

  if (landlord.informationComplete) {
    return { valid: true, landlord, completed: true, message: 'La información ya fue completada y está en proceso de revisión' };
  }

  return { valid: true, landlord };
}

/**
 * Renew an expired token (forces new token generation)
 */
export async function renewToken(actorType: ActorType, actorId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
  const token = generateSecureToken();
  const expiresAt = generateExpiresAt();

  const model = actorTypeToPrismaModel[actorType];
  await (prisma[model] as any).update({
    where: { id: actorId },
    data: { accessToken: token, tokenExpiry: expiresAt }
  });

  return {
    token,
    url: generateActorUrl(token, actorTypeToUrlType[actorType]),
    expiresAt
  };
}

/**
 * Generate tokens for all actors in a policy
 */
export async function generatePolicyActorTokens(policyId: string): Promise<{
  tenant?: { token: string; url: string; expiresAt: Date };
  jointObligors?: Array<{ id: string; token: string; url: string; expiresAt: Date }>;
  avals?: Array<{ id: string; token: string; url: string; expiresAt: Date }>;
}> {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      tenant: true,
      jointObligors: true,
      avals: true
    }
  });

  if (!policy) {
    throw new Error('Policy not found');
  }

  const result: any = {};

  // Generate tenant token
  if (policy.tenant) {
    result.tenant = await generateTenantToken(policy.tenant.id);
  }

  // Generate joint obligor tokens
  if (policy.jointObligors && policy.jointObligors.length > 0) {
    result.jointObligors = await Promise.all(
      policy.jointObligors.map(async (jo) => ({
        id: jo.id,
        ...await generateJointObligorToken(jo.id)
      }))
    );
  }

  // Generate aval tokens
  if (policy.avals && policy.avals.length > 0) {
    result.avals = await Promise.all(
      policy.avals.map(async (aval) => ({
        id: aval.id,
        ...await generateAvalToken(aval.id)
      }))
    );
  }

  return result;
}

/**
 * Check if all actors have completed their information
 */
export async function checkPolicyActorsComplete(policyId: string): Promise<{
  allComplete: boolean;
  primaryLandlord: boolean;
  tenant: boolean;
  jointObligors: boolean;
  avals: boolean;
  details: {
    primaryLandlordComplete?: boolean;
    tenantComplete?: boolean;
    jointObligorsComplete?: { [id: string]: boolean };
    avalsComplete?: { [id: string]: boolean };
  };
}> {
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    include: {
      landlords: {
        select: {
          id: true,
          isPrimary: true,
          informationComplete: true,
        }
      },
      tenant: true,
      jointObligors: true,
      avals: true
    }
  });

  if (!policy) {
    throw new Error('Policy not found');
  }

  const details: any = {};
  let primaryLandlordComplete = false;
  let tenantComplete = true;
  let jointObligorsComplete = true;
  let avalsComplete = true;

  // Check primary landlord
  const primaryLandlord = policy.landlords.find(l => l.isPrimary);
  if (primaryLandlord) {
    primaryLandlordComplete = primaryLandlord.informationComplete;
  } else {
    // No primary landlord means not complete
    details.primaryLandlordComplete = false;
    primaryLandlordComplete = false;
  }

  // Check tenant
  if (policy.tenant) {
    details.tenantComplete = policy.tenant.informationComplete;
    tenantComplete = policy.tenant.informationComplete;
  } else {
    tenantComplete = false;
  }

  // Check joint obligors based on guarantorType
  if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
    if (policy.jointObligors && policy.jointObligors.length > 0) {
      details.jointObligorsComplete = {};
      for (const jo of policy.jointObligors) {
        details.jointObligorsComplete[jo.id] = jo.informationComplete;
        if (!jo.informationComplete) {
          jointObligorsComplete = false;
        }
      }
    } else {
      // Required but not present
      jointObligorsComplete = false;
    }
  } else {
    // Not required for this guarantorType
    jointObligorsComplete = true;
  }

  // Check avals based on guarantorType
  if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
    if (policy.avals && policy.avals.length > 0) {
      details.avalsComplete = {};
      for (const aval of policy.avals) {
        details.avalsComplete[aval.id] = aval.informationComplete;
        if (!aval.informationComplete) {
          avalsComplete = false;
        }
      }
    } else {
      // Required but not present
      avalsComplete = false;
    }
  } else {
    // Not required for this guarantorType
    avalsComplete = true;
  }

  return {
    allComplete: primaryLandlordComplete && tenantComplete && jointObligorsComplete && avalsComplete,
    primaryLandlord: primaryLandlordComplete,
    tenant: tenantComplete,
    jointObligors: jointObligorsComplete,
    avals: avalsComplete,
    details
  };
}
