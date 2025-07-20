import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPolicies } from '@/lib/services/policyApplicationService';
import { PolicyStatus, PolicyStatusType } from '@/lib/prisma-types';
import { isDemoMode, DemoORM } from '@/lib/services/demoDatabase';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (staff or admin only)
    if (!['staff', 'admin'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff and admin can view policies' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PolicyStatusType | 'all' | null;
    const paymentStatus = searchParams.get('paymentStatus') as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'all' | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Get policies
    let result;
    
    if (isDemoMode()) {
      // Use demo database
      const where: any = {};
      if (status && status !== 'all') {
        where.status = status;
      }
      if (paymentStatus && paymentStatus !== 'all') {
        where.paymentStatus = paymentStatus;
      }
      if (search) {
        where.tenantEmail = { contains: search };
      }
      
      const skip = (page - 1) * limit;
      const [policies, total] = await Promise.all([
        DemoORM.findManyPolicies(where, {
          skip,
          take: limit,
          include: {
            initiatedByUser: true,
            reviewedByUser: true,
            documents: true,
            activities: true,
          }
        }),
        DemoORM.countPolicies(where)
      ]);
      
      result = {
        policies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } else {
      // Use real database
      result = await getPolicies({
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        search: search || undefined,
        page,
        limit
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Get policies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
