import { isEmulator } from '../env-check';
import prisma from '../prisma'; // Assuming your Prisma client is exported from this file
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

// Mock data for emulator
const mockUsers: User[] = [
  {
    id: 'mock-user-1',
    email: 'mock.user1@example.com',
    name: 'Mock User One',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-user-2',
    email: 'mock.user2@example.com',
    name: 'Mock User Two',
    role: 'staff',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-user-3',
    email: 'mock.user3@example.com',
    name: 'Mock User Three',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-user-4',
    email: 'mock.user4@example.com',
    name: 'Mock User Four',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-user-5',
    email: 'mock.user5@example.com',
    name: 'Mock User Five',
    role: 'staff',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];


export const getUsers = async (options: GetUsersOptions = {}): Promise<GetUsersResult> => {
  const { role, search, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  if (isEmulator()) {
    console.log('Using mock data for getUsers');

    let filteredUsers = mockUsers;

    if (role && role !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    return {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } else {
    console.log('Using real database for getUsers');

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
  }
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  if (isEmulator()) {
    console.log('Using mock data for createUser');
    const newUser: User = {
      id: `mock-user-${mockUsers.length + 1}`,
      email: userData.email,
      name: userData.name || null,
      role: userData.role || 'user', // Default role
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
  } else {
    console.log('Using real database for createUser');
    const hashedPassword = userData.password ? await hashPassword(userData.password) : undefined;

    const newUser = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role || 'user', // Default role
      },
    });

    return newUser as User; // Cast to User for type compatibility
  }
};