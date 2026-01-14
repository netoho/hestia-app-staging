/**
 * Actor utility functions
 * Consolidated from 11+ files to eliminate duplication
 */

import { Building, Shield, User, Users } from 'lucide-react';

export type ActorType = 'tenant' | 'landlord' | 'aval' | 'jointObligor';

/**
 * Get display label for actor type (Spanish)
 * Supports both camelCase (jointObligor) and kebab-case (joint-obligor) formats
 */
export function getActorTypeLabel(type: ActorType | string): string {
  const labels: Record<string, string> = {
    tenant: 'Inquilino',
    landlord: 'Arrendador',
    aval: 'Aval',
    jointObligor: 'Obligado Solidario',
    'joint-obligor': 'Obligado Solidario',
  };
  return labels[type] || 'Actor';
}

/**
 * Get icon component for actor type
 */
export function getActorIcon(type: ActorType | string) {
  switch (type) {
    case 'tenant':
      return User;
    case 'landlord':
      return Building;
    case 'jointObligor':
      return Users;
    case 'aval':
      return Shield;
    default:
      return User;
  }
}

/**
 * Get title for actor card/section
 */
export function getActorTitle(type: ActorType | string): string {
  switch (type) {
    case 'tenant':
      return 'Información del Inquilino';
    case 'landlord':
      return 'Información del Arrendador';
    case 'jointObligor':
      return 'Obligado Solidario';
    case 'aval':
      return 'Aval';
    default:
      return 'Actor';
  }
}

/**
 * Calculate progress percentage for an actor based on filled fields
 */
export function calculateActorProgress(actor: any): number {
  if (!actor) return 0;
  if (actor.informationComplete) return 100;

  let completed = 0;
  const total = 10;

  // Basic fields
  if (actor.companyName || actor.fullName || (actor.firstName && actor.paternalLastName)) completed++;
  if (actor.email) completed++;
  if (actor.phone) completed++;
  if (actor.rfc || actor.companyRfc) completed++;
  if (actor.address || actor.addressDetails) completed++;

  // Employment/business
  if (actor.occupation || actor.legalRepName || (actor.legalRepFirstName && actor.legalRepPaternalLastName)) completed++;
  if (actor.monthlyIncome || actor.companyRevenue) completed++;

  // Additional
  if (actor.curp || actor.passport) completed++;

  // References
  if (actor.references?.length > 0 || actor.commercialReferences?.length > 0) completed++;

  // Documents
  if (actor.documents?.length > 0) completed++;

  return Math.round((completed / total) * 100);
}
