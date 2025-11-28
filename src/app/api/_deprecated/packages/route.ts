import { NextResponse } from 'next/server';
import { packageService } from '@/lib/services/packageService';
import { toServiceResponse } from '@/lib/services/types/result';

export async function GET() {
  const result = await packageService.getPackages();
  const response = toServiceResponse(result);
  
  if (response.success) {
    return NextResponse.json(response.data);
  }
  
  return NextResponse.json(
    { 
      error: response.error?.message || 'Failed to fetch packages',
      code: response.error?.code,
      details: response.error?.details
    }, 
    { status: response.error?.code === 'NOT_FOUND' ? 404 : 500 }
  );
}
