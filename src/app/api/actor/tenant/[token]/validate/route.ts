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

    const { tenant } = validation;

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        fullName: tenant.fullName,
        email: tenant.email,
        phone: tenant.phone,
        nationality: tenant.nationality,
        curp: tenant.curp,
        passport: tenant.passport,
        employmentStatus: tenant.employmentStatus,
        occupation: tenant.occupation,
        employerName: tenant.employerName,
        position: tenant.position,
        monthlyIncome: tenant.monthlyIncome,
        incomeSource: tenant.incomeSource,
        informationComplete: tenant.informationComplete,
        references: tenant.references,
      },
      policy: {
        id: tenant.policy.id,
        policyNumber: tenant.policy.policyNumber,
        propertyAddress: tenant.policy.propertyAddress,
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