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
let mockUsers: User[] = [
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
    const hashedPassword = userData.password ? await hashPassword(userData.password) : 'temp-password';

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

export const getUserById = async (id: string): Promise<User | null> => {
  if (isEmulator()) {
    console.log('Using mock data for getUserById');
    return mockUsers.find(user => user.id === id) || null;
  } else {
    console.log('Using real database for getUserById');
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
  }
};

export const updateUser = async (id: string, data: Partial<CreateUserData>): Promise<User | null> => {
  if (isEmulator()) {
    console.log('Using mock data for updateUser');
    const index = mockUsers.findIndex(user => user.id === id);
    if (index === -1) return null;
    
    const updatedUser = {
      ...mockUsers[index],
      ...data,
      updatedAt: new Date()
    };
    mockUsers[index] = updatedUser;
    return updatedUser;
  } else {
    console.log('Using real database for updateUser');
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
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  if (isEmulator()) {
    console.log('Using mock data for deleteUser');
    const initialLength = mockUsers.length;
    mockUsers = mockUsers.filter(user => user.id !== id);
    return mockUsers.length < initialLength;
  } else {
    console.log('Using real database for deleteUser');
    try {
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
};