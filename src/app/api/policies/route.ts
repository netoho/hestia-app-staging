import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, requireRole } from '@/lib/auth';
import { z } from 'zod';

const createPolicySchema = z.object({
  tenantId: z.string(),
  landlordId: z.string().optional(),
  propertyAddress: z.string(),
  propertyType: z.string(),
  premium: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  payer: z.string(),
  propertyData: z.object({
    sqft: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    amenities: z.array(z.string()).optional()
  }).optional(),
  coverageData: z.object({
    liability: z.number().optional(),
    personalProperty: z.number().optional(),
    additionalLiving: z.number().optional()
  }).optional()
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;
    
    // Build where clause based on user role
    let where: any = {};
    
    if (auth.role === 'broker') {
      where.brokerId = auth.userId;
    } else if (auth.role === 'tenant') {
      where.tenantId = auth.userId;
    } else if (auth.role === 'landlord') {
      where.landlordId = auth.userId;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Get policies with pagination
    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        include: {
          broker: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true, email: true } },
          landlord: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.policy.count({ where })
    ]);
    
    // Format policies
    const formattedPolicies = policies.map(p => ({
      id: p.id,
      broker: p.broker,
      tenant: p.tenant,
      landlord: p.landlord,
      property: {
        address: p.propertyAddress,
        type: p.propertyType,
        data: JSON.parse(p.propertyData || '{}')
      },
      coverage: JSON.parse(p.coverageData || '{}'),
      status: p.status,
      premium: p.premium,
      startDate: p.startDate,
      endDate: p.endDate,
      payer: p.payer,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    return NextResponse.json({
      policies: formattedPolicies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error("Failed to fetch policies:", error);
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only brokers and staff can create policies
    if (!requireRole(auth.role, ['broker', 'staff'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const validation = createPolicySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const {
      tenantId,
      landlordId,
      propertyAddress,
      propertyType,
      premium,
      startDate,
      endDate,
      payer,
      propertyData,
      coverageData
    } = validation.data;
    
    // Create policy
    const policy = await prisma.policy.create({
      data: {
        brokerId: auth.userId,
        tenantId,
        landlordId,
        propertyAddress,
        propertyType,
        premium,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        payer,
        status: 'pending',
        propertyData: JSON.stringify(propertyData || {}),
        coverageData: JSON.stringify(coverageData || {})
      },
      include: {
        broker: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } }
      }
    });
    
    return NextResponse.json({
      id: policy.id,
      broker: policy.broker,
      tenant: policy.tenant,
      landlord: policy.landlord,
      property: {
        address: policy.propertyAddress,
        type: policy.propertyType,
        data: JSON.parse(policy.propertyData)
      },
      coverage: JSON.parse(policy.coverageData),
      status: policy.status,
      premium: policy.premium,
      startDate: policy.startDate,
      endDate: policy.endDate,
      payer: policy.payer,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt
    }, { status: 201 });
    
  } catch (error) {
    console.error("Failed to create policy:", error);
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
  }
}
