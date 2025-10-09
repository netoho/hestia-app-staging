import { NextRequest, NextResponse } from 'next/server';
import { getPlaceDetails, parseGooglePlaceToAddress } from '@/lib/services/googleMapsService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get('placeId');
    const sessionToken = searchParams.get('sessionToken') || undefined;
    const interiorNumber = searchParams.get('interiorNumber') || undefined;

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      );
    }

    // Get detailed place information and parse it
    const parsedAddress = await parseGooglePlaceToAddress(
      placeId,
      sessionToken,
      { interiorNumber }
    );

    if (!parsedAddress) {
      return NextResponse.json(
        { error: 'Failed to get place details' },
        { status: 404 }
      );
    }

    return NextResponse.json({ address: parsedAddress });
  } catch (error) {
    console.error('Address details error:', error);
    return NextResponse.json(
      { error: 'Failed to get address details' },
      { status: 500 }
    );
  }
}