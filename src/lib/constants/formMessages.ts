/**
 * Centralized form messages for consistency across the application
 * Spanish messages for Mexican market
 */

// Validation messages (extends those in actorValidation.ts)
export const VALIDATION_MESSAGES = {
  // Required fields
  required: 'Este campo es requerido',
  requiredName: 'Nombre es requerido',
  requiredMiddleName: 'Segundo nombre es requerido',
  requiredPaternal: 'Apellido paterno es requerido',
  requiredMaternal: 'Apellido materno es requerido',
  requiredCompany: 'Nombre de empresa es requerido',
  requiredCompanyRFC: 'RFC de empresa es requerido',
  requiredRFC: 'RFC es requerido',
  requiredCURP: 'CURP es requerido para ciudadanos mexicanos',
  requiredPassport: 'Pasaporte es requerido para extranjeros',
  requiredEmail: 'Correo electrónico es requerido',
  requiredPhone: 'Teléfono es requerido',
  requiredAddress: 'Dirección es requerida',
  requiredOccupation: 'Ocupación es requerida',
  requiredEmployer: 'Nombre del empleador es requerido',

  // Invalid formats
  invalidEmail: 'Correo electrónico inválido',
  invalidPhone: 'Teléfono debe tener 10 dígitos',
  invalidCURP: 'CURP inválido',
  invalidRFC: 'RFC inválido',
  invalidRFCPerson: 'RFC de persona física inválido (debe tener 13 caracteres)',
  invalidRFCCompany: 'RFC de empresa inválido (debe tener 12 caracteres)',
  invalidIncome: 'Ingreso mensual debe ser mayor a 0',

  // References
  completeReference: 'Complete la referencia',
  completePersonalReference: 'Complete la referencia personal',
  completeCommercialReference: 'Complete la referencia comercial',

  // Property/Guarantee
  selectGuaranteeMethod: 'Seleccione un método de garantía',
  propertyAddressRequired: 'Dirección de la propiedad es requerida',
  propertyValueRequired: 'Valor de la propiedad es requerido',

  // Documents
  documentsRequired: 'Por favor cargue todos los documentos requeridos',
  documentsRequiredProperty: 'La escritura y boleta predial de la propiedad en garantía son obligatorias',
} as const;

// Toast messages for user feedback
export const TOAST_MESSAGES = {
  // Save operations
  saving: {
    title: 'Guardando...',
    description: 'Guardando información...',
  },
  saved: {
    title: '✓ Guardado',
    description: 'Información guardada exitosamente',
  },
  saveError: {
    title: 'Error',
    description: 'Error al guardar la información',
    variant: 'destructive' as const,
  },

  // Submit operations
  submitting: {
    title: 'Enviando...',
    description: 'Enviando información...',
  },
  submitted: {
    title: '✓ Información Enviada',
    description: 'Tu información ha sido enviada exitosamente',
  },
  submitError: {
    title: 'Error',
    description: 'Error al enviar la información',
    variant: 'destructive' as const,
  },

  // Document operations
  missingDocs: {
    title: 'Documentos requeridos',
    description: 'Por favor cargue todos los documentos requeridos antes de enviar',
    variant: 'destructive' as const,
  },
  missingPropertyDocs: {
    title: 'Documentos requeridos',
    description: 'Por favor cargue todos los documentos requeridos antes de enviar. La escritura y boleta predial de la propiedad en garantía son obligatorias.',
    variant: 'destructive' as const,
  },
  documentUploaded: {
    title: '✓ Documento cargado',
    description: 'El documento se ha cargado exitosamente',
  },
  documentDeleted: {
    title: 'Documento eliminado',
    description: 'El documento se ha eliminado',
  },
  documentError: {
    title: 'Error',
    description: 'Error al procesar el documento',
    variant: 'destructive' as const,
  },

  // Validation
  validationError: {
    title: 'Información incompleta',
    description: 'Por favor complete todos los campos requeridos',
    variant: 'destructive' as const,
  },

  // General
  error: {
    title: 'Error',
    description: 'Ha ocurrido un error',
    variant: 'destructive' as const,
  },
  success: {
    title: 'Éxito',
    description: 'Operación completada exitosamente',
  },
} as const;

