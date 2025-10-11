import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTenantToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { checkPolicyActorsComplete } from '@/lib/services/actorTokenService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';

// PUT - For partial saves (auto-save per tab)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const data = await request.json();

    // Validate token (allow partial saves even if completed)
    const tenant = await prisma.tenant.findFirst({
      where: { accessToken: token }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    if (tenant.tokenExpiry && tenant.tokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Type fields
    if (data.tenantType !== undefined) updateData.tenantType = data.tenantType;

    // Individual fields
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.nationality !== undefined) updateData.nationality = data.nationality;
    if (data.curp !== undefined) updateData.curp = data.curp || null;
    if (data.rfc !== undefined) updateData.rfc = data.rfc || null;
    if (data.passport !== undefined) updateData.passport = data.passport || null;

    // Company fields
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.companyRfc !== undefined) updateData.companyRfc = data.companyRfc;
    if (data.legalRepName !== undefined) updateData.legalRepName = data.legalRepName;
    if (data.legalRepId !== undefined) updateData.legalRepId = data.legalRepId;
    if (data.legalRepPosition !== undefined) updateData.legalRepPosition = data.legalRepPosition;
    if (data.legalRepRfc !== undefined) updateData.legalRepRfc = data.legalRepRfc;
    if (data.legalRepPhone !== undefined) updateData.legalRepPhone = data.legalRepPhone;
    if (data.legalRepEmail !== undefined) updateData.legalRepEmail = data.legalRepEmail;

    // Contact
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.workPhone !== undefined) updateData.workPhone = data.workPhone;
    if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail;
    if (data.workEmail !== undefined) updateData.workEmail = data.workEmail;

    // Address
    if (data.currentAddress !== undefined) updateData.currentAddress = data.currentAddress;

    // Employment
    if (data.employmentStatus !== undefined) updateData.employmentStatus = data.employmentStatus;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.employerName !== undefined) updateData.employerName = data.employerName;
    if (data.employerAddress !== undefined) updateData.employerAddress = data.employerAddress;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.monthlyIncome !== undefined) updateData.monthlyIncome = data.monthlyIncome;
    if (data.incomeSource !== undefined) updateData.incomeSource = data.incomeSource;

    // Rental history
    if (data.previousLandlordName !== undefined) updateData.previousLandlordName = data.previousLandlordName;
    if (data.previousLandlordPhone !== undefined) updateData.previousLandlordPhone = data.previousLandlordPhone;
    if (data.previousLandlordEmail !== undefined) updateData.previousLandlordEmail = data.previousLandlordEmail;
    if (data.previousRentAmount !== undefined) updateData.previousRentAmount = data.previousRentAmount;
    if (data.previousRentalAddress !== undefined) updateData.previousRentalAddress = data.previousRentalAddress;
    if (data.rentalHistoryYears !== undefined) updateData.rentalHistoryYears = data.rentalHistoryYears;

    // Payment
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.requiresCFDI !== undefined) updateData.requiresCFDI = data.requiresCFDI;
    if (data.cfdiData !== undefined) updateData.cfdiData = data.cfdiData;

    // Additional info
    if (data.additionalInfo !== undefined) updateData.additionalInfo = data.additionalInfo;

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: updateData
    });

    // Handle address details if provided
    if (data.addressDetails) {
      // Remove id and timestamp fields to prevent conflicts
      const { id, createdAt, updatedAt, ...cleanAddressData } = data.addressDetails as any;

      const address = await prisma.propertyAddress.upsert({
        where: { id: tenant.addressId || '' },
        create: cleanAddressData,
        update: cleanAddressData,
      });

      // Link the address to tenant if not already linked
      if (tenant.addressId !== address.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { addressId: address.id }
        });
      }
    }

    // Handle employer address details if provided
    if (data.employerAddressDetails) {
      const { id, createdAt, updatedAt, ...cleanEmployerAddressData } = data.employerAddressDetails as any;

      const employerAddress = await prisma.propertyAddress.upsert({
        where: { id: tenant.employerAddressId || '' },
        create: cleanEmployerAddressData,
        update: cleanEmployerAddressData,
      });

      // Link the employer address to tenant if not already linked
      if (tenant.employerAddressId !== employerAddress.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { employerAddressId: employerAddress.id }
        });
      }
    }

    // Handle previous rental address details if provided
    if (data.previousRentalAddressDetails) {
      const { id, createdAt, updatedAt, ...cleanPreviousRentalAddressData } = data.previousRentalAddressDetails as any;

      const previousRentalAddress = await prisma.propertyAddress.upsert({
        where: { id: tenant.previousRentalAddressId || '' },
        create: cleanPreviousRentalAddressData,
        update: cleanPreviousRentalAddressData,
      });

      // Link the previous rental address to tenant if not already linked
      if (tenant.previousRentalAddressId !== previousRentalAddress.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { previousRentalAddressId: previousRentalAddress.id }
        });
      }
    }

    // Save references if provided
    if (data.references && data.references.length > 0) {
      await prisma.personalReference.deleteMany({
        where: { tenantId: tenant.id }
      });

      await prisma.personalReference.createMany({
        data: data.references.map((ref: any) => ({
          tenantId: tenant.id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email || null,
          relationship: ref.relationship,
          occupation: ref.occupation || null,
        }))
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: { tenant: updatedTenant }
    });

  } catch (error) {
    console.error('Tenant partial save error:', error);
    return NextResponse.json(
      { error: 'Error al guardar la información' },
      { status: 500 }
    );
  }
}

