/**
 * Base validation schemas for actor entities
 */

import { z } from 'zod';

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'La calle es requerida'),
  exteriorNumber: z.string().min(1, 'El número exterior es requerido'),
  interiorNumber: z.string().optional().nullable(),
  neighborhood: z.string().min(1, 'La colonia es requerida'),
  postalCode: z.string().min(4, 'El código postal es requerido'),
  municipality: z.string().min(1, 'El municipio es requerido'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El estado es requerido'),
  country: z.string().default('México'),
  placeId: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  formattedAddress: z.string().optional().nullable(),
});

// Partial address schema for updates
export const partialAddressSchema = addressSchema.partial();

// Base actor schema (common fields)
export const baseActorSchema = z.object({
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  workPhone: z.string().optional().nullable().or(z.literal('')),
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),

  // Bank information (optional for most actors)
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable().or(z.literal('')),
  accountHolder: z.string().optional().nullable().or(z.literal('')),

  // Additional info
  additionalInfo: z.string().optional().nullable().or(z.literal('')),
});

// Partial base schema for updates
export const partialBaseActorSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  workPhone: z.string().optional().nullable(),
  address: z.string().optional(),
  addressDetails: partialAddressSchema.optional().nullable(),

  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable(),
  accountHolder: z.string().optional().nullable(),

  additionalInfo: z.string().optional().nullable(),
});

// Helper to create nullable string schema
export const nullableString = () =>
  z.string().optional().nullable().or(z.literal(''));

// Helper to create required string schema with minimum length
export const requiredString = (minLength: number = 1, message?: string) =>
  z.string().min(minLength, message || `Mínimo ${minLength} caracteres requeridos`);

// RFC validation (Mexican tax ID)
export const rfcSchema = z.string()
  .min(12, 'RFC debe tener mínimo 12 caracteres')
  .max(13, 'RFC debe tener máximo 13 caracteres')
  .regex(/^[A-Z]{3,4}\d{6}[0-9A-Z]{2,3}$/, 'Formato de RFC inválido');

// Optional RFC schema
export const optionalRfcSchema = rfcSchema.optional().nullable().or(z.literal(''));

// CURP validation (Mexican unique population registry code)
export const curpSchema = z.string()
  .length(18, 'CURP debe tener exactamente 18 caracteres')
  .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, 'Formato de CURP inválido');

// Optional CURP schema
export const optionalCurpSchema = curpSchema.optional().nullable().or(z.literal(''));

// Email validation schemas
export const emailSchema = z.string().email('Email inválido');
export const optionalEmailSchema = emailSchema.optional().nullable().or(z.literal(''));

// Phone validation schemas
export const phoneSchema = z.string()
  .min(10, 'El teléfono debe tener al menos 10 dígitos')
  .regex(/^\d{10,}$/, 'El teléfono debe contener solo números');

export const optionalPhoneSchema = phoneSchema.optional().nullable().or(z.literal(''));

// Money amount validation
export const moneyAmountSchema = z.number()
  .positive('El monto debe ser positivo')
  .multipleOf(0.01, 'Máximo 2 decimales permitidos');

export const optionalMoneyAmountSchema = moneyAmountSchema.optional().nullable();

// Percentage validation (0-100)
export const percentageSchema = z.number()
  .min(0, 'El porcentaje debe ser mínimo 0')
  .max(100, 'El porcentaje debe ser máximo 100');

export const optionalPercentageSchema = percentageSchema.optional().nullable();

// Date string validation (YYYY-MM-DD format)
export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD');

export const optionalDateStringSchema = dateStringSchema.optional().nullable().or(z.literal(''));
