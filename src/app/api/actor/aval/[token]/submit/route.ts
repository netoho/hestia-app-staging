import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAvalToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { checkPolicyActorsComplete } from '@/lib/services/actorTokenService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';

// Helper function to upsert addresses
async function upsertAddresses(avalId: string, data: any) {
  const updates: any = {};

  // Upsert current address
  if (data.addressDetails) {
    const { id, createdAt, updatedAt, ...cleanAddressData } = data.addressDetails as any;
    const currentAddress = await prisma.propertyAddress.upsert({
      where: { id: data.addressDetails.id || '' },
      create: cleanAddressData,
      update: cleanAddressData,
    });
    updates.addressId = currentAddress.id;
  }

  // Upsert employer address
  if (data.employerAddressDetails) {
    const { id, createdAt, updatedAt, ...cleanAddressData } = data.employerAddressDetails as any;
    const employerAddress = await prisma.propertyAddress.upsert({
      where: { id: data.employerAddressDetails.id || '' },
      create: cleanAddressData,
      update: cleanAddressData,
    });
    updates.employerAddressId = employerAddress.id;
  }

  // Upsert guarantee property address (MANDATORY for Aval)
  if (data.guaranteePropertyDetails) {
    const { id, createdAt, updatedAt, ...cleanAddressData } = data.guaranteePropertyDetails as any;
    const guaranteePropertyAddress = await prisma.propertyAddress.upsert({
      where: { id: data.guaranteePropertyDetails.id || '' },
      create: cleanAddressData,
      update: cleanAddressData,
    });
    updates.guaranteePropertyAddressId = guaranteePropertyAddress.id;
  }

  return updates;
}

// Helper function to save references
async function saveReferences(avalId: string, data: any) {
  // Delete existing personal references
  await prisma.personalReference.deleteMany({
    where: { avalId }
  });

  // Delete existing commercial references
  await prisma.commercialReference.deleteMany({
    where: { avalId }
  });

  // Create new personal references (for individuals)
  if (data.references && data.references.length > 0) {
    await prisma.personalReference.createMany({
      data: data.references.map((ref: any) => ({
        avalId,
        name: ref.name,
        phone: ref.phone,
        email: ref.email || null,
        relationship: ref.relationship,
        occupation: ref.occupation || null,
        address: ref.address || null,
      }))
    });
  }

  // Create new commercial references (for companies)
  if (data.commercialReferences && data.commercialReferences.length > 0) {
    await prisma.commercialReference.createMany({
      data: data.commercialReferences.map((ref: any) => ({
        avalId,
        companyName: ref.companyName,
        contactName: ref.contactName,
        phone: ref.phone,
        email: ref.email || null,
        relationship: ref.relationship,
        yearsOfRelationship: ref.yearsOfRelationship || null,
      }))
    });
  }
}

// PUT handler for partial saves (per-tab auto-save)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const data = await request.json();

    // Validate token
    const validation = await validateAvalToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { aval } = validation;

    // Upsert addresses
    const addressUpdates = await upsertAddresses(aval.id, data);

    // Prepare update data
    const updateData: any = {
      // Type
      isCompany: data.isCompany,
      // Individual Information
      fullName: data.fullName,
      nationality: data.nationality,
      curp: data.curp || null,
      rfc: data.rfc || null,
      passport: data.passport || null,
      relationshipToTenant: data.relationshipToTenant || null,
      // Company Information
      companyName: data.companyName || null,
      companyRfc: data.companyRfc || null,
      legalRepName: data.legalRepName || null,
      legalRepPosition: data.legalRepPosition || null,
      legalRepRfc: data.legalRepRfc || null,
      legalRepPhone: data.legalRepPhone || null,
      legalRepEmail: data.legalRepEmail || null,
      // Contact Information
      email: data.email,
      phone: data.phone,
      workPhone: data.workPhone || null,
      personalEmail: data.personalEmail || null,
      workEmail: data.workEmail || null,
      // Employment (for individuals)
      employmentStatus: data.employmentStatus || null,
      occupation: data.occupation || null,
      employerName: data.employerName || null,
      employerAddress: data.employerAddress || null,
      position: data.position || null,
      monthlyIncome: data.monthlyIncome || null,
      incomeSource: data.incomeSource || null,
      // Property Guarantee Information (MANDATORY for Aval)
      propertyAddress: data.propertyAddress || null,
      propertyValue: data.propertyValue || null,
      propertyDeedNumber: data.propertyDeedNumber || null,
      propertyRegistry: data.propertyRegistry || null,
      propertyTaxAccount: data.propertyTaxAccount || null,
      propertyUnderLegalProceeding: data.propertyUnderLegalProceeding || false,
      // Marriage Information
      maritalStatus: data.maritalStatus || null,
      spouseName: data.spouseName || null,
      spouseRfc: data.spouseRfc || null,
      spouseCurp: data.spouseCurp || null,
      // Guarantee Method
      guaranteeMethod: data.guaranteeMethod || null,
      hasPropertyGuarantee: data.hasPropertyGuarantee ?? true,
      // Additional info
      additionalInfo: data.additionalInfo || null,
      // Address IDs
      ...addressUpdates,
    };

    // Update aval
    const updatedAval = await prisma.aval.update({
      where: { id: aval.id },
      data: updateData
    });

    // Save references if provided
    if (data.references || data.commercialReferences) {
      await saveReferences(aval.id, data);
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: updatedAval
    });

  } catch (error) {
    console.error('Aval partial save error:', error);
    return NextResponse.json(
      { error: 'Error al guardar la información', details: error },
      { status: 500 }
    );
  }
}