// POST - For final submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const data = await request.json();

    // Validate token
    const validation = await validateTenantToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { tenant } = validation;

    // Update tenant information
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        fullName: data.fullName,
        nationality: data.nationality,
        curp: data.curp || null,
        passport: data.passport || null,
        tenantType: data.tenantType || 'INDIVIDUAL',
        employmentStatus: data.employmentStatus,
        occupation: data.occupation,
        employerName: data.companyName,
        position: data.position,
        monthlyIncome: data.monthlyIncome,
        incomeSource: data.incomeSource,
        informationComplete: true,
        completedAt: new Date(),
        additionalInfo: data.additionalInfo,
      }
    });

    // Handle address details if provided
    if (data.addressDetails) {
      const { id, createdAt, updatedAt, ...cleanAddressData } = data.addressDetails as any;

      const address = await prisma.propertyAddress.upsert({
        where: { id: tenant.addressId || '' },
        create: cleanAddressData,
        update: cleanAddressData,
      });

      if (tenant.addressId !== address.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { addressId: address.id }
        });
      }
    }

    // Handle employer address details if provided
    if (data.employerAddressDetails) {
      const { id, createdAt, updatedAt, ...cleanEmployerAddressData } = data.employerAddressDetails as any;

      const employerAddress = await prisma.propertyAddress.upsert({
        where: { id: tenant.employerAddressId || '' },
        create: cleanEmployerAddressData,
        update: cleanEmployerAddressData,
      });

      if (tenant.employerAddressId !== employerAddress.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { employerAddressId: employerAddress.id }
        });
      }
    }

    // Handle previous rental address details if provided
    if (data.previousRentalAddressDetails) {
      const { id, createdAt, updatedAt, ...cleanPreviousRentalAddressData } = data.previousRentalAddressDetails as any;

      const previousRentalAddress = await prisma.propertyAddress.upsert({
        where: { id: tenant.previousRentalAddressId || '' },
        create: cleanPreviousRentalAddressData,
        update: cleanPreviousRentalAddressData,
      });

      if (tenant.previousRentalAddressId !== previousRentalAddress.id) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { previousRentalAddressId: previousRentalAddress.id }
        });
      }
    }

    // Save references
    if (data.references && data.references.length > 0) {
      // Delete existing references
      await prisma.personalReference.deleteMany({
        where: { tenantId: tenant.id }
      });

      // Create new references
      await prisma.personalReference.createMany({
        data: data.references.map((ref: any) => ({
          tenantId: tenant.id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email || null,
          relationship: ref.relationship,
          occupation: ref.occupation || null,
        }))
      });
    }

    // Log activity
    await logPolicyActivity({
      policyId: tenant.policyId,
      action: 'tenant_info_completed',
      description: 'Tenant information completed',
      details: {
        tenantId: tenant.id,
        tenantName: data.fullName,
        completedAt: new Date()
      },
      performedByActor: 'tenant',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Check if all actors are complete and transition status if needed
    const actorsStatus = await checkPolicyActorsComplete(tenant.policyId);
    if (actorsStatus.allComplete) {
      await transitionPolicyStatus(
        tenant.policyId,
        'UNDER_INVESTIGATION',
        'system',
        'All actor information completed'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: {
        tenant: updatedTenant,
        actorsComplete: actorsStatus.allComplete
      }
    });

  } catch (error) {
    console.error('Tenant submit error:', error);
    return NextResponse.json(
      { error: 'Error al guardar la información' },
      { status: 500 }
    );
  }
}
