/**
 * Tenant-specific service - Refactored with master schema
 * Uses single source of truth for validation and data transformation
 */

import { PrismaClient, Prisma } from "@/prisma/generated/prisma-client/client";
import { getRequiredDocuments } from '@/lib/constants/actorDocumentRequirements';
import {
  DocumentCategory,
  DocumentUploadStatus,
  PolicyStatus,
  TenantType,
} from "@/prisma/generated/prisma-client/enums";
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
  ValidationMode,
} from '@/lib/domain/tenant/schema';
import { tenantSelect } from '@/lib/domain/tenant/select';
import { toDb as tenantToDb } from '@/lib/domain/tenant/adapters/db';
import { validateTenantToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { archiveAndCleanupTenant } from '@/lib/services/policyService/actorArchive';
import type { TenantWithRelations } from './types';

/**
 * Admin may change tenant membership (add/remove) only before the
 * protección is active (S5b #169).
 */
const TENANT_MEMBERSHIP_EDITABLE_STATUSES: PolicyStatus[] = [
  PolicyStatus.COLLECTING_INFO,
  PolicyStatus.PENDING_APPROVAL,
];

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
   * Get includes for tenant queries.
   * Delegates to the centralized `tenantSelect` constant — the single
   * source of truth for "what gets loaded with a tenant" lives in
   * `src/lib/domain/tenant/select.ts`.
   */
  protected getIncludes(): Record<string, boolean | object> {
    return tenantSelect as unknown as Record<string, boolean | object>;
  }

  /**
   * Build update data object from actor data.
   * Delegates to the canonical tenant DB adapter; the adapter parses
   * through the canonical schema and normalizes types. If the adapter
   * rejects, we surface an empty payload so the caller's transaction
   * fails fast at the Prisma layer with a clear error (rather than
   * swallowing the validation issue here).
   */
  protected buildUpdateData(data: Partial<ActorData>, addressId?: string): any {
    const tenantType =
      data.tenantType ||
      ((data as Record<string, unknown>).isCompany ? 'COMPANY' : 'INDIVIDUAL');
    const result = tenantToDb(data, {
      tenantType: tenantType as 'INDIVIDUAL' | 'COMPANY',
      isPartial: true,
    });

    if (!result.ok) {
      this.log('error', 'Tenant buildUpdateData adapter rejected input', result.error);
      return {};
    }

    const prepared = result.value as Record<string, unknown>;
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
   * Public save method required by base class.
   * Now routes through the canonical tenant DB adapter — `toDb`
   * parses through `tenantSchema` and normalizes the payload.
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

      // Validate unless explicitly skipped (admin mode). When skipping,
      // we still want a clean payload, so we forward the loose-mode
      // path (`isPartial: true`) through the adapter which transforms
      // without rejecting on missing fields.
      const adapterResult = tenantToDb(data, {
        tenantType,
        isPartial: skipValidation ? true : isPartial,
        tabName,
      });

      if (!adapterResult.ok) {
        return Result.error(adapterResult.error);
      }

      const dbData = adapterResult.value as Record<string, unknown>;

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
   * Get ALL tenants for a policy (S5b #169 — a policy has 1..N tenants).
   * Display order is createdAt asc; card numbering ("Inquilino N")
   * derives from this order — there is no primary tenant.
   */
  async getAllByPolicyId(policyId: string): AsyncResult<TenantWithRelations[]> {
    return this.executeDbOperation(async () => {
      const tenants = await this.prisma.tenant.findMany({
        where: { policyId },
        include: this.getIncludes(),
        orderBy: { createdAt: 'asc' },
      });

      return tenants as TenantWithRelations[];
    }, 'getAllByPolicyId');
  }

  /**
   * Create an empty co-tenant row on a policy (admin-only surface,
   * S5b #169 — mirrors LandlordService.addCoOwner). The new tenant
   * completes their own record through their own portal link.
   */
  async addTenant(policyId: string): AsyncResult<TenantWithRelations> {
    // Guards live OUTSIDE executeDbOperation — it wraps any throw into a
    // generic database ServiceError, losing the typed code/status.
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, status: true },
    });
    if (!policy) {
      return Result.error(new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404));
    }

    if (!TENANT_MEMBERSHIP_EDITABLE_STATUSES.includes(policy.status)) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Solo se pueden agregar inquilinos antes de que la protección esté activa',
          400,
        ),
      );
    }

    return this.executeDbOperation(async () => {
      const tenant = await this.prisma.tenant.create({
        // email/phone are REQUIRED columns; the co-tenant arrives empty
        // by design and fills their own record via their portal link.
        data: {
          policyId,
          tenantType: TenantType.INDIVIDUAL,
          email: '',
          phone: '',
        },
        include: this.getIncludes(),
      });

      this.log('info', 'Co-tenant added', { policyId, tenantId: tenant.id });
      return tenant as TenantWithRelations;
    }, 'addTenant');
  }

  /**
   * Remove a tenant from a policy (admin-only surface, S5b #169).
   * Unlike landlord co-owner removal, this is NOT a hard delete: the
   * tenant is archived to TenantHistory (summary + full snapshot via
   * archiveAndCleanupTenant) before the row is deleted. Refuses to
   * remove the last tenant — every policy keeps at least one.
   */
  async removeTenant(
    tenantId: string,
    opts: { removedById: string; reason?: string },
  ): AsyncResult<void> {
    // Guards live OUTSIDE executeDbOperation (see addTenant).
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, policyId: true, policy: { select: { status: true } } },
    });
    if (!tenant) {
      return Result.error(new ServiceError(ErrorCode.NOT_FOUND, 'Tenant not found', 404));
    }

    if (!TENANT_MEMBERSHIP_EDITABLE_STATUSES.includes(tenant.policy.status)) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Solo se pueden eliminar inquilinos antes de que la protección esté activa',
          400,
        ),
      );
    }

    const count = await this.prisma.tenant.count({
      where: { policyId: tenant.policyId },
    });
    if (count <= 1) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'No se puede eliminar al único inquilino de la protección',
          400,
        ),
      );
    }

    // executeTransaction (unlike executeDbOperation) passes ServiceErrors
    // through verbatim, so archive failures keep their typed code/status.
    const result = await this.executeTransaction(async (tx) => {
      // TenantReceipt.tenantId cascades on tenant delete — re-stamp this
      // tenant's uploads to a remaining co-tenant so already-satisfied
      // months survive. Receipts are policy-scoped; tenantId is non-semantic
      // uploader attribution. A survivor always exists (count>1 guard above).
      const survivor = await tx.tenant.findFirst({
        where: { policyId: tenant.policyId, id: { not: tenantId } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (survivor) {
        await tx.tenantReceipt.updateMany({
          where: { tenantId },
          data: { tenantId: survivor.id },
        });
      }
      await archiveAndCleanupTenant(tx, tenantId, {
        policyId: tenant.policyId,
        replacedById: opts.removedById,
        replacementReason: opts.reason?.trim() || 'Eliminado por administrador',
      });
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    if (!result.ok) return result;

    this.log('info', 'Tenant removed', { tenantId, policyId: tenant.policyId });
    return Result.ok(undefined);
  }

  /**
   * Create a new tenant.
   * Routes through the canonical tenant DB adapter for consistent
   * transformation.
   */
  async create(data: any): AsyncResult<TenantWithRelations> {
    return this.executeTransaction(async (tx) => {
      const tenantType = data.tenantType || (data.companyName ? 'COMPANY' : 'INDIVIDUAL');

      const adapterResult = tenantToDb(
        { ...data, tenantType },
        { tenantType, isPartial: true },
      );

      if (!adapterResult.ok) {
        throw adapterResult.error;
      }

      const createData = adapterResult.value as Record<string, unknown>;

      const tenant = await tx.tenant.create({
        data: {
          policyId: data.policyId,
          ...createData,
        } as Prisma.TenantUncheckedCreateInput,
        include: this.getIncludes(),
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
        uploadStatus: DocumentUploadStatus.COMPLETE,
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
