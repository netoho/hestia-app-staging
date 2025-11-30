import prisma from "@/lib/prisma"; // Assuming your Prisma client is exported from this file
import { hashPassword } from '../auth'; // Assuming password hashing utility

interface GetUsersOptions {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateUserData {
  email: string;
  name?: string;
  password?: string;
  role?: string;
}


interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GetUsersResult {
  users: User[];
  pagination: Pagination;
}

// We'll use the mock data from MockDataService instead of local mock data


export const getUsers = async (options: GetUsersOptions = {}): Promise<GetUsersResult> => {
  const { role, search, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;


  const where: any = {};

  if (role && role !== 'all') {
    where.role = role;
  }

  if (search && search.trim()) {
    where.OR = [
      {
        name: {
          contains: search.trim(),
          mode: 'insensitive'
        }
      },
      {
        email: {
          contains: search.trim(),
          mode: 'insensitive'
        }
      },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return {
    users: users as User[], // Cast to User[] for type compatibility
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  // Create user without password if not provided (for invitation flow)
  const hashedPassword = userData.password ? await hashPassword(userData.password) : null;

  const newUser = await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
      role: (userData.role || 'STAFF') as 'ADMIN' | 'STAFF' | 'BROKER',
      isActive: true,
    },
  });

  return newUser as User; // Cast to User for type compatibility
};

export const getUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  }) as Promise<User | null>;
};

export const updateUser = async (id: string, data: Partial<CreateUserData>): Promise<User | null> => {
  const hashedPassword = data.password ? await hashPassword(data.password) : undefined;

  const updateData: any = {
    email: data.email,
    name: data.name,
    role: data.role
  };

  if (hashedPassword) {
    updateData.password = hashedPassword;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  }) as Promise<User>;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  try {
    await prisma.user.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
};
