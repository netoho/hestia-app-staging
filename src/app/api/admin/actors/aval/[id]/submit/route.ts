/**
 * Admin endpoint for editing aval information
 * Requires authentication and proper permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { AvalService } from '@/lib/services/actors/AvalService';
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

    const { id: avalId } = await params;
    const body = await request.json();

    // 2. Get aval and check permissions
    const aval = await prisma.aval.findUnique({
      where: { id: avalId },
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

    if (!aval) {
      return NextResponse.json(
        { error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Check if user can edit (ADMIN, STAFF, or policy owner)
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canEdit = ['ADMIN', 'STAFF'].includes(userRole) ||
                    aval.policy.createdById === userId;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit this aval' },
        { status: 403 }
      );
    }

    // 3. Save data using AvalService
    const isPartialSave = body.partial === true;
    const avalService = new AvalService();

    // Save aval information
    const saveResult = await avalService.saveAvalInformation(
      avalId,
      body.aval,
      isPartialSave
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

    // Save guarantee property address if provided
    if (body.guaranteePropertyAddressDetails) {
      const addressResult = await avalService.saveGuaranteePropertyAddress(
        avalId,
        body.guaranteePropertyAddressDetails
      );

      if (!addressResult.ok) {
        return NextResponse.json(
          {
            error: addressResult.error.message,
            details: addressResult.error.context
          },
          { status: addressResult.error.statusCode || 400 }
        );
      }
    }

    // Save personal references if provided
    if (body.personalReferences && body.personalReferences.length > 0) {
      const refResult = await avalService.savePersonalReferences(
        avalId,
        body.personalReferences
      );

      if (!refResult.ok) {
        return NextResponse.json(
          {
            error: refResult.error.message,
            details: refResult.error.context
          },
          { status: refResult.error.statusCode || 400 }
        );
      }
    }

    // Save commercial references if provided
    if (body.commercialReferences && body.commercialReferences.length > 0) {
      const refResult = await avalService.saveCommercialReferences(
        avalId,
        body.commercialReferences
      );

      if (!refResult.ok) {
        return NextResponse.json(
          {
            error: refResult.error.message,
            details: refResult.error.context
          },
          { status: refResult.error.statusCode || 400 }
        );
      }
    }

    // 4. Log admin action
    await logPolicyActivity({
      policyId: aval.policy.id,
      action: 'admin_edited_aval',
      performedById: userId,
      description: `Admin ${session.user.email} edited aval information for policy ${aval.policy.policyNumber}`,
      details: {
        avalId,
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
      aval: {
        id: avalId,
        informationComplete: !isPartialSave
      }
    });

  } catch (error) {
    console.error('Admin aval submission error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}