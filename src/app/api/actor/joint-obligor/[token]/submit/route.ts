import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateJointObligorToken } from '@/lib/services/actorTokenService';
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
    const validation = await validateJointObligorToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { jointObligor } = validation;

    // Update joint obligor information
    const updatedJointObligor = await prisma.jointObligor.update({
      where: { id: jointObligor.id },
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
        informationComplete: true,
        completedAt: new Date(),
      }
    });

    // Save references
    if (data.references && data.references.length > 0) {
      // Delete existing references
      await prisma.personalReference.deleteMany({
        where: { jointObligorId: jointObligor.id }
      });

      // Create new references
      await prisma.personalReference.createMany({
        data: data.references.map((ref: any) => ({
          jointObligorId: jointObligor.id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email || null,
          relationship: ref.relationship,
          occupation: ref.occupation || null,
        }))
      });
    }

    // Log activity
    await logPolicyActivity(
      jointObligor.policyId,
      'joint_obligor_info_completed',
      'Joint obligor information completed',
      {
        jointObligorId: jointObligor.id,
        jointObligorName: data.fullName,
        completedAt: new Date()
      },
      undefined,
      'joint_obligor'
    );

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
    return NextResponse.json(
      { error: 'Error al guardar la información' },
      { status: 500 }
    );
  }
}