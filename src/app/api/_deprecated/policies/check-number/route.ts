import { NextRequest, NextResponse } from 'next/server';
import { validatePolicyNumber } from "@/lib/services/policyService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const policyNumber = searchParams.get('number');

    if (!policyNumber) {
      return NextResponse.json(
        { error: 'El número de póliza es requerido' },
        { status: 400 }
      );
    }

    // Check if policy number exists
    const existingPolicy = validatePolicyNumber(policyNumber);

    return NextResponse.json({
      isUnique: !existingPolicy,
      exists: !!existingPolicy,
    });
  } catch (error) {
    console.error('Error checking policy number:', error);
    return NextResponse.json(
      { error: 'Error al verificar el número de póliza' },
      { status: 500 }
    );
  }
}
