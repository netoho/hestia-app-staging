import { z } from 'zod';

/**
 * Shared password validation schema
 * Requirements: 8+ chars, uppercase, lowercase, number
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número');

/**
 * Password with confirmation schema
 */
export const passwordWithConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

/**
 * Password requirement definition
 */
export interface PasswordRequirement {
  label: string;
  check: (password: string) => boolean;
}

/**
 * Password requirements for UI display
 */
export const passwordRequirements: PasswordRequirement[] = [
  {
    label: 'Al menos 8 caracteres',
    check: (p: string) => p.length >= 8
  },
  {
    label: 'Una letra mayúscula',
    check: (p: string) => /[A-Z]/.test(p)
  },
  {
    label: 'Una letra minúscula',
    check: (p: string) => /[a-z]/.test(p)
  },
  {
    label: 'Un número',
    check: (p: string) => /[0-9]/.test(p)
  },
];

/**
 * Check if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  return passwordRequirements.every(req => req.check(password));
}

/**
 * Get password strength (0-4 based on requirements met)
 */
export function getPasswordStrength(password: string): number {
  return passwordRequirements.filter(req => req.check(password)).length;
}
