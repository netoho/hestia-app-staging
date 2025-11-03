import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

// RFC validation patterns
const RFC_INDIVIDUAL_PATTERN = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
const RFC_COMPANY_PATTERN = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;

// CURP validation pattern
const CURP_PATTERN = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/;

// CLABE validation (18 digits)
const CLABE_PATTERN = /^[0-9]{18}$/;

// Email validation
const emailSchema = z.string().email('Email inválido');

// Phone validation (10 digits)
const phoneSchema = z.string()
  .transform(val => val.replace(/\D/g, ''))
  .refine(val => val.length === 10, 'El teléfono debe tener 10 dígitos');

// Personal reference schema
export const personalReferenceSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
  phone: phoneSchema,
  email: emailSchema.optional().nullable(),
  relationship: z.string().min(1, 'Relación es requerida'),
  occupation: z.string().optional().nullable(),
});

// ============================================
// LANDLORD SCHEMAS
// ============================================

const baseLandlordSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().min(1, 'Dirección es requerida'),

  // Bank information (optional)
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string()
    .optional()
    .nullable()
    .refine(val => !val || CLABE_PATTERN.test(val), 'CLABE debe tener 18 dígitos'),

  informationComplete: z.boolean().optional(),
});

// Individual landlord schema
export const individualLandlordSchema = baseLandlordSchema.extend({
  isCompany: z.literal(false),
  rfc: z.string()
    .min(1, 'RFC es requerido')
    .refine(val => RFC_INDIVIDUAL_PATTERN.test(val), 'RFC de persona física inválido (formato: AAAA123456XXX)'),

  // Work information (optional for individuals)
  occupation: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  monthlyIncome: z.number().positive().optional().nullable(),
});

// Company landlord schema
export const companyLandlordSchema = baseLandlordSchema.extend({
  isCompany: z.literal(true),
  companyName: z.string().min(1, 'Razón social es requerida'),
  rfc: z.string()
    .min(1, 'RFC es requerido')
    .refine(val => RFC_COMPANY_PATTERN.test(val), 'RFC de empresa inválido (formato: AAA123456XXX)'),

  // Legal representative fields
  legalRepFirstName: z.string().min(1, 'Nombre del representante es requerido'),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().min(1, 'Apellido paterno del representante es requerido'),
  legalRepMaternalLastName: z.string().min(1, 'Apellido materno del representante es requerido'),

  // Company doesn't need work info
  occupation: z.string().optional().nullable(),
  monthlyIncome: z.number().optional().nullable(),
});

// Combined landlord schema with discriminated union
export const landlordSchema = z.discriminatedUnion('isCompany', [
  individualLandlordSchema,
  companyLandlordSchema,
]);

// For partial updates
export const landlordUpdateSchema = z.object({
  isCompany: z.boolean().optional(),
  firstName: z.string().min(1).optional(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1).optional(),
  maternalLastName: z.string().min(1).optional(),
  companyName: z.string().optional().nullable(),
  legalRepFirstName: z.string().optional().nullable(),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().optional().nullable(),
  legalRepMaternalLastName: z.string().optional().nullable(),
  rfc: z.string().optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().min(1).optional(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  monthlyIncome: z.number().positive().optional().nullable(),
  informationComplete: z.boolean().optional(),
}).refine(data => {
  // Validate RFC format if provided
  if (data.rfc) {
    const pattern = data.isCompany ? RFC_COMPANY_PATTERN : RFC_INDIVIDUAL_PATTERN;
    return pattern.test(data.rfc);
  }
  return true;
}, {
  message: 'Formato de RFC inválido',
  path: ['rfc'],
});

// ============================================
// TENANT SCHEMAS
// ============================================

const baseTenantSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  informationComplete: z.boolean().optional(),
  additionalInfo: z.string().optional().nullable(),
});

// Individual tenant schema - base without refinements
const individualTenantSchemaBase = baseTenantSchema.extend({
  tenantType: z.literal('INDIVIDUAL'),
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
  nationality: z.enum(['MEXICAN', 'FOREIGN']),
  curp: z.string().optional().nullable(),
  rfc: z.string().optional().nullable(),
  passport: z.string().optional().nullable(),

  // Employment information
  employmentStatus: z.string().min(1, 'Situación laboral es requerida'),
  occupation: z.string().min(1, 'Ocupación es requerida'),
  employerName: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().positive('Ingreso mensual debe ser mayor a 0'),
  incomeSource: z.string().optional().nullable(),

  // Company fields should be null for individuals
  companyName: z.string().optional().nullable(),
  companyRfc: z.string().optional().nullable(),
  legalRepFirstName: z.string().optional().nullable(),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().optional().nullable(),
  legalRepMaternalLastName: z.string().optional().nullable(),
  legalRepId: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
});

