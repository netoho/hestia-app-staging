import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { hashPassword } from '@/lib/auth';

// GET all users
export async function GET(request: NextRequest) {
  return withRole(request, [UserRole.ADMIN], async (req, user) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const role = searchParams.get('role') as UserRole | null;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      // Prisma database query
      const where: any = {};
      if (role) {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdPolicies: true,
                managedPolicies: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
  });
}

// POST create new user
export async function POST(request: NextRequest) {
  return withRole(request, [UserRole.ADMIN], async (req, user) => {
    try {
      const data = await req.json();
      const { email, password, name, role } = data;

      // Validate required fields
      if (!email || !password || !role) {
        return NextResponse.json(
          { success: false, error: 'Email, password, and role are required' },
          { status: 400 }
        );
      }

      // Validate role
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role' },
          { status: 400 }
        );
      }

      // Prisma database operations
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 400 }
        );
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: { user: newUser },
      });
    } catch (error) {
      console.error('Create user error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }
  });
}
