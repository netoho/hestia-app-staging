import { NextRequest, NextResponse } from 'next/server';
import { validateLandlordToken } from '@/lib/services/actorTokenService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const validation = await validateLandlordToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { landlord } = validation;

    return NextResponse.json({
      landlord: {
        id: landlord.id,
        isCompany: landlord.isCompany,
        // Individual fields
        fullName: landlord.fullName,
        rfc: landlord.rfc,
        curp: landlord.curp,
        // Company fields
        companyName: landlord.companyName,
        companyRfc: landlord.companyRfc,
        legalRepName: landlord.legalRepName,
        legalRepPosition: landlord.legalRepPosition,
        legalRepRfc: landlord.legalRepRfc,
        legalRepPhone: landlord.legalRepPhone,
        legalRepEmail: landlord.legalRepEmail,
        // Contact
        email: landlord.email,
        phone: landlord.phone,
        workPhone: landlord.workPhone,
        personalEmail: landlord.personalEmail,
        workEmail: landlord.workEmail,
        // Address
        address: landlord.address,
        addressDetails: landlord.addressDetails,
        // Bank info
        bankName: landlord.bankName,
        accountNumber: landlord.accountNumber,
        clabe: landlord.clabe,
        accountHolder: landlord.accountHolder,
        // Work info (for individuals)
        occupation: landlord.occupation,
        employerName: landlord.employerName,
        monthlyIncome: landlord.monthlyIncome,
        // Property management
        propertyDeedNumber: landlord.propertyDeedNumber,
        propertyRegistryFolio: landlord.propertyRegistryFolio,
        requiresCFDI: landlord.requiresCFDI,
        cfdiData: landlord.cfdiData,
        // Status
        informationComplete: landlord.informationComplete,
        verificationStatus: landlord.verificationStatus,
        documents: landlord.documents?.map((doc: any) => ({
          id: doc.id,
          category: doc.category,
          documentType: doc.documentType,
          fileName: doc.fileName,
          uploadedAt: doc.createdAt,
        })),
        additionalInfo: landlord.additionalInfo,
      },
      policy: {
        id: landlord.policy.id,
        policyNumber: landlord.policy.policyNumber,
        propertyAddress: landlord.policy.propertyAddress,
        propertyType: landlord.policy.propertyType,
        rentAmount: landlord.policy.rentAmount,
        contractLength: landlord.policy.contractLength,
        // Property features
        parkingSpaces: landlord.policy.parkingSpaces,
        parkingNumbers: landlord.policy.parkingNumbers,
        isFurnished: landlord.policy.isFurnished,
        hasPhone: landlord.policy.hasPhone,
        hasElectricity: landlord.policy.hasElectricity,
        hasWater: landlord.policy.hasWater,
        hasGas: landlord.policy.hasGas,
        hasCableTV: landlord.policy.hasCableTV,
        hasInternet: landlord.policy.hasInternet,
        otherServices: landlord.policy.otherServices,
        utilitiesInLandlordName: landlord.policy.utilitiesInLandlordName,
        // Financial
        hasIVA: landlord.policy.hasIVA,
        issuesTaxReceipts: landlord.policy.issuesTaxReceipts,
        securityDeposit: landlord.policy.securityDeposit,
        maintenanceFee: landlord.policy.maintenanceFee,
        maintenanceIncludedInRent: landlord.policy.maintenanceIncludedInRent,
        rentIncreasePercentage: landlord.policy.rentIncreasePercentage,
        paymentMethod: landlord.policy.paymentMethod,
        // Additional info
        hasInventory: landlord.policy.hasInventory,
        hasRules: landlord.policy.hasRules,
        petsAllowed: landlord.policy.petsAllowed,
        propertyDeliveryDate: landlord.policy.propertyDeliveryDate,
        contractSigningDate: landlord.policy.contractSigningDate,
        contractSigningLocation: landlord.policy.contractSigningLocation,
        status: landlord.policy.status,
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