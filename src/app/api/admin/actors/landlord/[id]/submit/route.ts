/**
 * Admin endpoint for editing landlord information
 * Requires authentication and proper permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { LandlordService } from '@/lib/services/actors/LandlordService';
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

    const { id: landlordId } = await params;
    const body = await request.json();

    // 2. Get landlord and check permissions
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
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

    if (!landlord) {
      return NextResponse.json(
        { error: 'Landlord not found' },
        { status: 404 }
      );
    }

    // Check if user can edit (ADMIN, STAFF, or policy owner)
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canEdit = ['ADMIN', 'STAFF'].includes(userRole) ||
                    landlord.policy.createdById === userId;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit this landlord' },
        { status: 403 }
      );
    }

    // 3. Use LandlordService to save data (same as token endpoint but without token validation)
    const landlordService = new LandlordService();
    const isPartialSave = body.partial === true;

    // Directly save without token validation (admin already authenticated)
    try {
      // Save landlord information
      const saveResult = await landlordService.saveLandlordInformation(
        landlordId,
        body.landlord,
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

      // Save property details if provided (same as token endpoint)
      if (body.propertyDetails) {
        const propertyResult = await landlordService.savePropertyDetails(
          landlord.policy.id,
          body.propertyDetails
        );

        if (!propertyResult.ok) {
          return NextResponse.json(
            {
              error: propertyResult.error.message,
              details: propertyResult.error.context
            },
            { status: propertyResult.error.statusCode || 400 }
          );
        }
      }

      // Save financial details if provided (same as token endpoint)
      if (body.propertyDetails) {
        const financialData = {
          hasIVA: (body.propertyDetails as any).hasIVA,
          issuesTaxReceipts: (body.propertyDetails as any).issuesTaxReceipts,
          securityDeposit: (body.propertyDetails as any).securityDeposit,
          maintenanceFee: (body.propertyDetails as any).maintenanceFee,
          maintenanceIncludedInRent: (body.propertyDetails as any).maintenanceIncludedInRent,
          rentIncreasePercentage: (body.propertyDetails as any).rentIncreasePercentage,
          paymentMethod: (body.propertyDetails as any).paymentMethod,
        };

        const hasFinancialData = Object.values(financialData).some(v => v !== undefined);
        if (hasFinancialData) {
          const financialResult = await landlordService.saveFinancialDetails(
            landlord.policy.id,
            financialData
          );

          if (!financialResult.ok) {
            return NextResponse.json(
              {
                error: financialResult.error.message,
                details: financialResult.error.context
              },
              { status: financialResult.error.statusCode || 400 }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error saving landlord data:', error);
      return NextResponse.json(
        {
          error: 'Error saving landlord information',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    // 4. Log admin action
    await logPolicyActivity({
      policyId: landlord.policy.id,
      action: 'admin_edited_landlord',
      performedById: userId,
      description: `Admin ${session.user.email} edited landlord information for policy ${landlord.policy.policyNumber}`,
      details: {
        landlordId,
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
      landlord: {
        id: landlordId,
        informationComplete: !isPartialSave
      }
    });

  } catch (error) {
    console.error('Admin landlord submission error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}