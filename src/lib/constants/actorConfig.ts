/**
 * Actor-specific configuration constants
 * Centralizes all actor type configurations for consistency
 */

// Actor types
export const ACTOR_TYPES = {
  LANDLORD: 'landlord',
  TENANT: 'tenant',
  AVAL: 'aval',
  JOINT_OBLIGOR: 'joint-obligor',
} as const;

export type ActorType = typeof ACTOR_TYPES[keyof typeof ACTOR_TYPES];

// Address fields per actor type
export const ACTOR_ADDRESS_FIELDS: Record<ActorType, string[]> = {
  [ACTOR_TYPES.LANDLORD]: ['addressDetails'],
  [ACTOR_TYPES.TENANT]: ['addressDetails', 'employerAddressDetails', 'previousRentalAddressDetails'],
  [ACTOR_TYPES.AVAL]: ['addressDetails', 'employerAddressDetails', 'guaranteePropertyDetails'],
  [ACTOR_TYPES.JOINT_OBLIGOR]: ['addressDetails', 'employerAddressDetails', 'propertyAddressDetails'],
};

// Tab configurations per actor type
export const actorConfig = {
  landlord: {
    personTabs: [
      { id: 'owner-info', label: 'Información', needsSave: true, required: true },
      { id: 'property-info', label: 'Propiedad', needsSave: true, required: true },
      { id: 'financial-info', label: 'Financiero', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
    companyTabs: [
      { id: 'owner-info', label: 'Información', needsSave: true, required: true },
      { id: 'property-info', label: 'Propiedad', needsSave: true, required: true },
      { id: 'financial-info', label: 'Financiero', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
  },
  tenant: {
    personTabs: [
      { id: 'personal', label: 'Personal', needsSave: true, required: true },
      { id: 'employment', label: 'Empleo', needsSave: true, required: true },
      { id: 'rental', label: 'Historial', needsSave: true, required: false },
      { id: 'references', label: 'Referencias', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
    companyTabs: [
      { id: 'personal', label: 'Información', needsSave: true, required: true },
      { id: 'references', label: 'Referencias', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
  },
  aval: {
    personTabs: [
      { id: 'personal', label: 'Personal', needsSave: true, required: true },
      { id: 'employment', label: 'Empleo', needsSave: true, required: true },
      { id: 'property', label: 'Propiedad', needsSave: true, required: true },
      { id: 'references', label: 'Referencias', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
    companyTabs: [
      { id: 'personal', label: 'Información', needsSave: true, required: true },
      { id: 'property', label: 'Propiedad', needsSave: true, required: true },
      { id: 'references', label: 'Referencias', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
  },
  jointObligor: {
    personTabs: [
      { id: 'personal', label: 'Personal', needsSave: true, required: true },
      { id: 'employment', label: 'Empleo', needsSave: true, required: true },
      { id: 'guarantee', label: 'Garantía', needsSave: true, required: true },
      { id: 'references', label: 'Referencias', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
    companyTabs: [
      { id: 'personal', label: 'Información', needsSave: true, required: true },
      { id: 'guarantee', label: 'Garantía', needsSave: true, required: true },
      { id: 'references', label: 'Referencias', needsSave: true, required: true },
      { id: 'documents', label: 'Documentos', needsSave: false, required: true },
    ],
  },
} as const;

// API endpoints per actor type
export const ACTOR_API_ENDPOINTS: Record<ActorType, string> = {
  [ACTOR_TYPES.LANDLORD]: '/api/actors/landlord',
  [ACTOR_TYPES.TENANT]: '/api/actors/tenant',
  [ACTOR_TYPES.AVAL]: '/api/actors/aval',
  [ACTOR_TYPES.JOINT_OBLIGOR]: '/api/actors/joint-obligor',
};

// Actor capabilities configuration
export const ACTOR_CAPABILITIES = {
  landlord: {
    multiActor: true,
    hasReferences: false,
    hasEmployment: false,
    hasProperty: true,
    hasFinancial: true,
    hasGuarantee: false,
    hasRentalHistory: false,
    allowCoOwners: true,
  },
  [ACTOR_TYPES.TENANT]: {
    multiActor: false,
    hasReferences: true,
    hasEmployment: true,
    hasProperty: false,
    hasFinancial: false,
    hasGuarantee: false,
    hasRentalHistory: true,
    allowDynamicReferences: true,
  },
  [ACTOR_TYPES.AVAL]: {
    multiActor: false,
    hasReferences: true,
    hasEmployment: true,
    hasProperty: true,
    hasFinancial: false,
    hasGuarantee: true,
    hasRentalHistory: false,
    propertyAsGuarantee: true,
  },
  [ACTOR_TYPES.JOINT_OBLIGOR]: {
    multiActor: false,
    hasReferences: true,
    hasEmployment: true,
    hasProperty: false,
    hasFinancial: false,
    hasGuarantee: true,
    hasRentalHistory: false,
    includeAddressInReferences: true,
  },
} as const;

// Document requirements per actor type
export const ACTOR_DOCUMENT_REQUIREMENTS = {
  [ACTOR_TYPES.LANDLORD]: {
    individual: [
      'identification',
      'address_proof',
      'property_deed',
      'property_tax',
      'bank_statement',
    ],
    company: [
      'company_constitution',
      'legal_powers',
      'legal_rep_identification',
      'tax_status_certificate',
      'property_deed',
      'property_tax',
      'bank_statement',
    ],
  },
  [ACTOR_TYPES.TENANT]: {
    individual: [
      'identification',
      'address_proof',
      'income_proof',
      'employment_letter',
    ],
    company: [
      'company_constitution',
      'legal_powers',
      'legal_rep_identification',
      'tax_status_certificate',
      'bank_statements',
    ],
  },
  [ACTOR_TYPES.AVAL]: {
    individual: [
      'identification',
      'address_proof',
      'income_proof',
      'property_deed',
      'property_tax',
      'marriage_certificate', // If married
    ],
    company: [
      'company_constitution',
      'legal_powers',
      'legal_rep_identification',
      'property_deed',
      'property_tax',
    ],
  },
  [ACTOR_TYPES.JOINT_OBLIGOR]: {
    individual: [
      'identification',
      'address_proof',
      'income_proof',
      'employment_letter',
      'property_deed', // If property guarantee
      'property_tax', // If property guarantee
    ],
    company: [
      'company_constitution',
      'legal_powers',
      'legal_rep_identification',
      'tax_status_certificate',
      'bank_statements',
    ],
  },
} as const;

// Reference requirements
export const REFERENCE_REQUIREMENTS = {
  [ACTOR_TYPES.LANDLORD]: {
    personalReferences: 0,
    commercialReferences: 0,
  },
  [ACTOR_TYPES.TENANT]: {
    personalReferences: 3,
    commercialReferences: 3, // For companies
  },
  [ACTOR_TYPES.AVAL]: {
    personalReferences: 3,
    commercialReferences: 3, // For companies
  },
  [ACTOR_TYPES.JOINT_OBLIGOR]: {
    personalReferences: 3,
    commercialReferences: 3, // For companies
  },
} as const;

// Helper functions
export function getActorTabs(actorType: ActorType, isCompany: boolean) {
  const config = ACTOR_TABS[actorType];

  if ('all' in config) {
    return [...config.all]; // Return mutable copy
  }

  return isCompany ? [...config.company] : [...config.individual]; // Return mutable copies
}

export function getActorCapabilities(actorType: ActorType) {
  return ACTOR_CAPABILITIES[actorType];
}

export function getDocumentRequirements(actorType: ActorType, isCompany: boolean) {
  const requirements = ACTOR_DOCUMENT_REQUIREMENTS[actorType];
  return isCompany ? requirements.company : requirements.individual;
}

export function getReferenceRequirements(actorType: ActorType) {
  return REFERENCE_REQUIREMENTS[actorType];
}
