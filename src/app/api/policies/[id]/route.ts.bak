import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, requireRole } from '@/lib/auth';
import { z } from 'zod';
import { getPolicyById, updatePolicy, deletePolicy } from '@/lib/services/policyService';

const updatePolicySchema = z.object({
  status: z.string().optional(),
  premium: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  payer: z.string().optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const policy = await getPolicyById(params.id);
    
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    
    // Check access based on role
    const hasAccess = 
      auth.role === 'staff' ||
      (auth.role === 'broker' && policy.brokerId === auth.userId) ||
      (auth.role === 'tenant' && policy.tenantId === auth.userId) ||
      (auth.role === 'landlord' && policy.landlordId === auth.userId);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({
      id: policy.id,
      broker: policy.broker,
      tenant: policy.tenant,
      landlord: policy.landlord,
      property: {
        address: policy.propertyAddress,
        type: policy.propertyType,
        data: JSON.parse(policy.propertyData || '{}')
      },
      coverage: JSON.parse(policy.coverageData || '{}'),
      status: policy.status,
      premium: policy.premium,
      startDate: policy.startDate,
      endDate: policy.endDate,
      payer: policy.payer,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt
    });
    
  } catch (error) {
    console.error('Failed to fetch policy:', error);
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only brokers and staff can update policies
    if (!requireRole(auth.role, ['broker', 'staff'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const validation = updatePolicySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { status, premium, startDate, endDate, payer, propertyData, coverageData } = validation.data;
    
    // Check if policy exists and user has access
    const existingPolicy = await prisma.policy.findUnique({
      where: { id: params.id }
    });
    
    if (!existingPolicy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    
    // Check access
    if (auth.role === 'broker' && existingPolicy.brokerId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const policy = await updatePolicy(params.id, {
      where: { id: params.id },
      data: updateData,
      include: {
        broker: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } }
      }
    }, {
      status,
      premium,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      payer,
      propertyData,
      coverageData,
    }); // Pass update data directly
    
    return NextResponse.json({
      id: policy.id,
      broker: policy.broker,
      tenant: policy.tenant,
      landlord: policy.landlord,
      property: {
        address: policy.propertyAddress,
        type: policy.propertyType,
        data: JSON.parse(policy.propertyData || '{}')
      },
      coverage: JSON.parse(policy.coverageData || '{}'),
      status: policy.status,
      premium: policy.premium,
      startDate: policy.startDate,
      endDate: policy.endDate,
      payer: policy.payer,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt
    });
    
  } catch (error) {
    console.error('Failed to update policy:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only staff can delete policies
    if (!requireRole(auth.role, ['staff'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await deletePolicy(params.id);
    
    return NextResponse.json({ message: 'Policy deleted successfully' });
    
  } catch (error) {
    console.error('Failed to delete policy:', error);
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
  }
}
