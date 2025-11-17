import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions as authOptionsImported } from './auth/auth-config';

export const authOptions = authOptionsImported;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'BROKER';
  name?: string;
}

// Demo mode super admin user
const DEMO_SUPER_USER = {
  id: 'demo-admin-id',
  email: 'admin@hestiaplp.com.mx',
  name: 'Super Admin',
  role: 'ADMIN' as const // ADMIN role has full privileges
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
  const session = await getServerSession(authOptions);

  if (session && session.user) {
    return {
      userId: session.user.id,
      email: session.user.email!,
      role: session.user.role as 'ADMIN' | 'STAFF' | 'BROKER',
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
  const lowerCaseRoles = requiredRoles.map(role => role.toLowerCase());
  return lowerCaseRoles.includes(userRole.toLowerCase());
}

// Wrapper for easier use in API routes
export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'STAFF' | 'BROKER';
    name?: string | null;
  };
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
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
