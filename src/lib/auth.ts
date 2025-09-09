import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/auth-config';
import { isDemoMode } from './env-check';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

// Demo mode super admin user
const DEMO_SUPER_USER = {
  id: 'demo-admin-id',
  email: 'admin@hestiaplp.com.mx',
  name: 'Super Admin',
  role: 'staff' // staff role has admin privileges
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Note: This JWT implementation is now secondary to NextAuth.js
// It can still be used for other purposes if needed.
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  
  return token;
}

// This function is for securing API routes.
// It uses NextAuth's session management.
export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  // In demo mode, always return the super admin user
  if (isDemoMode()) {
    return {
      userId: DEMO_SUPER_USER.id,
      email: DEMO_SUPER_USER.email,
      role: DEMO_SUPER_USER.role,
      name: DEMO_SUPER_USER.name
    };
  }

  const session = await getServerSession(authOptions);

  if (session && session.user) {
    return {
      userId: session.user.id,
      email: session.user.email!,
      role: session.user.role as string,
      name: session.user.name || undefined
    };
  }

  // Fallback to JWT for non-session based auth if needed
  try {
    const token = getTokenFromRequest(request);
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export function requireRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

// Wrapper for easier use in API routes
export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
  };
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // In demo mode, always return the super admin user
    if (isDemoMode()) {
      return {
        success: true,
        user: {
          id: DEMO_SUPER_USER.id,
          email: DEMO_SUPER_USER.email,
          role: DEMO_SUPER_USER.role,
          name: DEMO_SUPER_USER.name
        }
      };
    }

    const payload = await authenticateRequest(request);
    if (!payload) {
      return { success: false };
    }
    
    return {
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name
      }
    };
  } catch (error) {
    return { success: false };
  }
}
