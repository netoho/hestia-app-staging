import { NextRequest, NextResponse } from 'next/server';
import { validateAvalToken } from '@/lib/services/actorTokenService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const validation = await validateAvalToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const { aval } = validation;

    return NextResponse.json({
      aval: {
        id: aval.id,
        fullName: aval.fullName,
        email: aval.email,
        phone: aval.phone,
        nationality: aval.nationality,
        curp: aval.curp,
        passport: aval.passport,
        address: aval.address,
        employmentStatus: aval.employmentStatus,
        occupation: aval.occupation,
        companyName: aval.companyName,
        position: aval.position,
        monthlyIncome: aval.monthlyIncome,
        incomeSource: aval.incomeSource,
        propertyAddress: aval.propertyAddress,
        propertyValue: aval.propertyValue,
        propertyDeedNumber: aval.propertyDeedNumber,
        propertyRegistry: aval.propertyRegistry,
        informationComplete: aval.informationComplete,
        references: aval.references,
      },
      policy: {
        id: aval.policy.id,
        policyNumber: aval.policy.policyNumber,
        propertyAddress: aval.policy.propertyAddress,
        status: aval.policy.status,
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