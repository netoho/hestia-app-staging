import { BaseService } from './base/BaseService';
import { generateSecureToken } from '@/lib/utils/tokenUtils';
import type { PrismaClient, Prisma } from "@/prisma/generated/prisma-client/client";
import { TOKEN_CONFIG } from "@/lib/constants/businessConfig";
import { ServiceError, ErrorCode } from './types/errors';
import { DocumentUploadStatus } from '@/prisma/generated/prisma-client/enums';
import { getActorDelegate } from '@/lib/utils/prismaActorDelegate';

// Type-safe return types for validate functions using Prisma's GetPayload
type ValidateTenantResult = Prisma.TenantGetPayload<{
  include: {
    policy: true;
    documents: true;
    personalReferences: true;
    addressDetails: true;
    employerAddressDetails: true;
    previousRentalAddressDetails: true;
  };
}>;

type ValidateJointObligorResult = Prisma.JointObligorGetPayload<{
  include: {
    policy: true;
    documents: true;
    personalReferences: true;
    commercialReferences: true;
    addressDetails: true;
    employerAddressDetails: true;
    guaranteePropertyDetails: true;
  };
}>;

type ValidateAvalResult = Prisma.AvalGetPayload<{
  include: {
    policy: true;
    documents: true;
    personalReferences: true;
    commercialReferences: true;
    addressDetails: true;
    employerAddressDetails: true;
    guaranteePropertyDetails: true;
  };
}>;

type ValidateLandlordResult = Prisma.LandlordGetPayload<{
  include: {
    policy: {
      include: {
        propertyDetails: {
          include: {
            propertyAddressDetails: true;
          };
        };
      };
    };
    documents: true;
    addressDetails: true;
  };
}>;

// Transaction client type
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

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

