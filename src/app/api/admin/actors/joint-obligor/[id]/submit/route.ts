/**
 * Admin endpoint for editing joint obligor information
 * Requires authentication and proper permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { JointObligorService } from '@/lib/services/actors/JointObligorService';
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

    const { id: jointObligorId } = await params;
    const body = await request.json();

    // 2. Get joint obligor and check permissions
    const jointObligor = await prisma.jointObligor.findUnique({
      where: { id: jointObligorId },
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

    if (!jointObligor) {
      return NextResponse.json(
        { error: 'Joint obligor not found' },
        { status: 404 }
      );
    }

    // Check if user can edit (ADMIN, STAFF, or policy owner)
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canEdit = ['ADMIN', 'STAFF'].includes(userRole) ||
                    jointObligor.policy.createdById === userId;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit this joint obligor' },
        { status: 403 }
      );
    }

    // 3. Save data using JointObligorService
    const isPartialSave = body.partial === true;
    const jointObligorService = new JointObligorService();

    // Save joint obligor information
    const saveResult = await jointObligorService.saveJointObligorInformation(
      jointObligorId,
      body.jointObligor,
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

    // Save employer address if provided
    if (body.employerAddressDetails) {
      const addressResult = await jointObligorService.saveEmployerAddress(
        jointObligorId,
        body.employerAddressDetails
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

    // Save guarantee property address if provided
    if (body.guaranteePropertyAddressDetails) {
      const propertyAddressResult = await jointObligorService.saveGuaranteePropertyAddress(
        jointObligorId,
        body.guaranteePropertyAddressDetails
      );

      if (!propertyAddressResult.ok) {
        return NextResponse.json(
          {
            error: propertyAddressResult.error.message,
            details: propertyAddressResult.error.context
          },
          { status: propertyAddressResult.error.statusCode || 400 }
        );
      }
    }

    // Save personal references if provided
    if (body.personalReferences && body.personalReferences.length > 0) {
      const refResult = await jointObligorService.savePersonalReferences(
        jointObligorId,
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
      const refResult = await jointObligorService.saveCommercialReferences(
        jointObligorId,
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
      policyId: jointObligor.policy.id,
      action: 'admin_edited_joint_obligor',
      performedById: userId,
      description: `Admin ${session.user.email} edited joint obligor information for policy ${jointObligor.policy.policyNumber}`,
      details: {
        jointObligorId,
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
      jointObligor: {
        id: jointObligorId,
        informationComplete: !isPartialSave
      }
    });

  } catch (error) {
    console.error('Admin joint obligor submission error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}