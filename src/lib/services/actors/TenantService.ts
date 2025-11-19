/**
 * Tenant-specific service - Example implementation
 * Shows how easily we can create new actor services by extending BaseActorService
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import {
  PersonActorData,
  CompanyActorData,
  ActorData,
} from '@/lib/types/actor';
import { z } from 'zod';
import { personWithNationalitySchema } from '@/lib/validations/actors/person.schema';
import { companyActorSchema } from '@/lib/validations/actors/company.schema';
import { validateTenantToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import type { TenantWithRelations } from './types';

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
      references: true,
      commercialReferences: true,
      policy: true
    };
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
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<TenantWithRelations> {
    return this.saveActorData(tenantId, data, isPartial, skipValidation);
  }

  /**
   * Public save method required by base class
   */
  public async save(
    tenantId: string,
    data: ActorData,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<TenantWithRelations> {
    return this.saveTenantInformation(tenantId, data, isPartial, skipValidation);
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
      // Validate token
      const validation = await validateTenantToken(token);

      if (!validation.valid) {
        return Result.error(
          new ServiceError(
            ErrorCode.INVALID_TOKEN,
            validation.message || 'Invalid token',
            401
          )
        );
      }

      const { tenant } = validation;

      // Check token expiry
      if (tenant.tokenExpiry && tenant.tokenExpiry < new Date()) {
        return Result.error(
          new ServiceError(
            ErrorCode.TOKEN_EXPIRED,
            'Token expired',
            401
          )
        );
      }

      // For final submission, check if already complete
      if (!isPartial && tenant.informationComplete) {
        return Result.error(
          new ServiceError(
            ErrorCode.ALREADY_COMPLETE,
            'Information already submitted',
            400
          )
        );
      }

      // Prepare update data
      const updateData: any = {};

      // Handle all tenant fields
      if (data.tenantType !== undefined) updateData.tenantType = data.tenantType;

      // Individual name fields
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.middleName !== undefined) updateData.middleName = data.middleName || null;
      if (data.paternalLastName !== undefined) updateData.paternalLastName = data.paternalLastName;
      if (data.maternalLastName !== undefined) updateData.maternalLastName = data.maternalLastName;
      if (data.nationality !== undefined) updateData.nationality = data.nationality;
      if (data.curp !== undefined) updateData.curp = data.curp || null;
      if (data.rfc !== undefined) updateData.rfc = data.rfc || null;
      if (data.passport !== undefined) updateData.passport = data.passport || null;

      // Company fields
      if (data.companyName !== undefined) updateData.companyName = data.companyName;
      if (data.companyRfc !== undefined) updateData.companyRfc = data.companyRfc;
      if (data.legalRepFirstName !== undefined) updateData.legalRepFirstName = data.legalRepFirstName;
      if (data.legalRepMiddleName !== undefined) updateData.legalRepMiddleName = data.legalRepMiddleName || null;
      if (data.legalRepPaternalLastName !== undefined) updateData.legalRepPaternalLastName = data.legalRepPaternalLastName;
      if (data.legalRepMaternalLastName !== undefined) updateData.legalRepMaternalLastName = data.legalRepMaternalLastName;
      if (data.legalRepId !== undefined) updateData.legalRepId = data.legalRepId;
      if (data.legalRepPosition !== undefined) updateData.legalRepPosition = data.legalRepPosition;
      if (data.legalRepRfc !== undefined) updateData.legalRepRfc = data.legalRepRfc;
      if (data.legalRepPhone !== undefined) updateData.legalRepPhone = data.legalRepPhone;
      if (data.legalRepEmail !== undefined) updateData.legalRepEmail = data.legalRepEmail;

      // Contact fields
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.workPhone !== undefined) updateData.workPhone = data.workPhone;
      if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail;
      if (data.workEmail !== undefined) updateData.workEmail = data.workEmail;

      // Address
      if (data.currentAddress !== undefined) updateData.currentAddress = data.currentAddress;

      // Employment
      if (data.employmentStatus !== undefined) updateData.employmentStatus = data.employmentStatus;
      if (data.occupation !== undefined) updateData.occupation = data.occupation;
      if (data.employerName !== undefined) updateData.employerName = data.employerName;
      if (data.employerAddress !== undefined) updateData.employerAddress = data.employerAddress;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.monthlyIncome !== undefined) updateData.monthlyIncome = data.monthlyIncome;
      if (data.incomeSource !== undefined) updateData.incomeSource = data.incomeSource;

      // Rental history
      if (data.previousLandlordName !== undefined) updateData.previousLandlordName = data.previousLandlordName;
      if (data.previousLandlordPhone !== undefined) updateData.previousLandlordPhone = data.previousLandlordPhone;
      if (data.previousLandlordEmail !== undefined) updateData.previousLandlordEmail = data.previousLandlordEmail;
      if (data.previousRentAmount !== undefined) updateData.previousRentAmount = data.previousRentAmount;
      if (data.previousRentalAddress !== undefined) updateData.previousRentalAddress = data.previousRentalAddress;
      if (data.rentalHistoryYears !== undefined) updateData.rentalHistoryYears = data.rentalHistoryYears;

      // Payment
      if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
      if (data.requiresCFDI !== undefined) updateData.requiresCFDI = data.requiresCFDI;
      if (data.cfdiData !== undefined) updateData.cfdiData = data.cfdiData;

      // Additional info
      if (data.additionalInfo !== undefined) updateData.additionalInfo = data.additionalInfo;

      // If final submission, mark as complete and set verification status
      if (!isPartial) {
        updateData.informationComplete = true;
        updateData.completedAt = new Date();
        updateData.verificationStatus = 'PENDING';
      }

      // Update tenant in database
      const updatedTenant = await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: updateData,
        include: {
          addressDetails: true,
          employerAddressDetails: true,
          previousRentalAddressDetails: true,
          references: true,
          documents: true,
          policy: true
        }
      });

      // Handle address details if provided
      if (data.addressDetails) {
        const addressResult = await this.upsertAddress(
          data.addressDetails,
          updatedTenant.addressId
        );
        if (addressResult.ok && addressResult.value !== updatedTenant.addressId) {
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { addressId: addressResult.value }
          });
        }
      }

      // Handle employer address details
      if (data.employerAddressDetails) {
        const employerAddressResult = await this.upsertAddress(
          data.employerAddressDetails,
          updatedTenant.employerAddressId
        );
        if (employerAddressResult.ok && employerAddressResult.value !== updatedTenant.employerAddressId) {
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { employerAddressId: employerAddressResult.value }
          });
        }
      }

      // Handle previous rental address details
      if (data.previousRentalAddressDetails) {
        const previousRentalAddressResult = await this.upsertAddress(
          data.previousRentalAddressDetails,
          updatedTenant.previousRentalAddressId
        );
        if (previousRentalAddressResult.ok && previousRentalAddressResult.value !== updatedTenant.previousRentalAddressId) {
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { previousRentalAddressId: previousRentalAddressResult.value }
          });
        }
      }

      // Handle personal references if provided
      if (data.references && Array.isArray(data.references)) {
        await this.savePersonalReferences(tenant.id, data.references);
      }

      // Handle commercial references if provided (for company tenants)
      if (data.tenantType === 'COMPANY' && data.commercialReferences && Array.isArray(data.commercialReferences)) {
        await this.saveCommercialReferences(tenant.id, data.commercialReferences);
      }

      // Log activity
      await logPolicyActivity({
        policyId: updatedTenant.policyId,
        action: isPartial ? 'tenant_info_partial_save' : 'tenant_info_completed',
        description: isPartial
          ? 'El inquilino guardó información parcial'
          : 'El inquilino completó su información',
        performedById: tenant.id,
        performedByType: 'tenant',
        details: {
          tenantId: tenant.id,
          tenantType: updateData.tenantType || updatedTenant.tenantType,
        },
      });

      return Result.ok({
        success: true,
        message: isPartial
          ? 'Información guardada correctamente'
          : 'Información enviada correctamente',
        tenant: updatedTenant,
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
  async getTenantById(tenantId: string): AsyncResult<TenantWithRelations> {
    return this.getActorById(tenantId);
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

  /**
   * Delete a tenant from the database
   * Admin only operation
   */
  public async delete(tenantId: string): AsyncResult<void> {
    return this.deleteActor(tenantId);
  }

  /**
   * Validate tenant completeness for submission
   * Implements abstract method from BaseActorService
   */
  protected validateCompleteness(tenant: TenantWithRelations): Result<boolean> {
    const errors: string[] = [];
    const isCompany = tenant.tenantType === 'COMPANY';

    if (!isCompany) {
      // Person validation
      if (!tenant.firstName) errors.push('Nombre requerido');
      if (!tenant.paternalLastName) errors.push('Apellido paterno requerido');
      if (!tenant.maternalLastName) errors.push('Apellido materno requerido');
      if (!tenant.occupation) errors.push('Ocupación requerida');
      if (!tenant.employerName) errors.push('Nombre del empleador requerido');
      if (!tenant.monthlyIncome) errors.push('Ingreso mensual requerido');
    } else {
      // Company validation
      if (!tenant.companyName) errors.push('Razón social requerida');
      if (!tenant.companyRfc) errors.push('RFC de empresa requerido');
      if (!tenant.legalRepFirstName) errors.push('Nombre del representante requerido');
      if (!tenant.legalRepPaternalLastName) errors.push('Apellido paterno del representante requerido');
      if (!tenant.legalRepMaternalLastName) errors.push('Apellido materno del representante requerido');
    }

    // Common required fields
    if (!tenant.email) errors.push('Email requerido');
    if (!tenant.phone) errors.push('Teléfono requerido');
    if (!tenant.addressDetails) errors.push('Dirección requerida');

    // Check references (minimum 2)
    const referenceCount = tenant.personalReferences?.length ?? 0;
    const commercialRefCount = tenant.commercialReferences?.length ?? 0;
    if (referenceCount + commercialRefCount < 2) {
      errors.push('Mínimo 2 referencias requeridas');
    }

    if (errors.length > 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Información incompleta',
          400,
          { missingFields: errors }
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

    // Using DocumentCategory enum values
    const requiredDocs: any[] = isCompany
      ? ['ACTA_CONSTITUTIVA', 'COMPROBANTE_DOMICILIO', 'CONSTANCIA_SITUACION_FISCAL']
      : ['IDENTIFICACION', 'COMPROBANTE_DOMICILIO', 'COMPROBANTE_INGRESOS'];

    const uploadedDocs = await this.prisma.actorDocument.findMany({
      where: {
        tenantId,
        category: { in: requiredDocs }
      },
      select: { category: true }
    });

    const uploadedCategories = new Set(uploadedDocs.map(d => d.category));
    const missingDocs = requiredDocs.filter((doc: any) => !uploadedCategories.has(doc));

    if (missingDocs.length > 0) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Faltan documentos requeridos',
          400,
          { missingDocuments: missingDocs }
        )
      );
    }

    return Result.ok(true);
  }
}
