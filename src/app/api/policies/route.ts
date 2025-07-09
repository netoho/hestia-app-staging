import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const policies = await prisma.policy.findMany({
      include: {
        applicant: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map to the format expected by the frontend
    const formattedPolicies = policies.map(p => ({
        id: p.id,
        applicant: {
            name: p.applicant.name,
            email: p.applicant.email
        },
        property: {
            address: p.propertyAddress
        },
        status: p.status.toLowerCase(), // p.status is now a string
        createdAt: p.createdAt.toISOString().split('T')[0], // format as YYYY-MM-DD
        premium: p.premium
    }))

    return NextResponse.json(formattedPolicies);
  } catch (error) {
    console.error("Failed to fetch policies:", error);
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}
