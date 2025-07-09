import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      orderBy: {
        price: 'asc',
      },
    });

    // The 'features' field is stored as JSON, Prisma automatically handles parsing
    const formattedPackages = packages.map(p => ({
      ...p,
      features: p.features as string[], // Ensure TypeScript knows it's a string array
    }))

    return NextResponse.json(formattedPackages);
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}
