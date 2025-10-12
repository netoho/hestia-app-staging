import { NextRequest, NextResponse } from 'next/server';
import { validateJointObligorToken } from '@/lib/services/actorTokenService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const validation = await validateJointObligorToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { jointObligor } = validation;

    return NextResponse.json({
      jointObligor: {
        id: jointObligor.id,
        // Type
        isCompany: jointObligor.isCompany,
        // Personal Information
        fullName: jointObligor.fullName,
        nationality: jointObligor.nationality,
        curp: jointObligor.curp,
        rfc: jointObligor.rfc,
        passport: jointObligor.passport,
        relationshipToTenant: jointObligor.relationshipToTenant,
        // Company Information
        companyName: jointObligor.companyName,
        companyRfc: jointObligor.companyRfc,
        legalRepName: jointObligor.legalRepName,
        legalRepPosition: jointObligor.legalRepPosition,
        legalRepRfc: jointObligor.legalRepRfc,
        legalRepPhone: jointObligor.legalRepPhone,
        legalRepEmail: jointObligor.legalRepEmail,
        // Contact Information
        email: jointObligor.email,
        phone: jointObligor.phone,
        workPhone: jointObligor.workPhone,
        personalEmail: jointObligor.personalEmail,
        workEmail: jointObligor.workEmail,
        // Address Information
        address: jointObligor.address,
        addressDetails: jointObligor.addressDetails,
        // Employment Information
        employmentStatus: jointObligor.employmentStatus,
        occupation: jointObligor.occupation,
        employerName: jointObligor.employerName,
        employerAddress: jointObligor.employerAddress,
        employerAddressDetails: jointObligor.employerAddressDetails,
        position: jointObligor.position,
        monthlyIncome: jointObligor.monthlyIncome,
        incomeSource: jointObligor.incomeSource,
        // Guarantee Information
        guaranteeMethod: jointObligor.guaranteeMethod,
        hasPropertyGuarantee: jointObligor.hasPropertyGuarantee,
        // Property Guarantee
        propertyAddress: jointObligor.propertyAddress,
        guaranteePropertyDetails: jointObligor.guaranteePropertyDetails,
        propertyValue: jointObligor.propertyValue,
        propertyDeedNumber: jointObligor.propertyDeedNumber,
        propertyRegistry: jointObligor.propertyRegistry,
        propertyTaxAccount: jointObligor.propertyTaxAccount,
        propertyUnderLegalProceeding: jointObligor.propertyUnderLegalProceeding,
        // Financial Information (income guarantee)
        bankName: jointObligor.bankName,
        accountHolder: jointObligor.accountHolder,
        hasProperties: jointObligor.hasProperties,
        // Marriage Information
        maritalStatus: jointObligor.maritalStatus,
        spouseName: jointObligor.spouseName,
        spouseRfc: jointObligor.spouseRfc,
        spouseCurp: jointObligor.spouseCurp,
        // References
        references: jointObligor.references,
        commercialReferences: jointObligor.commercialReferences,
        // Documents
        documents: jointObligor.documents,
        // Status
        informationComplete: jointObligor.informationComplete,
        additionalInfo: jointObligor.additionalInfo,
      },
      policy: {
        id: jointObligor.policy.id,
        policyNumber: jointObligor.policy.policyNumber,
        propertyAddress: jointObligor.policy.propertyAddress,
        status: jointObligor.policy.status,
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
