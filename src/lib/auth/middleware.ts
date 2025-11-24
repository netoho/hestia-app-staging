import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Verify authentication and return user data
 */
export async function verifyAuth(request?: NextRequest): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Ensure role is valid
    const role = session.user.role as UserRole;
    if (!Object.values(UserRole).includes(role)) {
      return { success: false, error: 'Invalid user role' };
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || undefined,
        role: role
      }
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if user has required role(s)
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user can access a specific policy
 */
export async function canAccessPolicy(
  userId: string,
  userRole: UserRole,
  policyCreatedById: string
): Promise<boolean> {
  // Admin and Staff can access all policies
  if ([UserRole.ADMIN, UserRole.STAFF].includes(userRole)) {
    return true;
  }

  // Broker can only access their own policies
  if (userRole === UserRole.BROKER) {
    return userId === policyCreatedById;
  }

  return false;
}

/**
 * Middleware to check authentication
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await verifyAuth(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler(request, authResult.user);
}

/**
 * Middleware to check authentication and role
 */
export async function withRole(
  request: NextRequest,
  requiredRoles: UserRole[],
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await verifyAuth(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!hasRole(authResult.user.role, requiredRoles)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return handler(request, authResult.user);
}