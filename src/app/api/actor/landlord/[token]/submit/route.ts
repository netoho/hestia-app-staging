/**
 * Landlord submission API route
 * Refactored to use LandlordService for better maintainability
 */

import { NextRequest, NextResponse } from 'next/server';
import { LandlordService } from '@/lib/services/actors/LandlordService';
import { toServiceResponse } from '@/lib/services/types/result';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Initialize service
    const landlordService = new LandlordService();

    // Extract partial flag
    const isPartialSave = body.partial === true;

    // Process submission through service
    const result = await landlordService.validateAndSave(
      token,
      body,
      isPartialSave
    );

    console.log('Landlord submission result:', result);

    // Convert result to API response
    if (!result.ok) {
      const response = toServiceResponse(result);
      return NextResponse.json(
        {
          error: response.error?.message || 'Error processing request',
          details: response.error?.details,
        },
        { status: result.error.statusCode || 400 }
      );
    }

    // Success response
    return NextResponse.json(result.value);

  } catch (error) {
    console.error('Landlord submission route error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
