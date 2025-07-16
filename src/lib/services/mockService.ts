/**
 * Mock Service Layer
 * 
 * This service provides a read-only mock implementation when MOCK_ENABLED is true.
 * It uses the seed data and simulates API responses without actual database operations.
 * All mutations (create, update, delete) will succeed but won't persist changes.
 */

import { isMockEnabled } from '../env-check';
import { MockDataService } from './mockDataService';

// Decorator to check if mock mode is enabled
export function withMockCheck<T extends (...args: any[]) => any>(
  mockImplementation: T,
  realImplementation: T
): T {
  return ((...args: Parameters<T>) => {
    if (isMockEnabled()) {
      console.log(`Mock mode enabled for ${realImplementation.name || 'function'}`);
      return mockImplementation(...args);
    }
    return realImplementation(...args);
  }) as T;
}

// Mock implementations that return success without mutations
export const mockMutations = {
  // Create operations return the input with generated ID
  create: (entity: string) => async (data: any) => {
    console.log(`Mock: Creating ${entity}`, data);
    return {
      ...data,
      id: `mock-${entity}-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  // Update operations return the updated data
  update: (entity: string) => async (id: string, data: any) => {
    console.log(`Mock: Updating ${entity} ${id}`, data);
    const existing = await MockDataService[`get${entity}ById`]?.(id);
    if (!existing) return null;
    
    return {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
  },

  // Delete operations always succeed
  delete: (entity: string) => async (id: string) => {
    console.log(`Mock: Deleting ${entity} ${id}`);
    const existing = await MockDataService[`get${entity}ById`]?.(id);
    return !!existing;
  },
};

// Helper to create consistent mock responses
export const createMockResponse = <T>(data: T, message?: string) => {
  return {
    success: true,
    data,
    message: message || 'Mock operation successful',
  };
};

// Helper to simulate API delays
export const simulateDelay = async (ms: number = 100) => {
  if (isMockEnabled()) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
};