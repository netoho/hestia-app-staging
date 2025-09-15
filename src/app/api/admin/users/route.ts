import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { hashPassword } from '@/lib/auth';
import { isDemoMode } from '@/lib/env-check';
import { DemoORM } from '@/lib/services/demoDatabase';
import { v4 as uuidv4 } from 'uuid';

// GET all users
export async function GET(request: NextRequest) {
  return withRole(request, [UserRole.ADMIN], async (req, user) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const role = searchParams.get('role') as UserRole | null;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      if (isDemoMode()) {
        const demoORM = DemoORM;
        let users = demoORM.users;

        // Filter by role
        if (role) {
          users = users.filter(u => u.role === role);
        }

        // Paginate
        const total = users.length;
        users = users.slice(skip, skip + limit);

        return NextResponse.json({
          success: true,
          data: {
            users: users.map(u => ({
              ...u,
              password: undefined, // Never return password
            })),
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        });
      }

      // Production mode with Prisma
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
            lastLoginAt: true,
            _count: {
              select: {
                createdPolicies: true,
                reviewedPolicies: true,
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

      if (isDemoMode()) {
        const demoORM = DemoORM;

        // Check if user already exists
        const existingUser = demoORM.users.find(u => u.email === email);
        if (existingUser) {
          return NextResponse.json(
            { success: false, error: 'User with this email already exists' },
            { status: 400 }
          );
        }

        // Create user
        const hashedPassword = await hashPassword(password);
        const newUser = {
          id: uuidv4(),
          email,
          password: hashedPassword,
          name: name || null,
          role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        };

        demoORM.users.push(newUser);

        return NextResponse.json({
          success: true,
          data: {
            user: {
              ...newUser,
              password: undefined,
            },
          },
        });
      }

      // Production mode with Prisma
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