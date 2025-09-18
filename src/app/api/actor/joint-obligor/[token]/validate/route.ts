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
        fullName: jointObligor.fullName,
        email: jointObligor.email,
        phone: jointObligor.phone,
        nationality: jointObligor.nationality,
        curp: jointObligor.curp,
        passport: jointObligor.passport,
        address: jointObligor.address,
        employmentStatus: jointObligor.employmentStatus,
        occupation: jointObligor.occupation,
        companyName: jointObligor.companyName,
        position: jointObligor.position,
        monthlyIncome: jointObligor.monthlyIncome,
        incomeSource: jointObligor.incomeSource,
        informationComplete: jointObligor.informationComplete,
        references: jointObligor.references,
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
