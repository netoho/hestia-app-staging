// These types will be generated after running prisma migrate
// For now, define them locally to match schema.prisma
type InvestigatedActorType = 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
type ActorInvestigationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
type ApproverType = 'BROKER' | 'LANDLORD';
export type InvestigationArchiveReason = 'OUTDATED' | 'ERROR' | 'SUPERSEDED' | 'OTHER';

// ============================================
// ACTOR TYPE CONFIGURATION
// ============================================

export interface ActorTypeConfig {
  label: string;
  description: string;
}

export const investigatedActorTypeConfig: Record<InvestigatedActorType, ActorTypeConfig> = {
  TENANT: {
    label: 'Inquilino',
    description: 'Persona que ocupará el inmueble',
  },
  JOINT_OBLIGOR: {
    label: 'Obligado Solidario',
    description: 'Persona que garantiza el cumplimiento del contrato',
  },
  AVAL: {
    label: 'Aval',
    description: 'Persona que respalda con garantía inmobiliaria',
  },
};

export function getInvestigatedActorLabel(type: InvestigatedActorType): string {
  return investigatedActorTypeConfig[type]?.label || type;
}

// ============================================
// STATUS CONFIGURATION
// ============================================

export interface StatusConfig {
  label: string;
  description: string;
}

export const investigationStatusConfig: Record<ActorInvestigationStatus, StatusConfig> = {
  PENDING: {
    label: 'Pendiente',
    description: 'Esperando aprobación',
  },
  APPROVED: {
    label: 'Aprobada',
    description: 'Investigación aprobada',
  },
  REJECTED: {
    label: 'Rechazada',
    description: 'Investigación rechazada',
  },
  ARCHIVED: {
    label: 'Archivada',
    description: 'Investigación archivada',
  },
};

export function getInvestigationStatusLabel(status: ActorInvestigationStatus): string {
  return investigationStatusConfig[status]?.label || status;
}

// ============================================
// ARCHIVE REASON CONFIGURATION
// ============================================

export interface ArchiveReasonConfig {
  label: string;
  description: string;
}

export const archiveReasonConfig: Record<InvestigationArchiveReason, ArchiveReasonConfig> = {
  OUTDATED: {
    label: 'Desactualizada',
    description: 'La investigación ya no es relevante',
  },
  ERROR: {
    label: 'Error',
    description: 'La investigación contiene errores',
  },
  SUPERSEDED: {
    label: 'Reemplazada',
    description: 'Reemplazada por una nueva investigación',
  },
  OTHER: {
    label: 'Otro',
    description: 'Otra razón',
  },
};

export function getArchiveReasonLabel(reason: InvestigationArchiveReason): string {
  return archiveReasonConfig[reason]?.label || reason;
}

export const ARCHIVE_REASONS = Object.entries(archiveReasonConfig).map(([value, config]) => ({
  value: value as InvestigationArchiveReason,
  label: config.label,
  description: config.description,
}));

// ============================================
// APPROVER TYPE CONFIGURATION
// ============================================

export const approverTypeConfig: Record<ApproverType, { label: string; description: string }> = {
  BROKER: {
    label: 'Broker',
    description: 'El broker de la póliza',
  },
  LANDLORD: {
    label: 'Arrendador',
    description: 'El arrendador de la propiedad',
  },
};

export function getApproverTypeLabel(type: ApproverType): string {
  return approverTypeConfig[type]?.label || type;
}

// ============================================
// FILE VALIDATION CONFIGURATION
// Note: Moved to documentCategories.ts - use getCategoryValidation(DocumentCategory.INVESTIGATION_SUPPORT)
// ============================================

// ============================================
// TOKEN CONFIGURATION
// ============================================

export const INVESTIGATION_TOKEN_EXPIRY_DAYS = 30;

export function getInvestigationTokenExpiryDate(): Date {
  return new Date(Date.now() + INVESTIGATION_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

// ============================================
// FORM VALIDATION LIMITS
// ============================================

export const INVESTIGATION_FORM_LIMITS = {
  findings: {
    min: 10,
    max: 10000,
  },
  rejectionReason: {
    min: 10,
    max: 2000,
  },
  approvalNotes: {
    max: 2000,
  },
  archiveComment: {
    max: 1000,
  },
} as const;
