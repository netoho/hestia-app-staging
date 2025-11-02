import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';

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

    // Fetch policy with all related data
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        landlords: {
          include: {
            documents: true,
          },
        },
        tenant: {
          include: {
            documents: true,
          },
        },
        jointObligors: {
          include: {
            documents: true,
          },
        },
        avals: {
          include: {
            documents: true,
          },
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20, // Last 20 activities
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

    // Build actor progress data
    const actors = [];

    // Add landlords
    if (policy.landlords && policy.landlords.length > 0) {
      policy.landlords.forEach((landlord, index) => {
        actors.push({
          id: landlord.id,
          type: 'landlord',
          name: landlord.fullName,
          email: landlord.email,
          phone: landlord.phone,
          informationComplete: landlord.informationComplete,
          completedAt: landlord.completedAt?.toISOString(),
          documentsCount: landlord.documents.length,
          requiredDocuments: 2, // ID and address proof
          isPrimary: landlord.isPrimary,
        });
      });
    } else {
      // No landlords created yet
      actors.push({
        id: 'landlord-pending',
        type: 'landlord',
        name: '',
        email: '',
        phone: '',
        informationComplete: false,
        documentsCount: 0,
        requiredDocuments: 2,
      });
    }

    // Add tenant
    if (policy.tenant) {
      actors.push({
        id: policy.tenant.id,
        type: 'tenant',
        name: policy.tenant.fullName || policy.tenant.companyName || '',
        email: policy.tenant.email,
        phone: policy.tenant.phone,
        informationComplete: policy.tenant.informationComplete,
        completedAt: policy.tenant.completedAt?.toISOString(),
        tokenExpiry: policy.tenant.tokenExpiry?.toISOString(),
        documentsCount: policy.tenant.documents.length,
        requiredDocuments: 3, // ID, income proof, address proof
      });
    } else {
      // Tenant not created yet
      actors.push({
        id: 'tenant-pending',
        type: 'tenant',
        name: '',
        email: '',
        phone: '',
        informationComplete: false,
        documentsCount: 0,
        requiredDocuments: 3,
      });
    }

    // Add joint obligors (if applicable)
    if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
      if (policy.jointObligors.length > 0) {
        policy.jointObligors.forEach(jo => {
          actors.push({
            id: jo.id,
            type: 'jointObligor',
            name: jo.fullName,
            email: jo.email,
            phone: jo.phone,
            informationComplete: jo.informationComplete,
            completedAt: jo.completedAt?.toISOString(),
            tokenExpiry: jo.tokenExpiry?.toISOString(),
            documentsCount: jo.documents.length,
            requiredDocuments: 3,
          });
        });
      } else {
        // No joint obligors created yet but required
        actors.push({
          id: 'joint-obligor-pending',
          type: 'jointObligor',
          name: '',
          email: '',
          phone: '',
          informationComplete: false,
          documentsCount: 0,
          requiredDocuments: 3,
        });
      }
    }

    // Add avals (if applicable)
    if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
      if (policy.avals.length > 0) {
        policy.avals.forEach(aval => {
          actors.push({
            id: aval.id,
            type: 'aval',
            name: aval.fullName,
            email: aval.email,
            phone: aval.phone,
            informationComplete: aval.informationComplete,
            completedAt: aval.completedAt?.toISOString(),
            tokenExpiry: aval.tokenExpiry?.toISOString(),
            documentsCount: aval.documents.length,
            requiredDocuments: 4, // ID, income proof, address proof, property deed
          });
        });
      } else {
        // No avals created yet but required
        actors.push({
          id: 'aval-pending',
          type: 'aval',
          name: '',
          email: '',
          phone: '',
          informationComplete: false,
          documentsCount: 0,
          requiredDocuments: 4,
        });
      }
    }

    // Calculate overall progress
    const totalActors = actors.length;
    const completedActors = actors.filter(a => a.informationComplete).length;
    const overallProgress = totalActors > 0 ? Math.round((completedActors / totalActors) * 100) : 0;

    // Format activities
    const formattedActivities = policy.activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
      performedBy: activity.performedBy?.name || activity.performedBy?.email,
      performedByType: activity.performedByType,
    }));

    // Get last activity timestamp for each actor
    const actorActivities = await prisma.policyActivity.findMany({
      where: {
        policyId: id,
        performedByType: { not: null },
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['performedByType'],
    });

    // Add last activity to actors
    actors.forEach(actor => {
      const lastActivity = actorActivities.find(a =>
        a.performedByType === actor.type ||
        (actor.type === 'jointObligor' && a.performedByType === 'joint-obligor')
      );
      if (lastActivity) {
        actor.lastActivity = lastActivity.createdAt.toISOString();
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: policy.id,
        policyNumber: policy.policyNumber,
        propertyAddress: policy.propertyAddress,
        status: policy.status,
        guarantorType: policy.guarantorType,
        createdAt: policy.createdAt.toISOString(),
        overallProgress,
        actors,
        activities: formattedActivities,
      },
    });
  } catch (error) {
    console.error('Error fetching policy progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch policy progress' },
      { status: 500 }
    );
  }
}