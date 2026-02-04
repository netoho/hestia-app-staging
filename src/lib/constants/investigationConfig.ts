import {
  InvestigationVerdict,
  RiskLevel,
} from '@/prisma/generated/prisma-client/enums';

// These types will be generated after running prisma migrate
// For now, define them locally to match schema.prisma
type InvestigatedActorType = 'TENANT' | 'JOINT_OBLIGOR' | 'AVAL';
type ActorInvestigationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ApproverType = 'BROKER' | 'LANDLORD';

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
// VERDICT CONFIGURATION
// ============================================

export interface VerdictConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const verdictConfig: Record<InvestigationVerdict, VerdictConfig> = {
  APPROVED: {
    label: 'Aprobado',
    description: 'La investigación no encontró riesgos significativos',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  REJECTED: {
    label: 'Rechazado',
    description: 'La investigación encontró riesgos que desaconsejan la operación',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
  HIGH_RISK: {
    label: 'Alto Riesgo',
    description: 'Se encontraron factores de riesgo que requieren atención',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
  },
  CONDITIONAL: {
    label: 'Condicional',
    description: 'Aprobación sujeta a condiciones adicionales',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
};

export function getVerdictLabel(verdict: InvestigationVerdict): string {
  return verdictConfig[verdict]?.label || verdict;
}

export function getVerdictColorClasses(verdict: InvestigationVerdict): string {
  const config = verdictConfig[verdict];
  return config ? `${config.bgColor} ${config.textColor}` : 'bg-gray-100 text-gray-800';
}

// ============================================
// RISK LEVEL CONFIGURATION
// ============================================

export interface RiskLevelConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const riskLevelConfig: Record<RiskLevel, RiskLevelConfig> = {
  LOW: {
    label: 'Bajo',
    description: 'Riesgo mínimo',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  MEDIUM: {
    label: 'Medio',
    description: 'Riesgo moderado',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  HIGH: {
    label: 'Alto',
    description: 'Riesgo elevado',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
  },
  VERY_HIGH: {
    label: 'Muy Alto',
    description: 'Riesgo crítico',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
};

export function getRiskLevelLabel(riskLevel: RiskLevel): string {
  return riskLevelConfig[riskLevel]?.label || riskLevel;
}

export function getRiskLevelColorClasses(riskLevel: RiskLevel): string {
  const config = riskLevelConfig[riskLevel];
  return config ? `${config.bgColor} ${config.textColor}` : 'bg-gray-100 text-gray-800';
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
};

export function getInvestigationStatusLabel(status: ActorInvestigationStatus): string {
  return investigationStatusConfig[status]?.label || status;
}

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
} as const;
