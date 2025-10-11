import { NextRequest, NextResponse } from 'next/server';
import { validateTenantToken } from '@/lib/services/actorTokenService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const validation = await validateTenantToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { tenant, completed } = validation;

    return NextResponse.json({
      completed,
      tenant: {
        id: tenant.id,
        tenantType: tenant.tenantType,
        // Individual fields
        fullName: tenant.fullName,
        nationality: tenant.nationality,
        curp: tenant.curp,
        rfc: tenant.rfc,
        passport: tenant.passport,
        // Company fields
        companyName: tenant.companyName,
        companyRfc: tenant.companyRfc,
        legalRepName: tenant.legalRepName,
        legalRepId: tenant.legalRepId,
        legalRepPosition: tenant.legalRepPosition,
        legalRepRfc: tenant.legalRepRfc,
        legalRepPhone: tenant.legalRepPhone,
        legalRepEmail: tenant.legalRepEmail,
        // Contact
        email: tenant.email,
        phone: tenant.phone,
        workPhone: tenant.workPhone,
        personalEmail: tenant.personalEmail,
        workEmail: tenant.workEmail,
        // Address
        currentAddress: tenant.currentAddress,
        addressDetails: tenant.addressDetails,
        // Employment
        employmentStatus: tenant.employmentStatus,
        occupation: tenant.occupation,
        employerName: tenant.employerName,
        employerAddress: tenant.employerAddress,
        employerAddressDetails: tenant.employerAddressDetails,
        position: tenant.position,
        monthlyIncome: tenant.monthlyIncome,
        incomeSource: tenant.incomeSource,
        // Rental history
        previousLandlordName: tenant.previousLandlordName,
        previousLandlordPhone: tenant.previousLandlordPhone,
        previousLandlordEmail: tenant.previousLandlordEmail,
        previousRentAmount: tenant.previousRentAmount,
        previousRentalAddress: tenant.previousRentalAddress,
        previousRentalAddressDetails: tenant.previousRentalAddressDetails,
        rentalHistoryYears: tenant.rentalHistoryYears,
        // Payment
        paymentMethod: tenant.paymentMethod,
        requiresCFDI: tenant.requiresCFDI,
        cfdiData: tenant.cfdiData,
        // Status
        informationComplete: tenant.informationComplete,
        verificationStatus: tenant.verificationStatus,
        references: tenant.references?.map((ref: any) => ({
          id: ref.id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email,
          relationship: ref.relationship,
          occupation: ref.occupation,
        })),
        documents: tenant.documents?.map((doc: any) => ({
          id: doc.id,
          category: doc.category,
          documentType: doc.documentType,
          fileName: doc.fileName,
          createdAt: doc.createdAt,
        })),
        additionalInfo: tenant.additionalInfo,
      },
      policy: {
        id: tenant.policy.id,
        policyNumber: tenant.policy.policyNumber,
        propertyAddress: tenant.policy.propertyAddress,
        propertyType: tenant.policy.propertyType,
        rentAmount: tenant.policy.rentAmount,
        contractLength: tenant.policy.contractLength,
        status: tenant.policy.status,
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Error al validar el token' },
      { status: 500 }
    );
  }
}
