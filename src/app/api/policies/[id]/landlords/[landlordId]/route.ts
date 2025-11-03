import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { LandlordService } from '@/lib/services/actors/LandlordService';
import { logPolicyActivity } from '@/lib/services/policyService';

/**
 * PUT /api/policies/[id]/landlords/[landlordId]
 * Update a specific landlord
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; landlordId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, landlordId } = await params;
    const body = await req.json();

    // Fetch landlord with policy
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      include: { policy: true },
    });

    if (!landlord || landlord.policyId !== id) {
      return NextResponse.json(
        { success: false, error: 'Landlord not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Brokers can only edit their own policies
    if (user.role === 'BROKER' && landlord.policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // If changing isPrimary to true, unmark other primary landlords
    if (body.isPrimary && !landlord.isPrimary) {
      await prisma.landlord.updateMany({
        where: { policyId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Update landlord
    const updatedLandlord = await prisma.landlord.update({
      where: { id: landlordId },
      data: {
        isCompany: body.isCompany,
        isPrimary: body.isPrimary,

        // Personal information for individuals
        firstName: body.firstName || null,
        middleName: body.middleName || null,
        paternalLastName: body.paternalLastName || null,
        maternalLastName: body.maternalLastName || null,
        rfc: body.rfc,
        curp: body.curp,

        // Company information
        companyName: body.companyName,
        companyRfc: body.companyRfc,

        // Legal representative information for companies
        legalRepFirstName: body.legalRepFirstName || null,
        legalRepMiddleName: body.legalRepMiddleName || null,
        legalRepPaternalLastName: body.legalRepPaternalLastName || null,
        legalRepMaternalLastName: body.legalRepMaternalLastName || null,
        legalRepPosition: body.legalRepPosition,
        legalRepRfc: body.legalRepRfc,
        legalRepPhone: body.legalRepPhone,
        legalRepEmail: body.legalRepEmail,
        email: body.email,
        phone: body.phone,
        workPhone: body.workPhone,
        personalEmail: body.personalEmail,
        workEmail: body.workEmail,
        address: body.address,
        occupation: body.occupation,
        employerName: body.employerName,
        monthlyIncome: body.monthlyIncome,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        clabe: body.clabe,
        accountHolder: body.accountHolder,
        propertyDeedNumber: body.propertyDeedNumber,
        propertyRegistryFolio: body.propertyRegistryFolio,
        requiresCFDI: body.requiresCFDI,
        cfdiData: body.cfdiData,
        informationComplete: body.informationComplete,
        completedAt: body.informationComplete ? new Date() : null,
      },
      include: {
        addressDetails: true,
        documents: true,
      },
    });

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: 'landlord_updated',
      description: 'Landlord information updated',
      performedById: user.id,
      details: {
        landlordId,
        isCompany: updatedLandlord.isCompany,
        isPrimary: updatedLandlord.isPrimary,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: updatedLandlord,
    });
  } catch (error) {
    console.error('Error updating landlord:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update landlord' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/policies/[id]/landlords/[landlordId]
 * Delete a landlord (only if not primary)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; landlordId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, landlordId } = await params;

    // Only ADMIN can delete landlord information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Use LandlordService to remove landlord (includes isPrimary check)
    const landlordService = new LandlordService();
    const result = await landlordService.removeLandlord(landlordId);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: result.error.statusCode || 500 }
      );
    }

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: 'landlord_deleted',
      description: 'Co-owner landlord deleted',
      performedById: user.id,
      details: { landlordId },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Landlord deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting landlord:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete landlord' },
      { status: 500 }
    );
  }
}
