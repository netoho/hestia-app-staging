import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, requireRole } from '@/lib/auth';
import { getPolicies, createPolicy, logPolicyActivity } from '@/lib/services/policyService';
import { PolicyStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(authResult.user.role, ['STAFF', 'ADMIN', 'BROKER'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff, admin, and brokers can view policies' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PolicyStatus | 'all' | null;
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

    // Get policies from service
    const result = await getPolicies({
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      search: search || undefined,
      page,
      limit,
      // Filter by createdById for brokers
      createdById: authResult.user.role === 'BROKER' ? authResult.user.id : undefined
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Get policies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new policy
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Check if user has permission (admin, staff, or broker can create policies)
    if (!requireRole(authResult.user.role, ['STAFF', 'ADMIN', 'BROKER'])) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create policies' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Create policy using service
    const policy = await createPolicy({
      ...data,
      createdById: authResult.user.id
    });

    // Log activity
    await logPolicyActivity({
      policyId: policy.id,
      action: 'created',
      description: 'Policy created',
      details: {createdBy: authResult.user.email},
      performedById: authResult.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    });

    // Automatically send invitations to actors if checkbox was checked
    if (data.sendInvitations !== false) {
      try {
        const invitationResponse = await fetch(
          `${request.nextUrl.origin}/api/policies/${policy.id}/send-invitations`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': request.headers.get('authorization') || '',
              'Cookie': request.headers.get('cookie') || '',
            },
          }
        );

        if (invitationResponse.ok) {
          const invitationData = await invitationResponse.json();
        } else {
          console.error('Failed to send invitations:', await invitationResponse.text());
        }
      } catch (error) {
        console.error('Error sending invitations:', error);
        // Don't fail the policy creation if invitations fail
      }
    }

    return NextResponse.json({
      success: true,
      data: { policy }
    });

  } catch (error) {
    console.error('Create policy error:', error);
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}
