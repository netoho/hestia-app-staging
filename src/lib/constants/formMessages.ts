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

