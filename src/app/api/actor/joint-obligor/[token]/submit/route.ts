import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateJointObligorToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { checkPolicyActorsComplete } from '@/lib/services/actorTokenService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';

// Helper function to upsert addresses
async function upsertAddresses(jointObligorId: string, data: any) {
  const updates: any = {};

  // Upsert current address
  if (data.addressDetails) {
    const { id, createdAt, updatedAt, ...cleanAddressData } = data.addressDetails as any;
    const currentAddress = await prisma.propertyAddress.upsert({
      where: { id: data.addressDetails?.id || '' },
      create: cleanAddressData,
      update: cleanAddressData,
    });
    updates.addressId = currentAddress.id;
  }

  // Upsert employer address
  if (data.employerAddressDetails) {
    const { id, createdAt, updatedAt, ...cleanAddressData } = data.employerAddressDetails as any;
    const employerAddress = await prisma.propertyAddress.upsert({
      where: { id: data.employerAddressDetails?.id || '' },
      create: cleanAddressData,
      update: cleanAddressData,
    });
    updates.employerAddressId = employerAddress.id;
  }

  // Upsert property guarantee address (for property-based guarantee)
  if (data.guaranteePropertyDetails) {
    const { id, createdAt, updatedAt, ...cleanAddressData } = data.guaranteePropertyDetails as any;
    const guaranteePropertyAddress = await prisma.propertyAddress.upsert({
      where: { id: data.guaranteePropertyDetails?.id || '' },
      create: cleanAddressData,
      update: cleanAddressData,
    });
    updates.guaranteePropertyAddressId = guaranteePropertyAddress.id;
  }

  return updates;
}

