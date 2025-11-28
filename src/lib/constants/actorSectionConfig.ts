/**
 * Actor Section Configuration
 *
 * Single source of truth for which sections apply to each actor type in the review flow.
 *
 * To modify sections for an actor type:
 * - Comment out or remove a line from ACTOR_SECTIONS to disable a section
 * - Add a section type to enable it
 */

export type ActorType = 'landlord' | 'tenant' | 'jointObligor' | 'aval';

export type SectionType =
  | 'personal_info'
  | 'work_info'
  | 'financial_info'
  | 'references'
  | 'address'
  | 'company_info'
  | 'rental_history'
  | 'property_guarantee';

export interface SectionDefinition {
  type: SectionType;
  displayName: string;
  displayNameCompany?: string; // Override for companies
}

/**
 * Section definitions with display names.
 * To add/remove a section from an actor type, edit ACTOR_SECTIONS below.
 */
export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  personal_info: {
    type: 'personal_info',
    displayName: 'Información Personal',
    displayNameCompany: 'Información de la Empresa',
  },
  address: {
    type: 'address',
    displayName: 'Dirección',
  },
  company_info: {
    type: 'company_info',
    displayName: 'Representante Legal',
  },
  work_info: {
    type: 'work_info',
    displayName: 'Información Laboral',
  },
  financial_info: {
    type: 'financial_info',
    displayName: 'Información Bancaria',
  },
  rental_history: {
    type: 'rental_history',
    displayName: 'Historial de Renta',
  },
  property_guarantee: {
    type: 'property_guarantee',
    displayName: 'Garantía de Propiedad',
  },
  references: {
    type: 'references',
    displayName: 'Referencias',
  },
};

/**
 * SECTION MATRIX - Edit this to add/remove sections per actor type
 *
 * To disable a section: comment out or remove the line
 * To add a section: add the section type to the array
 */
export const ACTOR_SECTIONS: Record<ActorType, {
  person: SectionType[];
  company: SectionType[];
}> = {
  landlord: {
    person: [
      'personal_info',
      'address',
      'financial_info',
      // 'work_info', // Uncomment if landlords need employment info
    ],
    company: [
      'personal_info',
      'company_info',
      'address',
      'financial_info',
    ],
  },

  tenant: {
    person: [
      'personal_info',
      'address',
      'work_info',        // Comment out to stop asking for employment
      'rental_history',   // Comment out to stop asking for rental history
      'references',
    ],
    company: [
      'personal_info',
      'company_info',
      'address',
      'references',
    ],
  },

  aval: {
    person: [
      'personal_info',
      'address',
      'work_info',
      'property_guarantee',
      'references',
    ],
    company: [
      'personal_info',
      'company_info',
      'address',
      'property_guarantee',
      'references',
    ],
  },

  jointObligor: {
    person: [
      'personal_info',
      'address',
      'work_info',
      'property_guarantee',
      'references',
    ],
    company: [
      'personal_info',
      'company_info',
      'address',
      'property_guarantee',
      'references',
    ],
  },
};

/**
 * Get sections for an actor type
 */
export function getSectionsForActor(actorType: ActorType, isCompany: boolean): SectionType[] {
  const config = ACTOR_SECTIONS[actorType];
  if (!config) {
    return ['personal_info', 'address'];
  }
  return isCompany ? config.company : config.person;
}

/**
 * Get section display name
 */
export function getSectionDisplayName(section: SectionType, isCompany: boolean): string {
  const def = SECTION_DEFINITIONS[section];
  if (!def) {
    return section;
  }
  return (isCompany && def.displayNameCompany) ? def.displayNameCompany : def.displayName;
}

/**
 * Check if a section is valid for the given actor type
 */
export function isValidSection(actorType: ActorType, section: SectionType, isCompany: boolean): boolean {
  const sections = getSectionsForActor(actorType, isCompany);
  return sections.includes(section);
}