// POST handler for final submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const data = await request.json();

    // Validate token
    const validation = await validateAvalToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { aval } = validation;

    // Upsert addresses
    const addressUpdates = await upsertAddresses(aval.id, data);

    // Prepare update data with completion
    const updateData: any = {
      // Type
      isCompany: data.isCompany,
      // Individual Information
      fullName: data.fullName,
      nationality: data.nationality,
      curp: data.curp || null,
      rfc: data.rfc || null,
      passport: data.passport || null,
      relationshipToTenant: data.relationshipToTenant || null,
      // Company Information
      companyName: data.companyName || null,
      companyRfc: data.companyRfc || null,
      legalRepName: data.legalRepName || null,
      legalRepPosition: data.legalRepPosition || null,
      legalRepRfc: data.legalRepRfc || null,
      legalRepPhone: data.legalRepPhone || null,
      legalRepEmail: data.legalRepEmail || null,
      // Contact Information
      email: data.email,
      phone: data.phone,
      workPhone: data.workPhone || null,
      personalEmail: data.personalEmail || null,
      workEmail: data.workEmail || null,
      // Employment (for individuals)
      employmentStatus: data.employmentStatus || null,
      occupation: data.occupation || null,
      employerName: data.employerName || null,
      employerAddress: data.employerAddress || null,
      position: data.position || null,
      monthlyIncome: data.monthlyIncome || null,
      incomeSource: data.incomeSource || null,
      // Property Guarantee Information (MANDATORY for Aval)
      propertyAddress: data.propertyAddress || null,
      propertyValue: data.propertyValue || null,
      propertyDeedNumber: data.propertyDeedNumber || null,
      propertyRegistry: data.propertyRegistry || null,
      propertyTaxAccount: data.propertyTaxAccount || null,
      propertyUnderLegalProceeding: data.propertyUnderLegalProceeding || false,
      // Marriage Information
      maritalStatus: data.maritalStatus || null,
      spouseName: data.spouseName || null,
      spouseRfc: data.spouseRfc || null,
      spouseCurp: data.spouseCurp || null,
      // Guarantee Method
      guaranteeMethod: data.guaranteeMethod || null,
      hasPropertyGuarantee: data.hasPropertyGuarantee ?? true,
      // Additional info
      additionalInfo: data.additionalInfo || null,
      // Mark as complete
      informationComplete: true,
      completedAt: new Date(),
      // Address IDs
      ...addressUpdates,
    };

    // Update aval
    const updatedAval = await prisma.aval.update({
      where: { id: aval.id },
      data: updateData
    });

    // Save references
    await saveReferences(aval.id, data);

    // Log activity
    await logPolicyActivity({
      policyId: aval.policyId,
      action: 'aval_info_completed',
      description: 'Aval information completed',
      details: {
        avalId: aval.id,
        avalName: data.fullName || data.companyName,
        propertyValue: data.propertyValue,
        completedAt: new Date()
      },
      performedByType: 'aval',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Check if all actors are complete and transition status if needed
    const actorsStatus = await checkPolicyActorsComplete(aval.policyId);
    if (actorsStatus.allComplete) {
      await transitionPolicyStatus(
        aval.policyId,
        'UNDER_INVESTIGATION',
        'system',
        'All actor information completed'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: {
        aval: updatedAval,
        actorsComplete: actorsStatus.allComplete
      }
    });

  } catch (error) {
    console.error('Aval submit error:', error);
    return NextResponse.json(
      { error: 'Error al guardar la información', details: error },
      { status: 500 }
    );
  }
}
