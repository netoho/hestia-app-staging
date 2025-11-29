/**
 * Policy Creation Wizard Schemas
 * Zod validation schemas for each step of the policy creation wizard
 */

import { z } from 'zod';
import { emailSchema } from '../shared/contact.schema';
import { PropertyType, GuarantorType, TenantType } from '@/lib/enums';

/**
 * Step 1: Property Information
 */
export const propertyStepSchema = z.object({
  policyNumber: z.string().min(1, 'Número de póliza requerido'),
  internalCode: z.string().optional(),
  propertyAddressDetails: z.any().optional().nullable(),
  propertyType: z.nativeEnum(PropertyType),
  propertyDescription: z.string().optional(),
  rentAmount: z.string().min(1, 'Monto de renta requerido').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Monto de renta debe ser mayor a 0'
  ),
  depositAmount: z.string().optional(),
  contractLength: z.number().min(1).default(12),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  endDate: z.string().min(1, 'Fecha de término requerida'),
  // Optional features
  parkingSpaces: z.number().min(0).default(0),
  parkingNumbers: z.string().optional(),
  isFurnished: z.boolean().default(false),
  hasPhone: z.boolean().default(false),
  hasElectricity: z.boolean().default(true),
  hasWater: z.boolean().default(true),
  hasGas: z.boolean().default(false),
  hasCableTV: z.boolean().default(false),
  hasInternet: z.boolean().default(false),
  utilitiesInLandlordName: z.boolean().default(false),
  // Financial details
  hasIVA: z.boolean().default(false),
  issuesTaxReceipts: z.boolean().default(false),
  securityDeposit: z.number().min(0).default(1),
  maintenanceFee: z.string().optional(),
  maintenanceIncludedInRent: z.boolean().default(false),
  rentIncreasePercentage: z.string().optional(),
  paymentMethod: z.string().default('bank_transfer'),
  // Additional
  hasInventory: z.boolean().default(false),
  hasRules: z.boolean().default(false),
  rulesType: z.string().optional(),
  petsAllowed: z.boolean().default(false),
  propertyDeliveryDate: z.string().optional(),
  contractSigningDate: z.string().optional(),
  contractSigningAddressDetails: z.any().optional().nullable(),
});

/**
 * Step 2: Pricing
 */
export const pricingStepSchema = z.object({
  packageId: z.string().min(1, 'Seleccione un paquete'),
  tenantPercentage: z.number().min(0).max(100),
  landlordPercentage: z.number().min(0).max(100),
  manualPrice: z.number().nullable().optional(),
  isManualOverride: z.boolean().default(false),
}).refine(
  (data) => Math.abs(data.tenantPercentage + data.landlordPercentage - 100) < 0.01,
  { message: 'Los porcentajes deben sumar 100%', path: ['tenantPercentage'] }
);

/**
 * Step 3: Landlord - Individual
 */
const landlordIndividualSchema = z.object({
  isCompany: z.literal(false),
  firstName: z.string().min(1, 'Nombre requerido'),
  middleName: z.string().optional(),
  paternalLastName: z.string().min(1, 'Apellido paterno requerido'),
  maternalLastName: z.string().optional(),
  email: emailSchema,
  phone: z.string().optional(),
  rfc: z.string().optional(),
});

/**
 * Step 3: Landlord - Company
 */
const landlordCompanySchema = z.object({
  isCompany: z.literal(true),
  companyName: z.string().min(1, 'Razón social requerida'),
  companyRfc: z.string().optional(),
  legalRepName: z.string().optional(),
  legalRepPosition: z.string().optional(),
  legalRepRfc: z.string().optional(),
  legalRepPhone: z.string().optional(),
  legalRepEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  email: emailSchema,
  phone: z.string().optional(),
});

export const landlordStepSchema = z.discriminatedUnion('isCompany', [
  landlordIndividualSchema,
  landlordCompanySchema,
]);

/**
 * Step 4: Tenant
 */
export const tenantStepSchema = z.object({
  tenantType: z.nativeEnum(TenantType).default(TenantType.INDIVIDUAL),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  paternalLastName: z.string().optional(),
  maternalLastName: z.string().optional(),
  companyName: z.string().optional(),
  email: emailSchema,
  phone: z.string().optional(),
  rfc: z.string().optional(),
});

/**
 * Step 5: Guarantors
 */
const actorEmailSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  paternalLastName: z.string().optional(),
  maternalLastName: z.string().optional(),
  email: emailSchema,
  phone: z.string().optional(),
});

export const guarantorStepSchema = z.discriminatedUnion('guarantorType', [
  z.object({
    guarantorType: z.literal(GuarantorType.NONE),
    jointObligors: z.array(actorEmailSchema).optional(),
    avals: z.array(actorEmailSchema).optional(),
  }),
  z.object({
    guarantorType: z.literal(GuarantorType.JOINT_OBLIGOR),
    jointObligors: z.array(actorEmailSchema).min(1, 'Agregue al menos un obligado solidario'),
    avals: z.array(actorEmailSchema).optional(),
  }),
  z.object({
    guarantorType: z.literal(GuarantorType.AVAL),
    jointObligors: z.array(actorEmailSchema).optional(),
    avals: z.array(actorEmailSchema).min(1, 'Agregue al menos un aval'),
  }),
  z.object({
    guarantorType: z.literal(GuarantorType.BOTH),
    jointObligors: z.array(actorEmailSchema).min(1, 'Agregue al menos un obligado solidario'),
    avals: z.array(actorEmailSchema).min(1, 'Agregue al menos un aval'),
  }),
]);

/**
 * Helper to get schema by step name
 */
export function getPolicyStepSchema(step: string) {
  switch (step) {
    case 'property':
      return propertyStepSchema;
    case 'pricing':
      return pricingStepSchema;
    case 'landlord':
      return landlordStepSchema;
    case 'tenant':
      return tenantStepSchema;
    case 'guarantors':
      return guarantorStepSchema;
    default:
      return z.object({});
  }
}

/**
 * Type exports
 */
export type PropertyStepData = z.infer<typeof propertyStepSchema>;
export type PricingStepData = z.infer<typeof pricingStepSchema>;
export type LandlordStepData = z.infer<typeof landlordStepSchema>;
export type TenantStepData = z.infer<typeof tenantStepSchema>;
export type GuarantorStepData = z.infer<typeof guarantorStepSchema>;
