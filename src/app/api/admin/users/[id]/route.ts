import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { hashPassword } from '@/lib/auth';

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN], async (req, user) => {
    try {
      const { id } = await params;

      // Prisma database query
      const targetUser = await prisma.user.findUnique({
        where: { id },
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
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { user: targetUser },
      });
    } catch (error) {
      console.error('Get user error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user' },
        { status: 500 }
      );
    }
  });
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN], async (req, user) => {
    try {
      const { id } = await params;
      const data = await req.json();
      const { email, password, name, role, isActive } = data;

      // Prevent admin from modifying their own role
      if (id === user.id && role && role !== user.role) {
        return NextResponse.json(
          { success: false, error: 'Cannot change your own role' },
          { status: 400 }
        );
      }

      // Prevent admin from deactivating themselves
      if (id === user.id && isActive === false) {
        return NextResponse.json(
          { success: false, error: 'Cannot deactivate your own account' },
          { status: 400 }
        );
      }

      // Prisma database operations
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if email is already taken by another user
      if (email && email !== existingUser.email) {
        const emailTaken = await prisma.user.findUnique({
          where: { email },
        });

        if (emailTaken) {
          return NextResponse.json(
            { success: false, error: 'Email already in use' },
            { status: 400 }
          );
        }
      }

      // Build update data
      const updateData: any = {};
      if (email) updateData.email = email;
      if (name !== undefined) updateData.name = name;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = await hashPassword(password);

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: { user: updatedUser },
      });
    } catch (error) {
      console.error('Update user error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }
  });
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN], async (req, user) => {
    try {
      const { id } = await params;

      // Prevent admin from deleting themselves
      if (id === user.id) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete your own account' },
          { status: 400 }
        );
      }

      // Prisma database operations
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user has any associated policies
      const policiesCount = await prisma.policy.count({
        where: {
          OR: [
            { createdById: id },
            { reviewedBy: id },
          ],
        },
      });

      if (policiesCount > 0) {
        // Instead of deleting, deactivate the user
        await prisma.user.update({
          where: { id },
          data: { isActive: false },
        });

        return NextResponse.json({
          success: true,
          message: 'User deactivated (has associated policies)',
        });
      }

      // Delete user if no associated policies
      await prisma.user.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      );
    }
  });
}
