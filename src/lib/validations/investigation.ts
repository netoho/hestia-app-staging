import { z } from 'zod';
import { INVESTIGATION_FORM_LIMITS } from '@/lib/constants/investigationConfig';

// This type will be generated after running prisma migrate
// For now, define locally to match schema.prisma
const InvestigatedActorTypeValues = ['TENANT', 'JOINT_OBLIGOR', 'AVAL'] as const;

// ============================================
// INVESTIGATION FORM SCHEMA (for creating/updating)
// ============================================

export const investigationFormSchema = z.object({
  findings: z
    .string()
    .min(
      INVESTIGATION_FORM_LIMITS.findings.min,
      `Los comentarios deben tener al menos ${INVESTIGATION_FORM_LIMITS.findings.min} caracteres`
    )
    .max(
      INVESTIGATION_FORM_LIMITS.findings.max,
      `Los comentarios no pueden exceder ${INVESTIGATION_FORM_LIMITS.findings.max} caracteres`
    )
    .transform((val) => val.trim()),
});

export type InvestigationFormData = z.infer<typeof investigationFormSchema>;

// ============================================
// REJECTION SCHEMA
// ============================================

export const investigationRejectSchema = z.object({
  reason: z
    .string()
    .min(
      INVESTIGATION_FORM_LIMITS.rejectionReason.min,
      `El motivo debe tener al menos ${INVESTIGATION_FORM_LIMITS.rejectionReason.min} caracteres`
    )
    .max(
      INVESTIGATION_FORM_LIMITS.rejectionReason.max,
      `El motivo no puede exceder ${INVESTIGATION_FORM_LIMITS.rejectionReason.max} caracteres`
    )
    .transform((val) => val.trim()),
});

export type InvestigationRejectData = z.infer<typeof investigationRejectSchema>;

// ============================================
// APPROVAL SCHEMA
// ============================================

export const investigationApproveSchema = z.object({
  notes: z
    .string()
    .max(
      INVESTIGATION_FORM_LIMITS.approvalNotes.max,
      `Las notas no pueden exceder ${INVESTIGATION_FORM_LIMITS.approvalNotes.max} caracteres`
    )
    .transform((val) => val.trim())
    .optional(),
});

export type InvestigationApproveData = z.infer<typeof investigationApproveSchema>;

// ============================================
// CREATE SCHEMA (for router input)
// ============================================

export const investigationCreateSchema = z.object({
  policyId: z.string().cuid('ID de protección inválido'),
  actorType: z.enum(InvestigatedActorTypeValues, {
    errorMap: () => ({ message: 'Tipo de actor inválido' }),
  }),
  actorId: z.string().cuid('ID de actor inválido'),
});

export type InvestigationCreateData = z.infer<typeof investigationCreateSchema>;

// ============================================
// UPDATE SCHEMA (for router input)
// ============================================

export const investigationUpdateSchema = z.object({
  id: z.string().cuid('ID de investigación inválido'),
  findings: z
    .string()
    .min(1, 'Los comentarios son requeridos')
    .max(INVESTIGATION_FORM_LIMITS.findings.max)
    .transform((val) => val.trim())
    .optional(),
});

export type InvestigationUpdateData = z.infer<typeof investigationUpdateSchema>;

// ============================================
// SUBMIT SCHEMA (for router input)
// ============================================

export const investigationSubmitSchema = z.object({
  id: z.string().cuid('ID de investigación inválido'),
  findings: z
    .string()
    .min(
      INVESTIGATION_FORM_LIMITS.findings.min,
      `Los comentarios deben tener al menos ${INVESTIGATION_FORM_LIMITS.findings.min} caracteres`
    )
    .max(INVESTIGATION_FORM_LIMITS.findings.max)
    .transform((val) => val.trim()),
});

export type InvestigationSubmitData = z.infer<typeof investigationSubmitSchema>;

// ============================================
// DOCUMENT UPLOAD SCHEMA
// ============================================

export const investigationDocumentUploadSchema = z.object({
  investigationId: z.string().cuid('ID de investigación inválido'),
  fileName: z.string().min(1, 'Nombre de archivo requerido'),
  contentType: z.string().min(1, 'Tipo de contenido requerido'),
  fileSize: z.number().positive('Tamaño de archivo inválido'),
});

export type InvestigationDocumentUploadData = z.infer<typeof investigationDocumentUploadSchema>;

// ============================================
// TOKEN-BASED SCHEMAS (for public endpoints)
// ============================================

export const investigationByTokenSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
});

export const investigationApproveByTokenSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  notes: z
    .string()
    .max(INVESTIGATION_FORM_LIMITS.approvalNotes.max)
    .transform((val) => val.trim())
    .optional(),
});

export const investigationRejectByTokenSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  reason: z
    .string()
    .min(
      INVESTIGATION_FORM_LIMITS.rejectionReason.min,
      `El motivo debe tener al menos ${INVESTIGATION_FORM_LIMITS.rejectionReason.min} caracteres`
    )
    .max(INVESTIGATION_FORM_LIMITS.rejectionReason.max)
    .transform((val) => val.trim()),
});
