import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { LandlordService } from '@/lib/services/actors/LandlordService';
import { logPolicyActivity } from '@/lib/services/policyService';

/**
 * GET /api/policies/[id]/landlords
 * Get all landlords for a policy
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch policy with all landlords
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        landlords: {
          include: {
            addressDetails: true,
            documents: true,
          },
          orderBy: [
            { isPrimary: 'desc' }, // Primary first
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Brokers can only see their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Return all landlords with primary landlord first
    const primaryLandlord = policy.landlords.find(l => l.isPrimary);

    return NextResponse.json({
      success: true,
      data: {
        landlords: policy.landlords,
        primary: primaryLandlord || null,
      },
    });
  } catch (error) {
    console.error('Error fetching landlords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch landlords' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/policies/[id]/landlords
 * Create a new landlord (co-owner) for a policy
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Fetch policy
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: { landlords: true },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Brokers can only edit their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!body.email || !body.phone) {
      return NextResponse.json(
        { success: false, error: 'Email and phone are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone (10 digits)
    if (body.phone.replace(/\D/g, '').length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Phone must be 10 digits' },
        { status: 400 }
      );
    }

    // Use LandlordService to create new landlord
    const landlordService = new LandlordService();
    const result = await landlordService.createLandlord(
      id,
      body,
      body.isPrimary || false
    );

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: result.error.statusCode || 500 }
      );
    }

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: 'landlord_added',
      description: `New ${body.isPrimary ? 'primary ' : 'co-owner '}landlord added`,
      performedById: user.id,
      details: {
        landlordId: result.value.id,
        isCompany: body.isCompany,
        isPrimary: body.isPrimary || false,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Error creating landlord:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create landlord' },
      { status: 500 }
    );
  }
}
