import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';
import { pricingSchema } from '@/lib/validations/policy';
import { z } from 'zod';

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

    // Fetch policy pricing information
    const policy = await prisma.policy.findUnique({
      where: { id },
      select: {
        id: true,
        policyNumber: true,
        propertyAddress: true,
        rentAmount: true,
        packageId: true,
        totalPrice: true,
        tenantPercentage: true,
        landlordPercentage: true,
        guarantorType: true,
        createdById: true,
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

    // Only ADMIN and STAFF can access this endpoint
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        packageId: policy.packageId,
        totalPrice: policy.totalPrice,
        tenantPercentage: policy.tenantPercentage,
        landlordPercentage: policy.landlordPercentage,
        guarantorType: policy.guarantorType,
      },
      policyNumber: policy.policyNumber,
      propertyAddress: policy.propertyAddress,
      rentAmount: policy.rentAmount,
    });
  } catch (error) {
    console.error('Error fetching pricing information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing information' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only ADMIN and STAFF can edit pricing information' },
        { status: 403 }
      );
    }

    // Verify policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { id },
      select: {
        id: true,
        totalPrice: true,
        packageId: true,
        tenantPercentage: true,
        landlordPercentage: true,
        guarantorType: true,
        status: true,
      },
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Validate pricing data with Zod
    try {
      pricingSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }
    }

    // Update policy pricing information
    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        packageId: body.packageId || null,
        totalPrice: body.totalPrice,
        tenantPercentage: body.tenantPercentage,
        landlordPercentage: body.landlordPercentage,
        guarantorType: body.guarantorType,
      },
    });

    // Log activity with details of what changed
    const changes: Record<string, any> = {};
    if (existingPolicy.totalPrice !== body.totalPrice) {
      changes.previousPrice = existingPolicy.totalPrice;
      changes.newPrice = body.totalPrice;
    }
    if (existingPolicy.packageId !== body.packageId) {
      changes.previousPackageId = existingPolicy.packageId;
      changes.newPackageId = body.packageId;
    }
    if (existingPolicy.tenantPercentage !== body.tenantPercentage) {
      changes.previousTenantPercentage = existingPolicy.tenantPercentage;
      changes.newTenantPercentage = body.tenantPercentage;
    }
    if (existingPolicy.guarantorType !== body.guarantorType) {
      changes.previousGuarantorType = existingPolicy.guarantorType;
      changes.newGuarantorType = body.guarantorType;
    }

    await logPolicyActivity(id, {
      action: 'pricing_updated',
      description: 'Pricing information updated by internal team',
      performedById: user.id,
      details: {
        totalPrice: body.totalPrice,
        tenantPercentage: body.tenantPercentage,
        landlordPercentage: body.landlordPercentage,
        guarantorType: body.guarantorType,
        packageId: body.packageId,
        updatedBy: user.email,
        ...changes,
      },
    });

    // If guarantor type changed, log additional activity
    if (existingPolicy.guarantorType !== body.guarantorType) {
      await logPolicyActivity(id, {
        action: 'guarantor_type_changed',
        description: `Guarantor type changed from ${existingPolicy.guarantorType} to ${body.guarantorType}`,
        performedById: user.id,
        details: {
          previousType: existingPolicy.guarantorType,
          newType: body.guarantorType,
          impact: 'May require adding or removing guarantor actors',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        packageId: updatedPolicy.packageId,
        totalPrice: updatedPolicy.totalPrice,
        tenantPercentage: updatedPolicy.tenantPercentage,
        landlordPercentage: updatedPolicy.landlordPercentage,
        guarantorType: updatedPolicy.guarantorType,
      },
    });
  } catch (error) {
    console.error('Error updating pricing information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing information' },
      { status: 500 }
    );
  }
}