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

    const { aval, completed } = validation;

    return NextResponse.json({
      success: true,
      completed: completed || false,
      aval: {
        ...aval,
        // Include all address details
        addressDetails: aval.addressDetails,
        employerAddressDetails: aval.employerAddressDetails,
        guaranteePropertyDetails: aval.guaranteePropertyDetails,
        // Include all references
        references: aval.references,
        commercialReferences: aval.commercialReferences,
        // Include documents
        documents: aval.documents,
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
