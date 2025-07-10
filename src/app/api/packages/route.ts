import { NextResponse } from 'next/server';
import { getPackages } from '@/lib/services/packageService';

export async function GET() {
  try {
    const packages = await getPackages();
    return NextResponse.json(packages);
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}
