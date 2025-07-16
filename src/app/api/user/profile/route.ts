
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { isDemoMode, DemoORM } from '@/lib/services/demoDatabase';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authResult.user.id;

  try {
    let user;

    if (isDemoMode()) {
      // Use demo database
      user = await DemoORM.findUniqueUser({ id: userId });
      if (user) {
        // Select only the fields we want to return
        user = {
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          image: user.image,
          createdAt: user.createdAt,
        };
      }
    } else {
      // Use real database
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          image: true,
          createdAt: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await verifyAuth(req);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authResult.user.id;
  const body = await req.json();
  const { name, email, phone, address, currentPassword, newPassword } = body;

  try {
    let user;
    
    if (isDemoMode()) {
      // Use demo database
      user = await DemoORM.findUniqueUser({ id: userId });
    } else {
      // Use real database
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (name) dataToUpdate.name = name;
    if (email && email !== user.email) {
      let existingUser;
      if (isDemoMode()) {
        existingUser = await DemoORM.findUniqueUser({ email });
      } else {
        existingUser = await prisma.user.findUnique({ where: { email } });
      }
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      dataToUpdate.email = email;
    }
    if (phone) dataToUpdate.phone = phone;
    if (address) dataToUpdate.address = address;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password!);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      dataToUpdate.password = hashedNewPassword;
    }

    let updatedUser;
    if (isDemoMode()) {
      // Use demo database
      updatedUser = await DemoORM.updateUser({ id: userId }, dataToUpdate);
      // Select only the fields we want to return
      updatedUser = {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        image: updatedUser.image,
        createdAt: updatedUser.createdAt,
      };
    } else {
      // Use real database
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: {
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          image: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
