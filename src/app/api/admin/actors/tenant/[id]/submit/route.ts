/**
 * Admin endpoint for editing tenant information
 * Requires authentication and proper permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { TenantService } from '@/lib/services/actors/TenantService';
import { logPolicyActivity } from '@/lib/services/policyService';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id: tenantId } = await params;
    const body = await request.json();

    // 2. Get tenant and check permissions
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        policy: {
          select: {
            id: true,
            createdById: true,
            policyNumber: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if user can edit (ADMIN, STAFF, or policy owner)
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canEdit = ['ADMIN', 'STAFF'].includes(userRole) ||
                    tenant.policy.createdById === userId;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit this tenant' },
        { status: 403 }
      );
    }

    // 3. Initialize service and save data
    const tenantService = new TenantService();
    const isPartialSave = body.partial === true;

    // Save tenant information (data is directly in body, not body.tenant)
    // Skip validation for admin endpoints
    const saveResult = await tenantService.saveTenantInformation(
      tenantId,
      body,
      isPartialSave,
      true  // skipValidation for admin
    );

    if (!saveResult.ok) {
      return NextResponse.json(
        {
          error: saveResult.error.message,
          details: saveResult.error.context
        },
        { status: saveResult.error.statusCode || 400 }
      );
    }

    // 4. Log admin action
    await logPolicyActivity({
      policyId: tenant.policy.id,
      action: 'admin_edited_tenant',
      performedById: userId,
      description: `Admin ${session.user.email} edited tenant information for policy ${tenant.policy.policyNumber}`,
      details: {
        tenantId,
        isPartialSave,
        editedBy: session.user.email,
        role: userRole
      }
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: isPartialSave
        ? 'Información guardada parcialmente'
        : 'Información actualizada correctamente',
      tenant: {
        id: tenantId,
        informationComplete: !isPartialSave
      }
    });

  } catch (error) {
    console.error('Admin tenant submission error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? { message: error.message } : error
      },
      { status: 500 }
    );
  }
}