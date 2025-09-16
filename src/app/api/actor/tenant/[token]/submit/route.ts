import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTenantToken } from '@/lib/services/actorTokenService';
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
    await logPolicyActivity(
      tenant.policyId,
      'tenant_info_completed',
      'Tenant information completed',
      {
        tenantId: tenant.id,
        tenantName: data.fullName,
        completedAt: new Date()
      },
      undefined,
      'tenant'
    );

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
