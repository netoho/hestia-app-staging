/**
 * Tenant-specific service - Example implementation
 * Shows how easily we can create new actor services by extending BaseActorService
 */

import { PrismaClient } from '@prisma/client';
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import {
  PersonActorData,
  CompanyActorData,
} from '@/lib/types/actor';
import { z } from 'zod';
import { personWithNationalitySchema } from '@/lib/validations/actors/person.schema';
import { companyActorSchema } from '@/lib/validations/actors/company.schema';
import { validateTenantToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';

// Tenant-specific validation schemas
const tenantPersonSchema = personWithNationalitySchema.extend({
  // Tenant-specific fields
  previousAddress: z.string().optional(),
  previousLandlordName: z.string().optional(),
  previousLandlordPhone: z.string().optional(),
  reasonForMoving: z.string().optional(),
  numberOfOccupants: z.number().int().positive().optional(),
  hasPets: z.boolean().default(false),
  petDescription: z.string().optional(),
});

const tenantCompanySchema = companyActorSchema.extend({
  // Company tenant-specific fields
  businessType: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  yearsInBusiness: z.number().positive().optional(),
});

export class TenantService extends BaseActorService {
  constructor(prisma?: PrismaClient) {
    super('tenant', prisma);
  }

  /**
   * Validate person tenant data
   */
  validatePersonData(data: PersonActorData, isPartial: boolean = false): Result<PersonActorData> {
    const schema = isPartial ? tenantPersonSchema.partial() : tenantPersonSchema;
    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid person tenant data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as PersonActorData);
  }

  /**
   * Validate company tenant data
   */
  validateCompanyData(data: CompanyActorData, isPartial: boolean = false): Result<CompanyActorData> {
    const schema = isPartial ? tenantCompanySchema.partial() : tenantCompanySchema;
    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid company tenant data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as CompanyActorData);
  }

  /**
   * Save tenant information
   */
  async saveTenantInformation(
    tenantId: string,
    data: any,
    isPartial: boolean = false
  ): AsyncResult<any> {
    return this.saveActorData('tenant', tenantId, data, isPartial);
  }

  /**
   * Validate token and save tenant submission
   */
  async validateAndSave(
    token: string,
    data: any,
    isPartial: boolean = false
  ): AsyncResult<any> {
    try {
      // Validate token (you would need to implement validateTenantToken)
      // This is just an example structure
      const tokenValidation = { valid: true, tenant: { id: 'test', policyId: 'test' } };

      if (!tokenValidation.valid || !tokenValidation.tenant) {
        return Result.error(
          new ServiceError(
            ErrorCode.UNAUTHORIZED,
            'Invalid token',
            401
          )
        );
      }

      // Validate and save tenant data
      const result = await this.saveTenantInformation(
        tokenValidation.tenant.id,
        data.tenant,
        isPartial
      );

      if (!result.ok) {
        return result;
      }

      // Log activity
      await logPolicyActivity({
        policyId: tokenValidation.tenant.policyId,
        action: isPartial ? 'tenant_info_partial_save' : 'tenant_info_completed',
        description: isPartial
          ? 'El inquilino guardó información parcial'
          : 'El inquilino completó su información',
        performedById: tokenValidation.tenant.id,
        performedByType: 'tenant',
        details: {
          tenantId: tokenValidation.tenant.id,
          isCompany: data.tenant.isCompany,
        },
      });

      return Result.ok({
        success: true,
        message: 'Información actualizada correctamente',
        tenant: result.value,
      });
    } catch (error) {
      this.log('error', 'Tenant submission error', error);
      return Result.error(
        new ServiceError(
          ErrorCode.INTERNAL_ERROR,
          'Error processing tenant submission',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): AsyncResult<any> {
    return this.getActorById('tenant', tenantId);
  }

  /**
   * Get tenant references
   */
  async getTenantReferences(tenantId: string): AsyncResult<any[]> {
    return this.executeDbOperation(async () => {
      const references = await this.prisma.reference.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      return references;
    }, 'getTenantReferences');
  }

  /**
   * Add tenant reference
   */
  async addReference(
    tenantId: string,
    referenceData: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    }
  ): AsyncResult<any> {
    return this.executeDbOperation(async () => {
      const reference = await this.prisma.reference.create({
        data: {
          tenantId,
          ...referenceData,
        },
      });

      this.log('info', 'Reference added', { tenantId, referenceId: reference.id });
      return reference;
    }, 'addReference');
  }

  /**
   * Verify tenant employment
   */
  async verifyEmployment(tenantId: string): AsyncResult<boolean> {
    const tenantResult = await this.getTenantById(tenantId);
    if (!tenantResult.ok) {
      return Result.ok(false);
    }

    const tenant = tenantResult.value;

    // Check if employment information is complete
    const hasEmploymentInfo = !!(
      tenant.occupation &&
      tenant.employerName &&
      tenant.monthlyIncome
    );

    // You could add more sophisticated verification logic here
    // like calling external APIs or checking documents

    return Result.ok(hasEmploymentInfo);
  }
}