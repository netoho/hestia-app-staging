/**
 * Export all actor services
 */

export { BaseActorService } from './BaseActorService';
export { LandlordService } from './LandlordService';
export { TenantService } from './TenantService';
export { AvalService } from './AvalService';
export { JointObligorService } from './JointObligorService';

// Import services for factory
import { LandlordService } from './LandlordService';
import { TenantService } from './TenantService';
import { AvalService } from './AvalService';
import { JointObligorService } from './JointObligorService';
import { ServiceError, ErrorCode } from '../types/errors';

// Service instances (singleton pattern)
const landlordService = new LandlordService();
const tenantService = new TenantService();
const avalService = new AvalService();
const jointObligorService = new JointObligorService();

/**
 * Factory function to get the appropriate service for an actor type
 * @param type The actor type ('tenant' | 'landlord' | 'joint-obligor' | 'aval')
 * @returns The corresponding service instance
 * @throws Error if invalid actor type
 */
export function getServiceForType(type: string) {
  switch(type) {
    case 'tenant':
      return tenantService;
    case 'landlord':
      return landlordService;
    case 'joint-obligor':
      return jointObligorService;
    case 'aval':
      return avalService;
    default:
      throw new ServiceError(ErrorCode.VALIDATION_ERROR, `Invalid actor type: ${type}`, 400, { type });
  }
}