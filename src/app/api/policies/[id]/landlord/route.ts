import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { logPolicyActivity } from '@/lib/services/policyService';

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

    // Fetch policy with landlord information
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        landlord: true,
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

    return NextResponse.json({
      success: true,
      data: policy.landlord,
    });
  } catch (error) {
    console.error('Error fetching landlord information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch landlord information' },
      { status: 500 }
    );
  }
}

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
      include: {
        landlord: true,
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

    // Brokers can only edit their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate required fields
    const requiredFields = ['fullName', 'rfc', 'email', 'phone', 'address'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate RFC format
    const rfcPattern = body.isCompany
      ? /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/
      : /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;

    if (!rfcPattern.test(body.rfc)) {
      return NextResponse.json(
        { success: false, error: 'Invalid RFC format' },
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

    // Validate CLABE if provided (18 digits)
    if (body.clabe && body.clabe.replace(/\D/g, '').length !== 18) {
      return NextResponse.json(
        { success: false, error: 'CLABE must be 18 digits' },
        { status: 400 }
      );
    }

    // Create or update landlord information
    let landlord;
    if (policy.landlord) {
      // Update existing landlord
      landlord = await prisma.landlord.update({
        where: { id: policy.landlord.id },
        data: {
          isCompany: body.isCompany || false,
          fullName: body.fullName,
          rfc: body.rfc,
          email: body.email,
          phone: body.phone,
          address: body.address,
          bankName: body.bankName || null,
          accountNumber: body.accountNumber || null,
          clabe: body.clabe || null,
          occupation: body.occupation || null,
          companyName: body.companyName || null,
          monthlyIncome: body.monthlyIncome || null,
          informationComplete: body.informationComplete || false,
          completedAt: body.informationComplete ? new Date() : null,
        },
      });
    } else {
      // Create new landlord
      landlord = await prisma.landlord.create({
        data: {
          policyId: id,
          isCompany: body.isCompany || false,
          fullName: body.fullName,
          rfc: body.rfc,
          email: body.email,
          phone: body.phone,
          address: body.address,
          bankName: body.bankName || null,
          accountNumber: body.accountNumber || null,
          clabe: body.clabe || null,
          occupation: body.occupation || null,
          companyName: body.companyName || null,
          monthlyIncome: body.monthlyIncome || null,
          informationComplete: body.informationComplete || false,
          completedAt: body.informationComplete ? new Date() : null,
        },
      });
    }

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: policy.landlord ? 'landlord_updated' : 'landlord_created',
      description: policy.landlord
        ? 'Landlord information updated'
        : 'Landlord information created',
      performedById: user.id,
      details: {
        landlordId: landlord.id,
        isCompany: landlord.isCompany,
        informationComplete: landlord.informationComplete,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    // Check if we should update policy status
    if (landlord.informationComplete) {
      // Check if all actors have completed their information
      const updatedPolicy = await prisma.policy.findUnique({
        where: { id },
        include: {
          landlord: true,
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (updatedPolicy) {
        let allActorsComplete = true;

        // Check landlord
        if (!updatedPolicy.landlord?.informationComplete) {
          allActorsComplete = false;
        }

        // Check tenant
        if (!updatedPolicy.tenant?.informationComplete) {
          allActorsComplete = false;
        }

        // Check joint obligors based on guarantor type
        if (
          (updatedPolicy.guarantorType === 'JOINT_OBLIGOR' || updatedPolicy.guarantorType === 'BOTH') &&
          updatedPolicy.jointObligors.length === 0
        ) {
          allActorsComplete = false;
        } else {
          for (const jo of updatedPolicy.jointObligors) {
            if (!jo.informationComplete) {
              allActorsComplete = false;
              break;
            }
          }
        }

        // Check avals based on guarantor type
        if (
          (updatedPolicy.guarantorType === 'AVAL' || updatedPolicy.guarantorType === 'BOTH') &&
          updatedPolicy.avals.length === 0
        ) {
          allActorsComplete = false;
        } else {
          for (const aval of updatedPolicy.avals) {
            if (!aval.informationComplete) {
              allActorsComplete = false;
              break;
            }
          }
        }

        // If all actors are complete and status is COLLECTING_INFO, transition to UNDER_INVESTIGATION
        if (allActorsComplete && updatedPolicy.status === 'COLLECTING_INFO') {
          const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');
          await transitionPolicyStatus(id, 'UNDER_INVESTIGATION', user.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: landlord,
    });
  } catch (error) {
    console.error('Error saving landlord information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save landlord information' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Only ADMIN can delete landlord information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Find and delete landlord
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: { landlord: true },
    });

    if (!policy || !policy.landlord) {
      return NextResponse.json(
        { success: false, error: 'Landlord not found' },
        { status: 404 }
      );
    }

    await prisma.landlord.delete({
      where: { id: policy.landlord.id },
    });

    // Log activity
    await logPolicyActivity({
      policyId: id,
      action: 'landlord_deleted',
      description: 'Landlord information deleted',
      performedById: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Landlord information deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting landlord information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete landlord information' },
      { status: 500 }
    );
  }
}
