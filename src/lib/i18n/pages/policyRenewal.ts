export const policyRenewal = {
  // CTA
  cta: "Renovar",
  ctaAria: "Renovar protección",

  // Page
  pageTitle: "Renovar protección",
  pageSubtitle: (policyNumber: string) => `A partir de la protección #${policyNumber}`,
  backToPolicy: "Volver a la protección",

  // Steps
  step1Label: "Seleccionar información",
  step2Label: "Revisar y confirmar",

  // Intro
  intro:
    "Elige qué información de la protección actual quieres conservar en la nueva. Los apartados que no marques se dejarán en blanco — podrás completarlos después en el asistente de la nueva protección.",
  confirmRequirement:
    "Importante: aunque copies información, los actores deberán reconfirmarla desde su portal antes de poder activar la nueva protección.",

  // Dates
  datesTitle: "Vigencia de la nueva protección",
  datesSubtitle: "Estas fechas siempre son nuevas; no se copian de la protección anterior.",
  startDate: "Fecha de inicio",
  endDate: "Fecha de término",

  // Policy terms (prominent)
  policyTermsTitle: "Términos económicos y de contrato",
  policyTermsWarning:
    "Revisa cuidadosamente — estos son los términos económicos y el tipo de garantía. Si renovarás con un aumento de renta, ajusta el monto en el siguiente paso.",
  guarantorType: "Tipo de garantía",
  guarantorTypeHelper:
    "Al cambiar el tipo de garantía se muestran u ocultan las secciones de Obligado Solidario y Aval.",
  guarantorOptions: {
    NONE: "Sin garante",
    JOINT_OBLIGOR: "Obligado Solidario",
    AVAL: "Aval",
    BOTH: "Obligado Solidario y Aval",
  },
  financial: "Datos financieros (renta, depósito, mantenimiento, IVA, aumento anual)",
  contract: "Contrato (duración, método de pago)",
  packageAndPricing: "Paquete y repartición de precio",

  // Property
  propertyTitle: "Propiedad",
  propertyAddress: "Dirección",
  propertyTypeAndDescription: "Tipo y descripción",
  propertyFeatures: "Características (estacionamiento, amueblado, mascotas, reglas, inventario)",
  propertyServices: "Servicios (electricidad, agua, gas, internet, cable) e incluidos en renta",

  // Landlord
  landlordTitle: "Arrendador",
  landlordBasicInfo: "Datos generales (nombre, RFC, CURP, empresa, representante legal)",
  landlordContact: "Contacto (email, teléfonos)",
  landlordAddress: "Domicilio",
  landlordBanking: "Información bancaria",
  landlordPropertyDeed: "Escritura y folio del registro público",
  landlordCfdi: "Datos fiscales / CFDI",
  landlordDocuments: "Documentos",

  // Tenant
  tenantTitle: "Arrendatario",
  tenantBasicInfo: "Datos generales",
  tenantContact: "Contacto",
  tenantAddress: "Domicilio actual",
  tenantEmployment: "Empleo e ingresos",
  tenantRentalHistory: "Historial de arrendamiento",
  tenantReferences: "Referencias (personales y comerciales)",
  tenantPaymentPreferences: "Preferencias de pago (método, CFDI)",
  tenantDocuments: "Documentos",

  // Joint obligor
  jointObligorTitle: "Obligado Solidario",
  jointObligorBasicInfo: "Datos generales",
  jointObligorContact: "Contacto",
  jointObligorAddress: "Domicilio",
  jointObligorEmployment: "Empleo e ingresos",
  jointObligorGuarantee: "Garantía (método y datos)",
  jointObligorMarital: "Estado civil",
  jointObligorReferences: "Referencias",
  jointObligorDocuments: "Documentos",

  // Aval
  avalTitle: "Aval",
  avalBasicInfo: "Datos generales",
  avalContact: "Contacto",
  avalAddress: "Domicilio",
  avalEmployment: "Empleo e ingresos",
  avalGuaranteeProperty: "Propiedad en garantía",
  avalMarital: "Estado civil",
  avalReferences: "Referencias",
  avalDocuments: "Documentos",

  // Placeholder cards
  missingJointObligorPlaceholder:
    "No hay Obligado Solidario previo — se agregará en el siguiente paso del asistente.",
  missingAvalPlaceholder:
    "No hay Aval previo — se agregará en el siguiente paso del asistente.",

  // Card controls
  includeCard: "Incluir este apartado",
  selectAll: "Seleccionar todo",
  clearAll: "Limpiar",

  // Preview
  previewTitle: "Revisar y confirmar",
  previewIntro:
    "Esto es lo que se conservará en la nueva protección. Los apartados que aparezcan como \"No copiado\" se dejarán en blanco.",
  previewCopied: "Se copia",
  previewBlank: "No copiado",
  previewDocuments: (count: number) => `${count} documento${count === 1 ? "" : "s"}`,

  // Buttons
  next: "Siguiente",
  back: "Volver a editar",
  submit: "Confirmar y crear renovación",
  submitting: "Creando renovación…",

  // Toasts
  success: "Renovación creada",
  successDescription: (newNumber: string, docsCopied: number, docsFailed: number) =>
    `Se creó la protección #${newNumber}${
      docsCopied > 0 ? `, ${docsCopied} documentos copiados` : ""
    }${docsFailed > 0 ? ` (${docsFailed} fallaron)` : ""}.`,
  error: "No se pudo crear la renovación",

  // Validation
  validationError: "Revisa los campos marcados",
  datesRequired: "Ambas fechas son obligatorias",
  endDateAfterStart: "La fecha de término debe ser posterior a la fecha de inicio",
};
