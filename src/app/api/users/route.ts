import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    // The 'role' field is now a string, so we just need to convert it to lowercase
    const formattedUsers = users.map(user => ({
      ...user,
      role: user.role.toLowerCase()
    }))

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
