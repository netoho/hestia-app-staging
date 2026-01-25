/**
 * Tenant-specific service - Refactored with master schema
 * Uses single source of truth for validation and data transformation
 */

import { PrismaClient, Prisma } from "@/prisma/generated/prisma-client/client";
import { getRequiredDocuments } from '@/lib/constants/actorDocumentRequirements';
import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import {
  PersonActorData,
  CompanyActorData,
  ActorData,
} from '@/lib/types/actor';
import {
  validateTenantData,
  getTenantSchema,
  ValidationMode,
  TENANT_VALIDATION_MESSAGES,
} from '@/lib/schemas/tenant';
import {
  prepareTenantForDB,
  prepareReferencesForDB,
} from '@/lib/utils/tenant/prepareForDB';
import { validateTenantToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import type { TenantWithRelations } from './types';

export class TenantService extends BaseActorService<TenantWithRelations, ActorData> {
  constructor(prisma?: PrismaClient) {
    super('tenant', prisma);
  }

  /**
   * Get the Prisma delegate for tenant operations
   */
  protected getPrismaDelegate(tx?: any): Prisma.TenantDelegate {
    return (tx || this.prisma).tenant;
  }

  /**
   * Get includes for tenant queries
   */
  protected getIncludes(): Record<string, boolean | object> {
    return {
      addressDetails: true,
      employerAddressDetails: true,
      previousRentalAddressDetails: true,
      personalReferences: true,
      commercialReferences: true,
      policy: true
    };
  }

  /**
   * Build update data object from actor data
   * Now uses prepareTenantForDB for consistent transformation
   */
  protected buildUpdateData(data: Partial<ActorData>, addressId?: string): any {
    // Use the new transformation utility
    const tenantType = data.tenantType || (data.isCompany ? 'COMPANY' : 'INDIVIDUAL');
    const prepared = prepareTenantForDB(data, {
      tenantType: tenantType as 'INDIVIDUAL' | 'COMPANY',
      isPartial: true,
    });

    // Add address ID if provided
    if (addressId) {
      prepared.addressId = addressId;
    }

    return prepared;
  }

  /**
   * Validate person tenant data using master schema
   */
  validatePersonData(data: Partial<PersonActorData>, isPartial: boolean = false): Result<PersonActorData> {
    const mode: ValidationMode = isPartial ? 'partial' : 'strict';
    const result = validateTenantData(data, { tenantType: 'INDIVIDUAL', mode });
    return this.wrapZodValidation(result, 'Invalid person tenant data') as Result<PersonActorData>;
  }

  /**
   * Validate company tenant data using master schema
   */
  validateCompanyData(data: Partial<CompanyActorData>, isPartial: boolean = false): Result<CompanyActorData> {
    const mode: ValidationMode = isPartial ? 'partial' : 'strict';
    const result = validateTenantData(data, { tenantType: 'COMPANY', mode });
    return this.wrapZodValidation(result, 'Invalid company tenant data') as Result<CompanyActorData>;
  }

  /**
   * Public save method required by base class
   * Now uses master schema validation and prepareForDB
   */
  public async save(
    tenantId: string,
    data: Partial<ActorData>,
    isPartial: boolean = false,
    skipValidation: boolean = false,
    tabName?: string
  ): AsyncResult<TenantWithRelations> {
    try {
      const tenant = await this.getById(tenantId);
      if (!tenant.ok) return tenant;

      const tenantType = tenant.value.tenantType || 'INDIVIDUAL';

      // Validate unless explicitly skipped (admin mode)
      if (!skipValidation) {
        const mode: ValidationMode = isPartial ? 'partial' : 'strict';
        const validation = validateTenantData(data, {
          tenantType,
          mode,
          tabName,
        });

        if (!validation.success) {
          return Result.error(
            new ServiceError(
              ErrorCode.VALIDATION_ERROR,
              'Validation failed',
              400,
              { errors: this.formatZodErrors(validation.error) }
            )
          );
        }
      }

      // Transform data for database
      const dbData = prepareTenantForDB(data, {
        tenantType,
        isPartial,
        tabName,
      });

      // Handle address relations if needed
      if (dbData.addressDetails) {
        const addressResult = await this.upsertAddress(
          dbData.addressDetails,
          tenant.value.addressId
        );
        if (addressResult.ok) {
          dbData.addressId = addressResult.value;
          delete dbData.addressDetails;
        }
      }

      if (dbData.employerAddressDetails) {
        const addressResult = await this.upsertAddress(
          dbData.employerAddressDetails,
          tenant.value.employerAddressId
        );
        if (addressResult.ok) {
          dbData.employerAddressId = addressResult.value;
          delete dbData.employerAddressDetails;
        }
      }

      if (dbData.previousRentalAddressDetails) {
        const addressResult = await this.upsertAddress(
          dbData.previousRentalAddressDetails,
          tenant.value.previousRentalAddressId
        );
        if (addressResult.ok) {
          dbData.previousRentalAddressId = addressResult.value;
          delete dbData.previousRentalAddressDetails;
        }
      }

      // Update tenant in database
      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: dbData,
        include: this.getIncludes(),
      });

      return Result.ok(updated as TenantWithRelations);
    } catch (error) {
      this.log('error', 'Tenant save error', error);
      return Result.error(
        new ServiceError(
          ErrorCode.INTERNAL_ERROR,
          'Error saving tenant data',
          500,
          { error: (error as Error).message }
        )
      );
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): AsyncResult<TenantWithRelations> {
    return this.getActorById(tenantId);
  }

  /**
   * Get tenant by policy ID
   */
  async getByPolicyId(policyId: string): AsyncResult<TenantWithRelations> {
    return this.executeDbOperation(async () => {
      const tenant = await this.prisma.tenant.findFirst({
        where: { policyId },
        include: this.getIncludes()
      });

      if (!tenant) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          'Tenant not found for policy',
          404
        );
      }

      return tenant as TenantWithRelations;
    }, 'getByPolicyId');
  }

  /**
   * Create a new tenant
   */
  async create(data: any): AsyncResult<TenantWithRelations> {
    return this.executeTransaction(async (tx) => {
      // Determine tenant type
      const tenantType = data.tenantType || (data.companyName ? 'COMPANY' : 'INDIVIDUAL');

      // Prepare data for creation
      const createData = prepareTenantForDB(
        {
          ...data,
          tenantType,
        },
        {
          tenantType,
          isPartial: true, // Allow partial for initial creation
        }
      );

      const tenant = await tx.tenant.create({
        data: {
          policyId: data.policyId,
          ...createData,
        },
        include: this.getIncludes()
      });

      return tenant as TenantWithRelations;
    });
  }

  /**
   * Get tenant references
   */
  async getTenantReferences(tenantId: string): AsyncResult<any[]> {
    return this.executeDbOperation(async () => {
      const references = await this.prisma.personalReference.findMany({
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
      // Split name into components (best effort)
      const nameParts = referenceData.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const paternalLastName = nameParts.length > 1 ? nameParts[1] : '';
      const maternalLastName = nameParts.length > 2 ? nameParts.slice(2).join(' ') : '';

      const reference = await this.prisma.personalReference.create({
        data: {
          tenantId,
          firstName,
          paternalLastName,
          maternalLastName,
          relationship: referenceData.relationship,
          phone: referenceData.phone,
          email: referenceData.email,
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

    return Result.ok(hasEmploymentInfo);
  }

  /**
   * Delete a tenant from the database
   * Admin only operation
   */
  public async delete(tenantId: string): AsyncResult<void> {
    return this.deleteActor(tenantId);
  }

  /**
   * Validate tenant completeness for submission
   * Uses master schema for validation
   */
  protected validateCompleteness(tenant: TenantWithRelations): Result<boolean> {
    const tenantType = tenant.tenantType || 'INDIVIDUAL';

    // Use strict validation mode for completeness check
    const validation = validateTenantData(tenant, {
      tenantType,
      mode: 'strict',
    });

    if (!validation.success) {
      const errors = this.formatZodErrors(validation.error);
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Información incompleta',
          400,
          { missingFields: errors }
        )
      );
    }

    // Check references minimum requirement
    const referenceCount = tenant.personalReferences?.length ?? 0;
    const commercialRefCount = tenant.commercialReferences?.length ?? 0;
    const totalRefs = referenceCount + commercialRefCount;

    if (tenantType === 'COMPANY' && commercialRefCount < 1) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Mínimo 1 referencia comercial requerida',
          400
        )
      );
    } else if (tenantType === 'INDIVIDUAL' && referenceCount < 1) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Mínimo 1 referencia personal requerida',
          400
        )
      );
    }

    return Result.ok(true);
  }

  /**
   * Validate required documents are uploaded
   * Implements abstract method from BaseActorService
   */
  protected async validateRequiredDocuments(tenantId: string): AsyncResult<boolean> {
    const tenant = await this.getById(tenantId);
    if (!tenant.ok) return tenant;

    const isCompany = tenant.value.tenantType === 'COMPANY';
    const nationality = tenant.value.nationality;

    const requiredDocs = getRequiredDocuments('tenant', isCompany, {
      nationality: nationality as 'MEXICAN' | 'FOREIGN' | undefined,
    });

    const uploadedDocs = await this.prisma.actorDocument.findMany({
      where: {
        tenantId,
        category: { in: requiredDocs.map(d => d.category) },
        uploadStatus: 'complete',
      },
      select: { category: true }
    });

    const uploadedCategories = new Set(uploadedDocs.map(d => d.category));
    const missingDocs = requiredDocs.filter(d => !uploadedCategories.has(d.category as DocumentCategory));

    if (missingDocs.length > 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Faltan documentos requeridos',
          400,
          { missingDocuments: missingDocs.map(d => d.category) }
        )
      );
    }

    return Result.ok(true);
  }
}
