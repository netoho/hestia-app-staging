import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/services/googleMapsService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const input = searchParams.get('input');
    const sessionToken = searchParams.get('sessionToken') || undefined;
    const country = searchParams.get('country') || 'mx';

    if (!input) {
      return NextResponse.json(
        { error: 'Input parameter is required' },
        { status: 400 }
      );
    }

    const results = await searchPlaces(input, sessionToken, country);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Address autocomplete error:', error);
    return NextResponse.json(
      { error: 'Failed to search addresses' },
      { status: 500 }
    );
  }
}