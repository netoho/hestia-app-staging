import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAvalToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { checkPolicyActorsComplete } from '@/lib/services/actorTokenService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';

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

    // Update aval information
    const updatedAval = await prisma.aval.update({
      where: { id: aval.id },
      data: {
        fullName: data.fullName,
        nationality: data.nationality,
        curp: data.curp || null,
        passport: data.passport || null,
        address: data.address || null,
        employmentStatus: data.employmentStatus,
        occupation: data.occupation,
        companyName: data.companyName,
        position: data.position,
        monthlyIncome: data.monthlyIncome,
        incomeSource: data.incomeSource,
        // Property information
        propertyAddress: data.propertyAddress,
        propertyValue: data.propertyValue,
        propertyDeedNumber: data.propertyDeedNumber || null,
        propertyRegistry: data.propertyRegistry || null,
        informationComplete: true,
        completedAt: new Date(),
        additionalInfo: data.additionalInfo,
      }
    });

    // Save references
    if (data.references && data.references.length > 0) {
      // Delete existing references
      await prisma.personalReference.deleteMany({
        where: { avalId: aval.id }
      });

      // Create new references
      await prisma.personalReference.createMany({
        data: data.references.map((ref: any) => ({
          avalId: aval.id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email || null,
          relationship: ref.relationship,
          occupation: ref.occupation || null,
        }))
      });
    }


    console.log('ip', request.headers.get('x-forwarded-for') || 'unknown')

    // Log activity
    await logPolicyActivity({
      policyId: aval.policyId,
      action: 'aval_info_completed',
      description: 'Aval information completed',
      details: {
        avalId: aval.id,
        avalName: data.fullName,
        propertyValue: data.propertyValue,
        completedAt: new Date()
      },
      performedByActor: 'aval',
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
      { error: 'Error al guardar la información' },
      { status: 500 }
    );
  }
}
