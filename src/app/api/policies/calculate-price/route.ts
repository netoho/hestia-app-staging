import { NextRequest, NextResponse } from 'next/server';
import { calculatePolicyPricing } from '@/lib/services/pricingService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.packageId || !data.rentAmount) {
      return NextResponse.json(
        { error: 'Package ID and rent amount are required' },
        { status: 400 }
      );
    }

    // Calculate pricing with optional investigation fee
    const pricing = await calculatePolicyPricing({
      packageId: data.packageId,
      rentAmount: data.rentAmount,
      tenantPercentage: data.tenantPercentage,
      landlordPercentage: data.landlordPercentage,
      includeInvestigationFee: data.includeInvestigationFee || false
    });

    return NextResponse.json(pricing);

  } catch (error) {
    console.error('Calculate price error:', error);

    // Handle specific validation errors
    if (error instanceof Error && error.message.includes('percentages must sum to 100%')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}