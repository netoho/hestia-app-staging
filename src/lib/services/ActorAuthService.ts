import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { UserRole } from '@/lib/enums';
import prisma from '@/lib/prisma';
import { ServiceError, ErrorCode } from './types/errors';
import { isValidToken } from '@/lib/utils/tokenUtils';

export interface ActorAuthResult {
  authType: 'admin' | 'actor';
  actor: any;
  user?: any;
  canEdit: boolean;
  skipValidation: boolean;
  userId?: string;
  actorName?: string;
}

/**
 * Service for handling dual authentication (admin session vs actor token)
 */
export class ActorAuthService {

  /**
   * Resolve authentication context for an actor request
   * Determines if request is from admin (using UUID) or actor (using token)
   */
  async resolveActorAuth(
    type: string,
    identifier: string,
    request: NextRequest | null
  ): Promise<ActorAuthResult> {
    // Check if identifier is UUID (admin access) or token (actor access)
    if (isValidToken(identifier)) {
      return this.handleActorAuth(type, identifier);
    } else {
      return this.handleAdminAuth(type, identifier, request);
    }
  }

  /**
   * Handle admin authentication (session-based)
   */
  private async handleAdminAuth(
    type: string,
    actorId: string,
    request: NextRequest | null
  ): Promise<ActorAuthResult> {
    // Get session
    const session = await getServerSession(authOptions);

    // For document operations, allow access without session if it's a same-origin request
    // This allows dashboard components to access documents
    let isDocumentRequest = false;
    let isSameOrigin = false;

    if (request) {
      isDocumentRequest = request.url.includes('/documents');
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      isSameOrigin = (origin?.includes('localhost') ?? false) || (referer?.includes('localhost') ?? false);
    }

    if (!session?.user?.id) {
      // Allow document read operations from same origin without session
      if (isDocumentRequest && isSameOrigin && request?.method === 'GET') {
        // Fetch actor directly for read-only access
        const actor = await this.fetchActorById(type, actorId);

        if (!actor) {
          throw new ServiceError(
            ErrorCode.NOT_FOUND,
            'Actor no encontrado',
            404
          );
        }

        return {
          actor,
          actorName: this.getActorName(actor),
          canEdit: false, // Read-only access
          authType: 'admin',
          skipValidation: false
        };
      }

      throw new ServiceError(
        ErrorCode.UNAUTHORIZED,
        'No autorizado',
        401
      );
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      }
    });

    if (!user) {
      throw new ServiceError(
        ErrorCode.UNAUTHORIZED,
        'Usuario no encontrado',
        401
      );
    }

    // Check if user has appropriate role
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER];
    if (!allowedRoles.includes(user.role)) {
      throw new ServiceError(
        ErrorCode.FORBIDDEN,
        'Rol insuficiente para esta operación',
        403
      );
    }

    // Fetch the actor based on type
    const actor = await this.fetchActorById(type, actorId);

    if (!actor) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        `${this.getActorTypeName(type)} no encontrado`,
        404
      );
    }

    const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

    return {
      authType: 'admin',
      actor,
      user,
      canEdit: true,
      skipValidation: adminRoles.includes(user.role),
      userId: user.id,
      actorName: this.getActorName(actor)
    };
  }

  /**
   * Handle actor authentication (token-based)
   */
  private async handleActorAuth(
    type: string,
    token: string
  ): Promise<ActorAuthResult> {
    // Validate token based on actor type
    const actor = await this.validateActorToken(type, token);

    if (!actor) {
      throw new ServiceError(
        ErrorCode.INVALID_TOKEN,
        'Token inválido',
        400
      );
    }

    // Check token expiry
    if (actor.tokenExpiry && actor.tokenExpiry < new Date()) {
      throw new ServiceError(
        ErrorCode.TOKEN_EXPIRED,
        'Token expirado',
        400
      );
    }

    return {
      authType: 'actor',
      actor,
      canEdit: !actor.informationComplete, // Can only edit if not complete
      skipValidation: false, // Actors always validate
      actorName: this.getActorName(actor)
    };
  }

  /**
   * Fetch actor by ID based on type
   */
  private async fetchActorById(type: string, id: string): Promise<any> {
    switch (type) {
      case 'tenant':
        return prisma.tenant.findUnique({
          where: { id },
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            previousRentalAddressDetails: true,
            personalReferences: true,
            commercialReferences: true,
            policy: true
          }
        });

      case 'landlord':
        return prisma.landlord.findUnique({
          where: { id },
          include: {
            addressDetails: true,
            policy: true
          }
        });

      case 'jointObligor':
        return prisma.jointObligor.findUnique({
          where: { id },
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true,
            policy: true
          }
        });

      case 'aval':
        return prisma.aval.findUnique({
          where: { id },
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true,
            policy: true
          }
        });

      default:
        throw new ServiceError(
          ErrorCode.INVALID_REQUEST,
          `Tipo de actor inválido: ${type}`,
          400
        );
    }
  }

  /**
   * Validate actor token based on type
   */
  private async validateActorToken(type: string, token: string): Promise<any> {
    switch (type) {
      case 'tenant':
        return prisma.tenant.findFirst({
          where: { accessToken: token },
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            previousRentalAddressDetails: true,
            personalReferences: true,
            commercialReferences: true,
            policy: true
          }
        });

      case 'landlord':
        return prisma.landlord.findFirst({
          where: { accessToken: token },
          include: {
            addressDetails: true,
            policy: true
          }
        });

      case 'jointObligor':
        return prisma.jointObligor.findFirst({
          where: { accessToken: token },
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true,
            policy: true
          }
        });

      case 'aval':
        return prisma.aval.findFirst({
          where: { accessToken: token },
          include: {
            addressDetails: true,
            employerAddressDetails: true,
            guaranteePropertyDetails: true,
            personalReferences: true,
            commercialReferences: true,
            policy: true
          }
        });

      default:
        throw new ServiceError(
          ErrorCode.INVALID_REQUEST,
          `Tipo de actor inválido: ${type}`,
          400
        );
    }
  }

  /**
   * Get display name for actor type
   */
  private getActorTypeName(type: string): string {
    const names: Record<string, string> = {
      'tenant': 'Inquilino',
      'landlord': 'Arrendador',
      'joint-obligor': 'Obligado solidario',
      'aval': 'Aval'
    };
    return names[type] || 'Actor';
  }

  /**
   * Get actor's name for display
   */
  private getActorName(actor: any): string {
    if (actor.companyName) {
      return actor.companyName;
    }

    const nameParts = [
      actor.firstName,
      actor.middleName,
      actor.paternalLastName,
      actor.maternalLastName
    ].filter(Boolean);

    return nameParts.join(' ') || 'Sin nombre';
  }

  /**
   * Check if user can access policy
   * Used for additional authorization checks
   */
  async canAccessPolicy(userId: string, policyId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) return false;

    // Admins and staff can access all
    if ([UserRole.ADMIN, UserRole.STAFF].includes(user.role)) {
      return true;
    }

    // Brokers can only access their own policies
    if (user.role === UserRole.BROKER) {
      const policy = await prisma.policy.findFirst({
        where: {
          id: policyId,
          createdById: userId
        }
      });
      return !!policy;
    }

    return false;
  }
}

// Export singleton instance
export const actorAuthService = new ActorAuthService();