// Helper function to save references
async function saveReferences(jointObligorId: string, data: any) {
  // Delete existing personal references
  await prisma.personalReference.deleteMany({
    where: { jointObligorId }
  });

  // Delete existing commercial references
  await prisma.commercialReference.deleteMany({
    where: { jointObligorId }
  });

  // Create new personal references (for individuals)
  if (data.references && data.references.length > 0) {
    await prisma.personalReference.createMany({
      data: data.references.map((ref: any) => ({
        jointObligorId,
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
        jointObligorId,
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

    // Validate token (allow partial saves even if completed)
    const jointObligor = await prisma.jointObligor.findFirst({
      where: { accessToken: token }
    });

    if (!jointObligor) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    if (jointObligor.tokenExpiry && jointObligor.tokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { status: 400 }
      );
    }

    // Upsert addresses
    const addressUpdates = await upsertAddresses(jointObligor.id, data);

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
      relationshipToTenant: data.relationshipToTenant || null, // REQUIRED for Joint Obligor
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
      // Address (legacy field)
      address: data.address || null,
      // Employment (for individuals)
      employmentStatus: data.employmentStatus || null,
      occupation: data.occupation || null,
      employerName: data.employerName || null,
      employerAddress: data.employerAddress || null,
      position: data.position || null,
      monthlyIncome: data.monthlyIncome || null,
      incomeSource: data.incomeSource || null,
      // Guarantee Method (UNIQUE to Joint Obligor)
      guaranteeMethod: data.guaranteeMethod || null, // 'income' or 'property'
      hasPropertyGuarantee: data.hasPropertyGuarantee ?? false,
      // Property Guarantee Information
      propertyAddress: data.propertyAddress || null,
      propertyValue: data.propertyValue || null,
      propertyDeedNumber: data.propertyDeedNumber || null,
      propertyRegistry: data.propertyRegistry || null,
      propertyTaxAccount: data.propertyTaxAccount || null,
      propertyUnderLegalProceeding: data.propertyUnderLegalProceeding || false,
      // Financial Information (income guarantee)
      bankName: data.bankName || null,
      accountHolder: data.accountHolder || null,
      hasProperties: data.hasProperties ?? false,
      // Marriage Information (for property guarantee)
      maritalStatus: data.maritalStatus || null,
      spouseName: data.spouseName || null,
      spouseRfc: data.spouseRfc || null,
      spouseCurp: data.spouseCurp || null,
      // Additional info
      additionalInfo: data.additionalInfo || null,
      // Address IDs
      ...addressUpdates,
    };

    // Update joint obligor
    const updatedJointObligor = await prisma.jointObligor.update({
      where: { id: jointObligor.id },
      data: updateData
    });

    // Save references if provided
    if (data.references || data.commercialReferences) {
      await saveReferences(jointObligor.id, data);
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: updatedJointObligor
    });

  } catch (error) {
    console.error('Joint obligor partial save error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Error al guardar la información',
        details: error instanceof Error ? { message: error.message } : error
      },
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
    const validation = await validateJointObligorToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { jointObligor } = validation;

    // Upsert addresses
    const addressUpdates = await upsertAddresses(jointObligor.id, data);

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
      relationshipToTenant: data.relationshipToTenant || null, // REQUIRED for Joint Obligor
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
      // Address (legacy field)
      address: data.address || null,
      // Employment (for individuals)
      employmentStatus: data.employmentStatus || null,
      occupation: data.occupation || null,
      employerName: data.employerName || null,
      employerAddress: data.employerAddress || null,
      position: data.position || null,
      monthlyIncome: data.monthlyIncome || null,
      incomeSource: data.incomeSource || null,
      // Guarantee Method (UNIQUE to Joint Obligor)
      guaranteeMethod: data.guaranteeMethod || null, // 'income' or 'property'
      hasPropertyGuarantee: data.hasPropertyGuarantee ?? false,
      // Property Guarantee Information
      propertyAddress: data.propertyAddress || null,
      propertyValue: data.propertyValue || null,
      propertyDeedNumber: data.propertyDeedNumber || null,
      propertyRegistry: data.propertyRegistry || null,
      propertyTaxAccount: data.propertyTaxAccount || null,
      propertyUnderLegalProceeding: data.propertyUnderLegalProceeding || false,
      // Financial Information (income guarantee)
      bankName: data.bankName || null,
      accountHolder: data.accountHolder || null,
      hasProperties: data.hasProperties ?? false,
      // Marriage Information (for property guarantee)
      maritalStatus: data.maritalStatus || null,
      spouseName: data.spouseName || null,
      spouseRfc: data.spouseRfc || null,
      spouseCurp: data.spouseCurp || null,
      // Additional info
      additionalInfo: data.additionalInfo || null,
      // Mark as complete
      informationComplete: true,
      completedAt: new Date(),
      // Address IDs
      ...addressUpdates,
    };

    // Update joint obligor
    const updatedJointObligor = await prisma.jointObligor.update({
      where: { id: jointObligor.id },
      data: updateData
    });

    // Save references
    await saveReferences(jointObligor.id, data);

    // Log activity
    await logPolicyActivity({
      policyId: jointObligor.policyId,
      action: 'joint_obligor_info_completed',
      description: 'Joint obligor information completed',
      details: {
        jointObligorId: jointObligor.id,
        jointObligorName: data.fullName || data.companyName,
        guaranteeMethod: data.guaranteeMethod,
        completedAt: new Date()
      },
      performedByType: 'joint_obligor',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Check if all actors are complete and transition status if needed
    const actorsStatus = await checkPolicyActorsComplete(jointObligor.policyId);
    if (actorsStatus.allComplete) {
      await transitionPolicyStatus(
        jointObligor.policyId,
        'UNDER_INVESTIGATION',
        'system',
        'All actor information completed'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: {
        jointObligor: updatedJointObligor,
        actorsComplete: actorsStatus.allComplete
      }
    });

  } catch (error) {
    console.error('Joint obligor submit error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Error al guardar la información',
        details: error instanceof Error ? { message: error.message } : error
      },
      { status: 500 }
    );
  }
}
