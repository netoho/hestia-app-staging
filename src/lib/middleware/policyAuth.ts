import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPolicyById } from '@/lib/services/policyService';

export interface AuthResult {
  success: boolean;
  user?: any;
  policy?: any;
}

/**
 * Middleware to verify user authentication and policy ownership
 * - ADMIN/STAFF: Can access any policy
 * - BROKER: Can only access policies they created
 */
export async function verifyPolicyAccess(
  request: NextRequest,
  policyId: string
): Promise<AuthResult> {
  try {
    // Verify authentication first
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return { success: false };
    }

    // Get the policy
    const policy = await getPolicyById(policyId);
    if (!policy) {
      return { success: false };
    }

    // Check authorization based on role
    const user = authResult.user;

    // ADMIN and STAFF can access any policy
    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      return {
        success: true,
        user,
        policy
      };
    }

    // BROKER can only access policies they created
    if (user.role === 'BROKER') {
      if (policy.createdById !== user.id) {
        return { success: false };
      }
      return {
        success: true,
        user,
        policy
      };
    }

    // Unknown role
    return { success: false };

  } catch (error) {
    console.error('Policy access verification error:', error);
    return { success: false };
  }
}

/**
 * Higher-order function to wrap API endpoints with policy access control
 */
export function withPolicyAuth(
  handler: (
    request: NextRequest,
    params: { params: Promise<{ id: string }> },
    authResult: AuthResult
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    const authResult = await verifyPolicyAccess(request, id);

    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized access to policy' },
        { status: authResult.user ? 403 : 401 }
      );
    }

    return handler(request, { params }, authResult);
  };
}