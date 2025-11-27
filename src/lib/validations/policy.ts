import { z } from 'zod';
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