// Button labels
export const BUTTON_LABELS = {
  save: 'Guardar',
  saving: 'Guardando...',
  saved: 'Guardado',
  submit: 'Enviar Información',
  submitting: 'Enviando...',
  next: 'Siguiente',
  previous: 'Anterior',
  cancel: 'Cancelar',
  delete: 'Eliminar',
  add: 'Agregar',
  edit: 'Editar',
  view: 'Ver',
  download: 'Descargar',
  upload: 'Cargar',
  addReference: '+ Agregar Referencia',
  removeReference: 'Eliminar',
  addCoOwner: '+ Agregar Co-propietario',
  removeCoOwner: '✕ Eliminar',
} as const;

// Tab labels
export const TAB_LABELS = {
  personal: 'Personal',
  company: 'Información',
  employment: 'Empleo',
  property: 'Propiedad',
  guarantee: 'Garantía',
  financial: 'Fiscal',
  references: 'Referencias',
  documents: 'Documentos',
  rentalHistory: 'Historial',
} as const;

// Progress messages
export const PROGRESS_MESSAGES = {
  completionProgress: 'Progreso de Completado',
  sectionsCompleted: (completed: number, total: number) => `${completed} de ${total} secciones guardadas`,
  allSectionsRequired: 'Complete todas las secciones antes de enviar',
  documentsRequired: 'Cargue todos los documentos requeridos antes de enviar',
} as const;

// Actor-specific messages
export const ACTOR_MESSAGES = {
  landlord: {
    title: 'Arrendador',
    primaryTitle: 'Arrendador Principal (Contacto Principal)',
    coOwnerTitle: (index: number) => `Co-propietario ${index}`,
    coOwnerHelp: 'Agregue co-propietarios si la propiedad tiene múltiples dueños (ej: cónyuges, socios)',
    documentsNote: 'Los documentos (escrituras, información bancaria, CFDI) solo son requeridos del arrendador principal. Los co-propietarios solo necesitan proporcionar identificación.',
  },
  tenant: {
    title: 'Arrendatario',
    portalTitle: 'Portal del Arrendatario',
    welcomeMessage: 'Complete su información para la solicitud de arrendamiento',
  },
  aval: {
    title: 'Aval',
    portalTitle: 'Portal del Aval',
    welcomeMessage: 'Complete su información como aval de la protección',
  },
  jointObligor: {
    title: 'Obligado Solidario',
    portalTitle: 'Portal del Obligado Solidario',
    welcomeMessage: 'Complete su información para la protección de arrendamiento',
  },
} as const;

// Field labels
export const FIELD_LABELS = {
  // Personal info
  firstName: 'Nombre(s)',
  middleName: 'Segundo Nombre',
  paternalLastName: 'Apellido Paterno',
  maternalLastName: 'Apellido Materno',
  nationality: 'Nacionalidad',
  curp: 'CURP',
  rfc: 'RFC',
  passport: 'Pasaporte',

  // Company info
  companyName: 'Nombre de la Empresa',
  companyRfc: 'RFC de la Empresa',
  legalRepresentative: 'Representante Legal',

  // Contact
  email: 'Correo Electrónico',
  phone: 'Teléfono',
  workPhone: 'Teléfono de Trabajo',
  personalEmail: 'Correo Personal',
  workEmail: 'Correo de Trabajo',

  // Employment
  occupation: 'Ocupación',
  employerName: 'Nombre del Empleador',
  monthlyIncome: 'Ingreso Mensual',
  employmentStatus: 'Situación Laboral',
  position: 'Puesto',

  // Address
  address: 'Dirección',
  street: 'Calle',
  exteriorNumber: 'Número Exterior',
  interiorNumber: 'Número Interior',
  neighborhood: 'Colonia',
  postalCode: 'Código Postal',
  municipality: 'Alcaldía/Municipio',
  city: 'Ciudad',
  state: 'Estado',

  // References
  relationship: 'Relación',
  yearsOfRelationship: 'Años de Relación',
} as const;

// Main export for convenience
export const formMessages = {
  validation: VALIDATION_MESSAGES,
  toast: TOAST_MESSAGES,
  button: BUTTON_LABELS,
  tab: TAB_LABELS,
  progress: PROGRESS_MESSAGES,
  actor: ACTOR_MESSAGES,
  field: FIELD_LABELS,
  error: {
    saveFailed: 'Error al guardar',
    submitFailed: 'Error al enviar',
    loadFailed: 'Error al cargar',
    validationFailed: 'Por favor corrija los errores antes de continuar',
  },
};