// Individual tenant schema with refinements
export const individualTenantSchema = individualTenantSchemaBase.refine(data => {
  // Validate based on nationality
  if (data.nationality === 'MEXICAN') {
    return !data.curp || CURP_PATTERN.test(data.curp);
  }
  return true;
}, {
  message: 'CURP inválido',
  path: ['curp'],
}).refine(data => {
  // If Mexican, CURP is required
  if (data.nationality === 'MEXICAN' && !data.curp) {
    return false;
  }
  // If foreign, passport is required
  if (data.nationality === 'FOREIGN' && !data.passport) {
    return false;
  }
  return true;
}, {
  message: 'CURP es requerido para mexicanos, pasaporte para extranjeros',
});

// Company tenant schema
export const companyTenantSchema = baseTenantSchema.extend({
  tenantType: z.literal('COMPANY'),
  companyName: z.string().min(1, 'Razón social es requerida'),
  companyRfc: z.string()
    .min(1, 'RFC es requerido')
    .refine(val => RFC_COMPANY_PATTERN.test(val), 'RFC de empresa inválido'),
  legalRepFirstName: z.string().min(1, 'Nombre del representante es requerido'),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().min(1, 'Apellido paterno del representante es requerido'),
  legalRepMaternalLastName: z.string().min(1, 'Apellido materno del representante es requerido'),
  legalRepId: z.string().min(1, 'Identificación del representante es requerida'),
  companyAddress: z.string().min(1, 'Dirección de la empresa es requerida'),

  // Individual fields should be null for companies
  firstName: z.string().optional().nullable(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().optional().nullable(),
  maternalLastName: z.string().optional().nullable(),
  nationality: z.enum(['MEXICAN', 'FOREIGN']).optional().nullable(),
  curp: z.string().optional().nullable(),
  rfc: z.string().optional().nullable(),
  passport: z.string().optional().nullable(),
  employmentStatus: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  employerName: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().optional().nullable(),
  incomeSource: z.string().optional().nullable(),
});

// Combined tenant schema - use individualTenantSchema or companyTenantSchema directly instead
// export const tenantSchema = z.discriminatedUnion('tenantType', [
//   individualTenantSchema,
//   companyTenantSchema,
// ]);

// For partial updates
export const tenantUpdateSchema = baseTenantSchema.partial().extend({
  tenantType: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
  firstName: z.string().optional().nullable(),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().optional().nullable(),
  maternalLastName: z.string().optional().nullable(),
  nationality: z.enum(['MEXICAN', 'FOREIGN']).optional(),
  curp: z.string().optional().nullable(),
  rfc: z.string().optional().nullable(),
  passport: z.string().optional().nullable(),
  employmentStatus: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  employerName: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  monthlyIncome: z.number().positive().optional().nullable(),
  incomeSource: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyRfc: z.string().optional().nullable(),
  legalRepFirstName: z.string().optional().nullable(),
  legalRepMiddleName: z.string().optional().nullable(),
  legalRepPaternalLastName: z.string().optional().nullable(),
  legalRepMaternalLastName: z.string().optional().nullable(),
  legalRepId: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
});

// ============================================
// JOINT OBLIGOR SCHEMA
// ============================================

const jointObligorSchemaBase = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
  email: emailSchema,
  phone: phoneSchema,
  nationality: z.enum(['MEXICAN', 'FOREIGN']),
  curp: z.string().optional().nullable(),
  rfc: z.string().optional().nullable(),
  passport: z.string().optional().nullable(),
  address: z.string().optional().nullable(),

  // Employment information
  employmentStatus: z.string().min(1, 'Situación laboral es requerida'),
  occupation: z.string().min(1, 'Ocupación es requerida'),
  companyName: z.string().min(1, 'Nombre de empresa es requerido'),
  position: z.string().min(1, 'Puesto es requerido'),
  monthlyIncome: z.number().positive('Ingreso mensual debe ser mayor a 0'),
  incomeSource: z.string().min(1, 'Fuente de ingreso es requerida'),

  informationComplete: z.boolean().optional(),
  additionalInfo: z.string().optional().nullable(),

  // References are handled separately
});

export const jointObligorSchema = jointObligorSchemaBase.refine(data => {
  // Validate based on nationality
  if (data.nationality === 'MEXICAN') {
    return !data.curp || CURP_PATTERN.test(data.curp);
  }
  return true;
}, {
  message: 'CURP inválido',
  path: ['curp'],
}).refine(data => {
  // If Mexican, CURP is required
  if (data.nationality === 'MEXICAN' && !data.curp) {
    return false;
  }
  // If foreign, passport is required
  if (data.nationality === 'FOREIGN' && !data.passport) {
    return false;
  }
  return true;
}, {
  message: 'CURP es requerido para mexicanos, pasaporte para extranjeros',
});

