import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { validationService } from '@/lib/services/validationService';
import { reviewService } from '@/lib/services/reviewService';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session and check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Check if policy exists and user has access
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        createdById: true,
        status: true,
        policyNumber: true,
        propertyAddress: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check permissions - BROKER can only view their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view this policy' },
        { status: 403 }
      );
    }

    // Get query parameter for detail level
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Get full review data
      const reviewData = await reviewService.getPolicyReviewData(policyId);

      return NextResponse.json({
        success: true,
        data: reviewData
      });
    } else {
      // Get simple progress summary
      const progress = await validationService.getValidationProgress(policyId);

      // Add policy info to progress
      const enhancedProgress = {
        ...progress,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        policyStatus: policy.status,
        propertyAddress: policy.propertyAddress,
        canApprove: await checkCanApprovePolicy(policyId, progress)
      };

      return NextResponse.json({
        success: true,
        data: enhancedProgress
      });
    }

  } catch (error) {
    console.error('Error fetching review progress:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching progress',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to check if policy can be approved
async function checkCanApprovePolicy(policyId: string, progress: any): Promise<boolean> {
  // All validations must be complete
  if (!progress.isComplete) {
    return false;
  }

  // No rejected sections or documents
  if (progress.rejectedSections > 0 || progress.rejectedDocuments > 0) {
    return false;
  }

  // Policy must be in appropriate status
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: { status: true }
  });

  const approvableStatuses = ['UNDER_INVESTIGATION', 'PENDING_APPROVAL'];
  return policy ? approvableStatuses.includes(policy.status) : false;
}

// POST endpoint to trigger policy approval check
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session and check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !['STAFF', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Check if all validations are complete
    const isComplete = await reviewService.checkPolicyValidationComplete(policyId);

    if (!isComplete) {
      return NextResponse.json({
        success: false,
        message: 'Not all validations are complete',
        data: { canApprove: false }
      });
    }

    // Get policy
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        status: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check if policy can transition to approved
    if (policy.status === 'UNDER_INVESTIGATION') {
      // Transition to PENDING_APPROVAL
      await prisma.policy.update({
        where: { id: policyId },
        data: {
          status: 'PENDING_APPROVAL'
        }
      });

      // Log activity
      await prisma.policyActivity.create({
        data: {
          policyId,
          action: 'status_changed',
          description: 'Policy moved to pending approval after all validations completed',
          details: {
            from: policy.status,
            to: 'PENDING_APPROVAL'
          },
          performedById: user.id,
          performedByType: 'user'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Policy moved to pending approval',
        data: {
          canApprove: true,
          newStatus: 'PENDING_APPROVAL'
        }
      });
    } else if (policy.status === 'PENDING_APPROVAL') {
      // Already in approvable state
      return NextResponse.json({
        success: true,
        message: 'Policy is ready for approval',
        data: {
          canApprove: true,
          currentStatus: policy.status
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Policy is not in a state that can be approved',
        data: {
          canApprove: false,
          currentStatus: policy.status
        }
      });
    }

  } catch (error) {
    console.error('Error checking policy approval readiness:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while checking approval readiness',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}