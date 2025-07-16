import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isDemoMode } from '@/lib/env-check';
import { DemoORM } from '@/lib/services/demoDatabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get policy with all related data
    let policy;
    
    if (isDemoMode()) {
      // Use demo database
      policy = await DemoORM.findUniquePolicy(
        { id },
        {
          include: {
            initiatedByUser: true,
            reviewedByUser: true,
            documents: true,
            activities: true,
          }
        }
      );
    } else {
      // Use real database
      policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          initiatedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          reviewedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          documents: {
            select: {
              id: true,
              category: true,
              originalName: true,
              fileSize: true,
              uploadedAt: true,
            },
            orderBy: {
              uploadedAt: 'desc'
            }
          },
          activities: {
            select: {
              id: true,
              action: true,
              details: true,
              performedBy: true,
              ipAddress: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
    }

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);

  } catch (error) {
    console.error('Get policy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, reviewNotes, reviewReason } = body;

    let updatedPolicy;

    if (isDemoMode()) {
      // Demo mode - update persists in memory
      updatedPolicy = await DemoORM.updatePolicy(
        { id },
        {
          status,
          reviewedBy: authResult.user.id,
          reviewedAt: new Date(),
          ...(reviewNotes && { reviewNotes }),
          ...(reviewReason && { reviewReason }),
        },
        {
          include: {
            initiatedByUser: true,
            reviewedByUser: true,
          }
        }
      );

      if (!updatedPolicy) {
        return NextResponse.json(
          { error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Log activity in demo database
      await DemoORM.createPolicyActivity({
        policyId: id,
        action: status.toLowerCase(),
        details: {
          status,
          reviewNotes,
          reviewReason,
          reviewedBy: authResult.user.email,
        },
        performedBy: authResult.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
    } else {
      // Real database update
      updatedPolicy = await prisma.policy.update({
        where: { id },
        data: {
          status,
          reviewedBy: authResult.user.id,
          reviewedAt: new Date(),
          ...(reviewNotes && { reviewNotes }),
          ...(reviewReason && { reviewReason }),
        },
        include: {
          initiatedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          reviewedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          }
        }
      });

      // Log activity (only in real mode)
      await prisma.policyActivity.create({
        data: {
          policyId: id,
          action: status.toLowerCase(),
          details: {
            status,
            reviewNotes,
            reviewReason,
            reviewedBy: authResult.user.email,
          },
          performedBy: authResult.user.id,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        }
      });
    }

    return NextResponse.json(updatedPolicy);

  } catch (error) {
    console.error('Update policy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}