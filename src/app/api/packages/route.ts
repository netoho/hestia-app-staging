import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      orderBy: {
        price: 'asc',
      },
    });

    // The 'features' field is stored as a JSON string, so we need to parse it.
    const formattedPackages = packages.map(p => ({
      ...p,
      features: JSON.parse(p.features) as string[], // Parse the JSON string into an array
    }))

    return NextResponse.json(formattedPackages);
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}