// For partial updates
export const jointObligorUpdateSchema = jointObligorSchemaBase.partial();

// ============================================
// AVAL SCHEMA
// ============================================

const avalSchemaBase = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
  email: emailSchema,
  phone: phoneSchema,
  nationality: z.enum(['MEXICAN', 'FOREIGN']),
  curp: z.string().optional().nullable(),
  rfc: z.string().optional().nullable(),
  passport: z.string().optional().nullable(),
  address: z.string().optional().nullable(),

  // Employment information
  employmentStatus: z.string().min(1, 'Situación laboral es requerida'),
  occupation: z.string().min(1, 'Ocupación es requerida'),
  companyName: z.string().min(1, 'Nombre de empresa es requerido'),
  position: z.string().min(1, 'Puesto es requerido'),
  monthlyIncome: z.number().positive('Ingreso mensual debe ser mayor a 0'),
  incomeSource: z.string().min(1, 'Fuente de ingreso es requerida'),

  // Property guarantee information
  propertyAddress: z.string().min(1, 'Dirección de la propiedad es requerida'),
  propertyValue: z.number().positive('Valor de la propiedad debe ser mayor a 0'),
  propertyDeedNumber: z.string().optional().nullable(),
  propertyRegistry: z.string().optional().nullable(),

  informationComplete: z.boolean().optional(),
  additionalInfo: z.string().optional().nullable(),

  // References are handled separately
});

export const avalSchema = avalSchemaBase.refine(data => {
  // Validate based on nationality
  if (data.nationality === 'MEXICAN') {
    return !data.curp || CURP_PATTERN.test(data.curp);
  }
  return true;
}, {
  message: 'CURP inválido',
  path: ['curp'],
}).refine(data => {
  // If Mexican, CURP is required
  if (data.nationality === 'MEXICAN' && !data.curp) {
    return false;
  }
  // If foreign, passport is required
  if (data.nationality === 'FOREIGN' && !data.passport) {
    return false;
  }
  return true;
}, {
  message: 'CURP es requerido para mexicanos, pasaporte para extranjeros',
});

// For partial updates
export const avalUpdateSchema = avalSchemaBase.partial();

// ============================================
// PROPERTY SCHEMA
// ============================================

export const propertySchema = z.object({
  propertyAddress: z.string().min(1, 'Dirección de la propiedad es requerida'),
  propertyType: z.enum([
    'HOUSE',
    'APARTMENT',
    'CONDO',
    'TOWNHOUSE',
    'COMMERCIAL',
    'OFFICE',
    'OTHER'
  ]),
  propertyDescription: z.string().optional().nullable(),
  rentAmount: z.number().positive('Monto de renta debe ser mayor a 0'),
  contractLength: z.number().int().positive('Duración del contrato debe ser mayor a 0').default(12),
});

// For partial updates
export const propertyUpdateSchema = propertySchema.partial();

// ============================================
// PRICING SCHEMA
// ============================================

const pricingSchemaBase = z.object({
  packageId: z.string().optional().nullable(),
  totalPrice: z.number().positive('Precio total debe ser mayor a 0'),
  tenantPercentage: z.number().min(0).max(100, 'Porcentaje debe estar entre 0 y 100'),
  landlordPercentage: z.number().min(0).max(100, 'Porcentaje debe estar entre 0 y 100'),
  guarantorType: z.enum(['NONE', 'JOINT_OBLIGOR', 'AVAL', 'BOTH']),
});

export const pricingSchema = pricingSchemaBase.refine(data => {
  // Ensure percentages add up to 100
  return data.tenantPercentage + data.landlordPercentage === 100;
}, {
  message: 'Los porcentajes de inquilino y arrendador deben sumar 100%',
  path: ['tenantPercentage'],
});

// For partial updates
export const pricingUpdateSchema = pricingSchemaBase.partial().refine(data => {
  // Only validate sum if both percentages are provided
  if (data.tenantPercentage !== undefined && data.landlordPercentage !== undefined) {
    return data.tenantPercentage + data.landlordPercentage === 100;
  }
  return true;
}, {
  message: 'Los porcentajes de inquilino y arrendador deben sumar 100%',
  path: ['tenantPercentage'],
});

// ============================================
// HELPER FUNCTIONS
// ============================================

export const validateRFC = (rfc: string, isCompany: boolean): boolean => {
  const pattern = isCompany ? RFC_COMPANY_PATTERN : RFC_INDIVIDUAL_PATTERN;
  return pattern.test(rfc);
};

export const validateCURP = (curp: string): boolean => {
  return CURP_PATTERN.test(curp);
};

export const validateCLABE = (clabe: string): boolean => {
  return CLABE_PATTERN.test(clabe);
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};