class ActorTokenService extends BaseService {
  /**
   * Generate expires at date based on TOKEN_CONFIG.EXPIRATION_DAYS
   */
  generateExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_CONFIG.EXPIRATION_DAYS);
    return expiresAt;
  }

  /**
   * Generate access URL for an actor
   */
  generateActorUrl(token: string, actorType: 'tenant' | 'joint-obligor' | 'aval' | 'landlord'): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/actor/${actorType}/${token}`;
  }

  /**
   * Check if token is still valid (not expired)
   */
  private isTokenValid(accessToken: string | null, tokenExpiry: Date | null): boolean {
    if (!accessToken || !tokenExpiry) return false;
    return tokenExpiry >= new Date();
  }

  /**
   * Update actor token in database
   */
  private async updateActorToken(
    tx: TransactionClient,
    actorType: ActorType,
    actorId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    const delegate = getActorDelegate(tx, actorType);
    await delegate.update({
      where: { id: actorId },
      data: { accessToken: token, tokenExpiry: expiresAt }
    });
  }

  /**
   * Find actor and get current token info
   */
  private async findActorToken(
    tx: TransactionClient,
    actorType: ActorType,
    actorId: string
  ): Promise<{ accessToken: string | null; tokenExpiry: Date | null } | null> {
    const delegate = getActorDelegate(tx, actorType);
    return delegate.findUnique({
      where: { id: actorId },
      select: { accessToken: true, tokenExpiry: true }
    });
  }

  /**
   * Generate or reuse existing valid token for an actor
   */
  private async generateOrReuseToken(
    tx: TransactionClient,
    actorType: ActorType,
    actorId: string,
    currentToken: string | null,
    currentExpiry: Date | null
  ): Promise<{ token: string; url: string; expiresAt: Date }> {
    const urlType = actorTypeToUrlType[actorType];

    // If valid token exists, return it
    if (this.isTokenValid(currentToken, currentExpiry)) {
      return {
        token: currentToken!,
        url: this.generateActorUrl(currentToken!, urlType),
        expiresAt: currentExpiry!
      };
    }

    // Generate new token
    const token = generateSecureToken();
    const expiresAt = this.generateExpiresAt();

    // Update database
    await this.updateActorToken(tx, actorType, actorId, token, expiresAt);

    return {
      token,
      url: this.generateActorUrl(token, urlType),
      expiresAt
    };
  }

  /**
   * Generic function to generate or reuse token for any actor type
   */
  async generateActorToken(
    actorType: ActorType,
    actorId: string
  ): Promise<{ token: string; url: string; expiresAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.findActorToken(tx as TransactionClient, actorType, actorId);
      return this.generateOrReuseToken(
        tx as TransactionClient,
        actorType,
        actorId,
        actor?.accessToken || null,
        actor?.tokenExpiry || null
      );
    });
  }

  // Backwards-compatible wrapper methods
  generateTenantToken(tenantId: string) {
    return this.generateActorToken('tenant', tenantId);
  }

  generateJointObligorToken(jointObligorId: string) {
    return this.generateActorToken('jointObligor', jointObligorId);
  }

  generateAvalToken(avalId: string) {
    return this.generateActorToken('aval', avalId);
  }

  generateLandlordToken(landlordId: string) {
    return this.generateActorToken('landlord', landlordId);
  }

  /**
   * Validate a tenant token
   */
  async validateTenantToken(token: string): Promise<{ valid: boolean; tenant?: ValidateTenantResult; message?: string; completed?: boolean }> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        accessToken: token
      },
      include: {
        policy: true,
        documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
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
  async validateJointObligorToken(token: string): Promise<{ valid: boolean; jointObligor?: ValidateJointObligorResult; message?: string }> {
    const jointObligor = await this.prisma.jointObligor.findFirst({
      where: {
        accessToken: token
      },
      include: {
        policy: true,
        documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
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
  async validateAvalToken(token: string): Promise<{ valid: boolean; aval?: ValidateAvalResult; message?: string; completed?: boolean }> {
    const aval = await this.prisma.aval.findFirst({
      where: {
        accessToken: token
      },
      include: {
        policy: true,
        documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
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

  /**
   * Validate a landlord token
   */
  async validateLandlordToken(token: string): Promise<{ valid: boolean; landlord?: ValidateLandlordResult; message?: string; completed?: boolean }> {
    const landlord = await this.prisma.landlord.findFirst({
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
        documents: { where: { uploadStatus: DocumentUploadStatus.COMPLETE } },
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
  async renewToken(actorType: ActorType, actorId: string): Promise<{ token: string; url: string; expiresAt: Date }> {
    const token = generateSecureToken();
    const expiresAt = this.generateExpiresAt();

    const delegate = getActorDelegate(this.prisma, actorType);
    await delegate.update({
      where: { id: actorId },
      data: { accessToken: token, tokenExpiry: expiresAt }
    });

    return {
      token,
      url: this.generateActorUrl(token, actorTypeToUrlType[actorType]),
      expiresAt
    };
  }

  /**
   * Generate tokens for all actors in a policy
   */
  async generatePolicyActorTokens(policyId: string): Promise<{
    tenant?: { token: string; url: string; expiresAt: Date };
    jointObligors?: Array<{ id: string; token: string; url: string; expiresAt: Date }>;
    avals?: Array<{ id: string; token: string; url: string; expiresAt: Date }>;
  }> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true,
        jointObligors: true,
        avals: true
      }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    const result: {
      tenant?: { token: string; url: string; expiresAt: Date };
      jointObligors?: Array<{ id: string; token: string; url: string; expiresAt: Date }>;
      avals?: Array<{ id: string; token: string; url: string; expiresAt: Date }>;
    } = {};

    // Generate tenant token
    if (policy.tenant) {
      result.tenant = await this.generateTenantToken(policy.tenant.id);
    }

    // Generate joint obligor tokens
    if (policy.jointObligors && policy.jointObligors.length > 0) {
      result.jointObligors = await Promise.all(
        policy.jointObligors.map(async (jo) => ({
          id: jo.id,
          ...await this.generateJointObligorToken(jo.id)
        }))
      );
    }

    // Generate aval tokens
    if (policy.avals && policy.avals.length > 0) {
      result.avals = await Promise.all(
        policy.avals.map(async (aval) => ({
          id: aval.id,
          ...await this.generateAvalToken(aval.id)
        }))
      );
    }

    return result;
  }

  /**
   * Check if all actors have completed their information
   */
  async checkPolicyActorsComplete(policyId: string): Promise<{
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
    const policy = await this.prisma.policy.findUnique({
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
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    const details: {
      primaryLandlordComplete?: boolean;
      tenantComplete?: boolean;
      jointObligorsComplete?: { [id: string]: boolean };
      avalsComplete?: { [id: string]: boolean };
    } = {};
    let primaryLandlordComplete = false;
    let tenantComplete = true;
    let jointObligorsComplete = true;
    let avalsComplete = true;

    // Check primary landlord
    const primaryLandlord = policy.landlords.find(l => l.isPrimary);
    if (primaryLandlord) {
      primaryLandlordComplete = primaryLandlord.informationComplete;
    } else {
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
        jointObligorsComplete = false;
      }
    } else {
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
        avalsComplete = false;
      }
    } else {
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
}

// Export singleton instance
export const actorTokenService = new ActorTokenService();

// Export legacy functions for backwards compatibility
export const generateExpiresAt = actorTokenService.generateExpiresAt.bind(actorTokenService);
export const generateActorUrl = actorTokenService.generateActorUrl.bind(actorTokenService);
export const generateActorToken = actorTokenService.generateActorToken.bind(actorTokenService);
export const generateTenantToken = actorTokenService.generateTenantToken.bind(actorTokenService);
export const generateJointObligorToken = actorTokenService.generateJointObligorToken.bind(actorTokenService);
export const generateAvalToken = actorTokenService.generateAvalToken.bind(actorTokenService);
export const generateLandlordToken = actorTokenService.generateLandlordToken.bind(actorTokenService);
export const validateTenantToken = actorTokenService.validateTenantToken.bind(actorTokenService);
export const validateJointObligorToken = actorTokenService.validateJointObligorToken.bind(actorTokenService);
export const validateAvalToken = actorTokenService.validateAvalToken.bind(actorTokenService);
export const validateLandlordToken = actorTokenService.validateLandlordToken.bind(actorTokenService);
export const renewToken = actorTokenService.renewToken.bind(actorTokenService);
export const generatePolicyActorTokens = actorTokenService.generatePolicyActorTokens.bind(actorTokenService);
export const checkPolicyActorsComplete = actorTokenService.checkPolicyActorsComplete.bind(actorTokenService);
