import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@prisma/client';
import { actorAuthService } from '@/lib/services/ActorAuthService';
import { getServiceForType } from '@/lib/services/actors';
import { formatFullName } from '@/lib/utils/names';

/**
 * GET /api/actors/[type]/[identifier]
 * Fetch actor data (replaces validate endpoints)
 * Works for both admin (UUID) and actor (token) access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // For admin access, use withRole middleware
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
        // Additional authorization check for brokers
        if (user.role === UserRole.BROKER) {
          const canAccess = await actorAuthService.canAccessPolicy(user.id, auth.actor.policyId);
          if (!canAccess) {
            return NextResponse.json(
              { error: 'No autorizado para acceder a este actor' },
              { status: 403 }
            );
          }
        }

        return NextResponse.json({
          success: true,
          data: formatActorData(auth.actor, type),
          policy: auth.actor.policy,
          canEdit: auth.canEdit,
          authType: auth.authType
        });
      });
    }

    // Actor token access
    return NextResponse.json({
      success: true,
      data: formatActorData(auth.actor, type),
      policy: auth.actor.policy,
      canEdit: auth.canEdit,
      authType: auth.authType
    });

  } catch (error: any) {
    console.error('Actor GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener información del actor' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * PUT /api/actors/[type]/[identifier]
 * Partial update (auto-save)
 * Works for both admin and actor access
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;
    const data = await request.json();

    // Get the appropriate service
    const service = getServiceForType(type);

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Check if editing is allowed
    if (!auth.canEdit) {
      return NextResponse.json(
        { error: 'La información ya fue completada y no puede ser editada' },
        { status: 400 }
      );
    }

    // Handle admin access
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
        // Additional authorization check for brokers
        if (user.role === UserRole.BROKER) {
          const canAccess = await actorAuthService.canAccessPolicy(user.id, auth.actor.policyId);
          if (!canAccess) {
            return NextResponse.json(
              { error: 'No autorizado para editar este actor' },
              { status: 403 }
            );
          }
        }

        // Admin uses save method with skipValidation
        const result = await service.save(
          auth.actor.id,
          data,
          true, // isPartial
          auth.skipValidation
        );

        if (!result.ok) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Información guardada exitosamente',
          data: result.value
        });
      });
    }

    // Actor token access - use validateAndSave
    const result = await service.validateAndSave(
      identifier, // token
      data,
      true // isPartialSave
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: result.value
    });

  } catch (error: any) {
    console.error('Actor PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar información' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/actors/[type]/[identifier]
 * Final submission
 * Works for both admin and actor access
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;
    const data = await request.json();

    // Get the appropriate service
    const service = getServiceForType(type);

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Check if editing is allowed
    if (!auth.canEdit) {
      return NextResponse.json(
        { error: 'La información ya fue completada' },
        { status: 400 }
      );
    }

    // Handle admin access
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
        // Only admin and staff can do final submission for actors
        // Admin uses save method with completion flag
        const result = await service.save(
          auth.actor.id,
          {
            ...data,
            informationComplete: true,
            completedAt: new Date()
          },
          false, // not partial
          auth.skipValidation
        );

        if (!result.ok) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          );
        }

        // Log activity
        const { logPolicyActivity } = await import('@/lib/services/policyService');
        await logPolicyActivity({
          policyId: auth.actor.policyId,
          action: `${type}_info_completed`,
          description: `${auth.actorName} información completada por admin`,
          details: {
            actorId: auth.actor.id,
            actorName: auth.actorName,
            completedBy: 'admin',
            userId: user.id
          },
          performedByType: 'admin',
          performedById: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        });

        // Check if all actors complete and transition if needed
        const { checkPolicyActorsComplete } = await import('@/lib/services/actorTokenService');
        const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');

        const actorsStatus = await checkPolicyActorsComplete(auth.actor.policyId);
        if (actorsStatus.allComplete) {
          await transitionPolicyStatus(
            auth.actor.policyId,
            'UNDER_INVESTIGATION',
            'system',
            'All actor information completed'
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Información completada exitosamente',
          data: {
            actor: result.value,
            actorsComplete: actorsStatus.allComplete
          }
        });
      });
    }

    // Actor token access - use validateAndSave
    const result = await service.validateAndSave(
      identifier, // token
      data,
      false // not partial save - final submission
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Check if all actors complete and transition if needed
    const { checkPolicyActorsComplete } = await import('@/lib/services/actorTokenService');
    const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');

    const actorsStatus = await checkPolicyActorsComplete(auth.actor.policyId);
    if (actorsStatus.allComplete) {
      await transitionPolicyStatus(
        auth.actor.policyId,
        'UNDER_INVESTIGATION',
        'system',
        'All actor information completed'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Información completada exitosamente',
      data: {
        ...result.value,
        actorsComplete: actorsStatus.allComplete
      }
    });

  } catch (error: any) {
    console.error('Actor POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al completar información' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/actors/[type]/[identifier]
 * Remove actor (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;

    // Only admins can delete actors
    return withRole(request, [UserRole.ADMIN], async (req, user) => {
      // Resolve authentication (will throw if not UUID)
      const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

      if (auth.authType !== 'admin') {
        return NextResponse.json(
          { error: 'Solo administradores pueden eliminar actores' },
          { status: 403 }
        );
      }

      // Get the appropriate service
      const service = getServiceForType(type);

      // Delete the actor
      const result = await service.delete(auth.actor.id);

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // Log activity
      const { logPolicyActivity } = await import('@/lib/services/policyService');
      await logPolicyActivity({
        policyId: auth.actor.policyId,
        action: `${type}_deleted`,
        description: `${auth.actorName} eliminado`,
        details: {
          actorId: auth.actor.id,
          actorName: auth.actorName,
          deletedBy: user.email
        },
        performedByType: 'admin',
        performedById: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        message: 'Actor eliminado exitosamente'
      });
    });

  } catch (error: any) {
    console.error('Actor DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar actor' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * Format actor data for response
 */
function formatActorData(actor: any, type: string) {
  // Remove sensitive fields
  const { accessToken, tokenExpiry, ...safeData } = actor;

  // Add computed fields and references based on actor type
  const formattedData: any = {
    ...safeData,
    type,
    displayName: actor.companyName || formatFullName(
      actor.firstName,
      actor.paternalLastName,
      actor.maternalLastName,
      actor.middleName,
    ),
    isComplete: actor.informationComplete,
    completedAt: actor.completedAt
  };

  // Include references based on actor type and subtype
  if (type === 'tenant') {
    if (actor.tenantType === 'COMPANY' && actor.commercialReferences) {
      formattedData.commercialReferences = actor.commercialReferences;
    }
    if (actor.tenantType === 'INDIVIDUAL' && actor.references) {
      formattedData.references = actor.references;
    }
  } else if ((type === 'joint-obligor' || type === 'aval')) {
    // Joint obligor and aval can have both types of references depending on isCompany
    if (actor.isCompany && actor.commercialReferences) {
      formattedData.commercialReferences = actor.commercialReferences;
    }
    if (!actor.isCompany && actor.references) {
      formattedData.references = actor.references;
    }
  }

  return formattedData;
}
