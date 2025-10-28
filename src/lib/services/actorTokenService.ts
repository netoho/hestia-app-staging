import { randomBytes } from 'crypto';
import prisma from '../prisma';

/**
 * Generate expires at date 1000 days from now
 */
export function generateExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1000); // 7 days expiration

  return expiresAt;
}

/**
 * Generate a secure token for actor self-service access
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
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

/**
 * Generate or reuse existing valid token for an actor
 */
async function generateOrReuseToken(
  actorType: 'tenant' | 'joint-obligor' | 'aval' | 'landlord',
  actorId: string,
  currentToken: string | null,
  currentExpiry: Date | null
): Promise<{ token: string; url: string; expiresAt: Date }> {
  // If valid token exists, return it
  if (isTokenValid(currentToken, currentExpiry)) {
    return {
      token: currentToken!,
      url: generateActorUrl(currentToken!, actorType),
      expiresAt: currentExpiry!
    };
  }

  // Generate new token
  const token = generateSecureToken();
  const expiresAt = generateExpiresAt();

  // Update database based on actor type
  switch (actorType) {
    case 'tenant':
      await prisma.tenant.update({
        where: { id: actorId },
        data: { accessToken: token, tokenExpiry: expiresAt }
      });
      break;
    case 'joint-obligor':
      await prisma.jointObligor.update({
        where: { id: actorId },
        data: { accessToken: token, tokenExpiry: expiresAt }
      });
      break;
    case 'aval':
      await prisma.aval.update({
        where: { id: actorId },
        data: { accessToken: token, tokenExpiry: expiresAt }
      });
      break;
    case 'landlord':
      await prisma.landlord.update({
        where: { id: actorId },
        data: { accessToken: token, tokenExpiry: expiresAt }
      });
      break;
  }

  return {
    token,
    url: generateActorUrl(token, actorType),
    expiresAt
  };
}

/**
 * Create or update token for a tenant
 */
export async function generateTenantToken(tenantId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { accessToken: true, tokenExpiry: true }
  });

  return generateOrReuseToken(
    'tenant',
    tenantId,
    tenant?.accessToken || null,
    tenant?.tokenExpiry || null
  );
}

/**
 * Create or update token for a joint obligor
 */
export async function generateJointObligorToken(jointObligorId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
  const jointObligor = await prisma.jointObligor.findUnique({
    where: { id: jointObligorId },
    select: { accessToken: true, tokenExpiry: true }
  });

  return generateOrReuseToken(
    'joint-obligor',
    jointObligorId,
    jointObligor?.accessToken || null,
    jointObligor?.tokenExpiry || null
  );
}

/**
 * Create or update token for an aval
 */
export async function generateAvalToken(avalId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
  const aval = await prisma.aval.findUnique({
    where: { id: avalId },
    select: { accessToken: true, tokenExpiry: true }
  });

  return generateOrReuseToken(
    'aval',
    avalId,
    aval?.accessToken || null,
    aval?.tokenExpiry || null
  );
}

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
      references: true,
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
      references: true,
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
      references: true,
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

/**
 * Create or update token for a landlord
 */
export async function generateLandlordToken(landlordId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: { accessToken: true, tokenExpiry: true }
  });

  return generateOrReuseToken(
    'landlord',
    landlordId,
    landlord?.accessToken || null,
    landlord?.tokenExpiry || null
  );
}

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
 * Renew an expired token
 */
export async function renewToken(actorType: 'tenant' | 'jointObligor' | 'aval' | 'landlord', actorId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
  const token = generateSecureToken();
  const expiresAt = generateExpiresAt();

  switch (actorType) {
    case 'tenant':
      await prisma.tenant.update({
        where: { id: actorId },
        data: {
          accessToken: token,
          tokenExpiry: expiresAt
        }
      });
      return {
        token,
        url: generateActorUrl(token, 'tenant'),
        expiresAt
      };

    case 'jointObligor':
      await prisma.jointObligor.update({
        where: { id: actorId },
        data: {
          accessToken: token,
          tokenExpiry: expiresAt
        }
      });
      return {
        token,
        url: generateActorUrl(token, 'joint-obligor'),
        expiresAt
      };

    case 'aval':
      await prisma.aval.update({
        where: { id: actorId },
        data: {
          accessToken: token,
          tokenExpiry: expiresAt
        }
      });
      return {
        token,
        url: generateActorUrl(token, 'aval'),
        expiresAt
      };

    case 'landlord':
      await prisma.landlord.update({
        where: { id: actorId },
        data: {
          accessToken: token,
          tokenExpiry: expiresAt
        }
      });
      return {
        token,
        url: generateActorUrl(token, 'landlord'),
        expiresAt
      };

    default:
      throw new Error('Invalid actor type');
  }
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
  tenant: boolean;
  jointObligors: boolean;
  avals: boolean;
  details: {
    tenantComplete?: boolean;
    jointObligorsComplete?: { [id: string]: boolean };
    avalsComplete?: { [id: string]: boolean };
  };
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

  const details: any = {};
  let tenantComplete = true;
  let jointObligorsComplete = true;
  let avalsComplete = true;

  // Check tenant
  if (policy.tenant) {
    details.tenantComplete = policy.tenant.informationComplete;
    tenantComplete = policy.tenant.informationComplete;
  }

  // Check joint obligors
  if (policy.jointObligors && policy.jointObligors.length > 0) {
    details.jointObligorsComplete = {};
    for (const jo of policy.jointObligors) {
      details.jointObligorsComplete[jo.id] = jo.informationComplete;
      if (!jo.informationComplete) {
        jointObligorsComplete = false;
      }
    }
  }

  // Check avals
  if (policy.avals && policy.avals.length > 0) {
    details.avalsComplete = {};
    for (const aval of policy.avals) {
      details.avalsComplete[aval.id] = aval.informationComplete;
      if (!aval.informationComplete) {
        avalsComplete = false;
      }
    }
  }

  return {
    allComplete: tenantComplete && jointObligorsComplete && avalsComplete,
    tenant: tenantComplete,
    jointObligors: jointObligorsComplete,
    avals: avalsComplete,
    details
  };
}
