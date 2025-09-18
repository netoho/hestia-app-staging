import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';
import { propertySchema } from '@/lib/validations/policy';
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

    // Fetch policy property information
    const policy = await prisma.policy.findUnique({
      where: { id },
      select: {
        id: true,
        policyNumber: true,
        propertyAddress: true,
        propertyType: true,
        propertyDescription: true,
        rentAmount: true,
        contractLength: true,
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
        propertyAddress: policy.propertyAddress,
        propertyType: policy.propertyType,
        propertyDescription: policy.propertyDescription,
        rentAmount: policy.rentAmount,
        contractLength: policy.contractLength,
      },
      policyNumber: policy.policyNumber,
    });
  } catch (error) {
    console.error('Error fetching property information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property information' },
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
        { success: false, error: 'Forbidden - Only ADMIN and STAFF can edit property information' },
        { status: 403 }
      );
    }

    // Verify policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { id },
      select: {
        id: true,
        propertyAddress: true,
        rentAmount: true,
        status: true,
      },
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Validate property data with Zod
    try {
      propertySchema.parse(body);
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

    // Update policy property information
    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        propertyAddress: body.propertyAddress,
        propertyType: body.propertyType,
        propertyDescription: body.propertyDescription || null,
        rentAmount: body.rentAmount,
        contractLength: body.contractLength,
      },
    });

    // Log activity with details of what changed
    const changes: Record<string, any> = {};
    if (existingPolicy.propertyAddress !== body.propertyAddress) {
      changes.previousAddress = existingPolicy.propertyAddress;
      changes.newAddress = body.propertyAddress;
    }
    if (existingPolicy.rentAmount !== body.rentAmount) {
      changes.previousRent = existingPolicy.rentAmount;
      changes.newRent = body.rentAmount;
    }

    await logPolicyActivity({
      policyId: id,
      action: 'property_updated',
      description: 'Property information updated by internal team',
      performedById: user.id,
      details: {
        propertyType: body.propertyType,
        rentAmount: body.rentAmount,
        contractLength: body.contractLength,
        updatedBy: user.email,
        ...changes,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    // If policy has pricing, we might need to recalculate based on new rent amount
    // This could trigger a notification or flag for review
    if (existingPolicy.rentAmount !== body.rentAmount && updatedPolicy.packageId) {
      // Fetch package to check if it's percentage-based
      const policyPackage = await prisma.package.findUnique({
        where: { id: updatedPolicy.packageId },
      });

      if (policyPackage && policyPackage.pricingType === 'PERCENTAGE') {
        // Log that pricing might need recalculation
        await logPolicyActivity({
          policyId: id,
          action: 'pricing_review_needed',
          description: 'Rent amount changed - pricing recalculation may be needed',
          performedById: user.id,
          details: {
            oldRent: existingPolicy.rentAmount,
            newRent: body.rentAmount,
            packageType: policyPackage.pricingType,
            packagePercentage: policyPackage.percentage,
          },
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        propertyAddress: updatedPolicy.propertyAddress,
        propertyType: updatedPolicy.propertyType,
        propertyDescription: updatedPolicy.propertyDescription,
        rentAmount: updatedPolicy.rentAmount,
        contractLength: updatedPolicy.contractLength,
      },
    });
  } catch (error) {
    console.error('Error updating property information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update property information' },
      { status: 500 }
    );
  }
}
