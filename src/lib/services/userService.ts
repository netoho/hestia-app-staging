/**
 * User Service
 * Handles user CRUD operations with proper error handling
 */

import { BaseService, ICrudService, ServiceOptions } from './base/BaseService';
import { Result, AsyncResult } from './types/result';
import { ServiceError, ErrorCode, Errors } from './types/errors';
import { hashPassword } from '../auth';

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  name?: string;
  password?: string;
  role?: 'ADMIN' | 'STAFF' | 'BROKER';
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  password?: string;
  role?: 'ADMIN' | 'STAFF' | 'BROKER';
}

export interface UserFilterDTO {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedUsers {
  users: User[];
  pagination: Pagination;
}

// Select fields to exclude password
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

class UserService extends BaseService implements ICrudService<User, CreateUserDTO, UpdateUserDTO, UserFilterDTO> {
  constructor(options: ServiceOptions = {}) {
    super(options);
  }

  async findById(id: string): AsyncResult<User | null> {
    return this.executeDbOperation(
      () => this.prisma.user.findUnique({
        where: { id },
        select: userSelect,
      }),
      'findById'
    );
  }

  async findAll(filter: UserFilterDTO = {}): AsyncResult<User[]> {
    const where = this.buildWhereClause(filter);

    return this.executeDbOperation(
      () => this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
      }),
      'findAll'
    );
  }

  async findPaginated(filter: UserFilterDTO = {}): AsyncResult<PaginatedUsers> {
    const { page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filter);

    return this.executeDbOperation(
      async () => {
        const [users, total] = await Promise.all([
          this.prisma.user.findMany({
            where,
            select: userSelect,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.user.count({ where }),
        ]);

        return {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      'findPaginated'
    );
  }

  async create(data: CreateUserDTO): AsyncResult<User> {
    // Validate email format
    const validation = this.validate(data, this.validateCreateInput);
    if (!validation.ok) return validation;

    // Hash password if provided
    const hashedPassword = data.password ? await hashPassword(data.password) : null;

    return this.executeDbOperation(
      () => this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          role: data.role || 'STAFF',
          isActive: true,
        },
        select: userSelect,
      }),
      'create'
    );
  }

  async update(id: string, data: UpdateUserDTO): AsyncResult<User> {
    // Hash password if provided
    const hashedPassword = data.password ? await hashPassword(data.password) : undefined;

    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (hashedPassword) updateData.password = hashedPassword;

    return this.executeDbOperation(
      () => this.prisma.user.update({
        where: { id },
        data: updateData,
        select: userSelect,
      }),
      'update'
    );
  }

  async delete(id: string): AsyncResult<boolean> {
    const result = await this.executeDbOperation(
      () => this.prisma.user.delete({ where: { id } }),
      'delete'
    );

    if (!result.ok) return result;
    return Result.ok(true);
  }

  async findByEmail(email: string): AsyncResult<User | null> {
    return this.executeDbOperation(
      () => this.prisma.user.findUnique({
        where: { email },
        select: userSelect,
      }),
      'findByEmail'
    );
  }

  async getActiveAdmins(): AsyncResult<Array<{ id: string; email: string; name: string | null }>> {
    return this.executeDbOperation(
      () => this.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true, email: true, name: true },
      }),
      'getActiveAdmins'
    );
  }

  // Private helpers
  private buildWhereClause(filter: UserFilterDTO): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filter.role && filter.role !== 'all') {
      where.role = filter.role;
    }

    if (filter.search?.trim()) {
      where.OR = [
        { name: { contains: filter.search.trim(), mode: 'insensitive' } },
        { email: { contains: filter.search.trim(), mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private validateCreateInput(data: CreateUserDTO): string | null {
    if (!data.email || !data.email.includes('@')) {
      return 'Valid email is required';
    }
    return null;
  }
}

// Singleton instance
const userService = new UserService();

// Export both the instance and class for flexibility
export { userService, UserService };

// Legacy function exports for backwards compatibility
export const getUsers = async (options: UserFilterDTO = {}) => {
  const result = await userService.findPaginated(options);
  if (!result.ok) throw result.error;
  return result.value;
};

export const createUser = async (userData: CreateUserDTO) => {
  const result = await userService.create(userData);
  if (!result.ok) throw result.error;
  return result.value;
};

export const getUserById = async (id: string) => {
  const result = await userService.findById(id);
  if (!result.ok) throw result.error;
  return result.value;
};

export const updateUser = async (id: string, data: UpdateUserDTO) => {
  const result = await userService.update(id, data);
  if (!result.ok) throw result.error;
  return result.value;
};

export const deleteUser = async (id: string) => {
  const result = await userService.delete(id);
  if (!result.ok) throw result.error;
  return result.value;
};

export const getActiveAdmins = async () => {
  const result = await userService.getActiveAdmins();
  if (!result.ok) throw result.error;
  return result.value;
};
