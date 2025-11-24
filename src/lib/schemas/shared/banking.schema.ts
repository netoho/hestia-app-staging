/**
 * Shared banking validation schemas
 * Used across multiple actor types (Landlord, JointObligor, etc.)
 */

import { z } from 'zod';

/**
 * CLABE validation (Mexican bank account identifier)
 * Must be exactly 18 digits
 */
export const clabeSchema = z
  .string()
  .refine(
    (val) => !val || val === '' || /^\d{18}$/.test(val),
    { message: 'CLABE debe tener exactamente 18 dígitos' }
  )
  .transform((val) => val === '' ? null : val)
  .nullable()
  .optional();

/**
 * Account number validation
 * Variable length depending on bank
 */
export const accountNumberSchema = z
  .string()
  .transform((val) => val === '' ? null : val)
  .nullable()
  .optional();

/**
 * Bank name validation
 */
export const bankNameSchema = z
  .string()
  .transform((val) => val === '' ? null : val)
  .nullable()
  .optional();

/**
 * Account holder name validation
 */
export const accountHolderSchema = z
  .string()
  .transform((val) => val === '' ? null : val)
  .nullable()
  .optional();

/**
 * Complete banking information schema
 */
export const bankingSchema = z.object({
  bankName: bankNameSchema,
  accountNumber: accountNumberSchema,
  clabe: clabeSchema,
  accountHolder: accountHolderSchema,
});

/**
 * Partial banking schema for incremental saves
 */
export const partialBankingSchema = bankingSchema.partial();

/**
 * Strict banking schema - all fields required
 */
export const strictBankingSchema = z.object({
  bankName: z.string().min(1, 'El nombre del banco es requerido'),
  accountNumber: z.string().min(1, 'El número de cuenta es requerido'),
  clabe: z
    .string()
    .length(18, 'CLABE debe tener exactamente 18 dígitos')
    .regex(/^\d{18}$/, 'CLABE debe contener solo dígitos'),
  accountHolder: z.string().min(1, 'El titular de la cuenta es requerido'),
});

/**
 * Helper to validate banking data
 */
export function validateBankingData(data: unknown, mode: 'strict' | 'partial' = 'partial') {
  const schema = mode === 'strict' ? strictBankingSchema : partialBankingSchema;
  return schema.safeParse(data);
}

/**
 * Type exports
 */
export type Banking = z.infer<typeof bankingSchema>;
export type PartialBanking = z.infer<typeof partialBankingSchema>;
export type StrictBanking = z.infer<typeof strictBankingSchema>;