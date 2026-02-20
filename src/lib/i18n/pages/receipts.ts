export const receipts = {
  // Receipt type labels
  types: {
    RENT: 'Renta',
    ELECTRICITY: 'Electricidad',
    WATER: 'Agua',
    GAS: 'Gas',
    INTERNET: 'Internet',
    CABLE_TV: 'TV por Cable',
    PHONE: 'Teléfono',
    MAINTENANCE: 'Mantenimiento',
    OTHER: 'Otro',
  },

  // Receipt status labels
  status: {
    uploaded: 'Subido',
    notApplicable: 'No aplica',
    pending: 'Pendiente',
  },

  // Portal - Magic link page
  magicLink: {
    title: 'Portal de Comprobantes',
    subtitle: 'Accede a tu portal para subir tus comprobantes de pago',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@correo.com',
    submit: 'Enviar enlace de acceso',
    submitting: 'Enviando...',
    successTitle: 'Enlace enviado',
    successMessage: 'Te hemos enviado un enlace de acceso a tu correo electrónico. Revisa tu bandeja de entrada.',
    errorNotFound: 'No encontramos una protección activa asociada a este correo.',
    errorGeneric: 'Ocurrió un error. Intenta nuevamente.',
  },

  // Portal - Dashboard
  portal: {
    title: 'Mis Comprobantes',
    subtitle: 'Sube tus comprobantes de pago mensualmente',
    currentMonth: 'Mes actual',
    pastMonths: 'Meses anteriores',
    policyLabel: 'Protección',
    propertyLabel: 'Propiedad',
    selectPolicy: 'Seleccionar protección',
    noReceipts: 'No hay comprobantes para este período',
    completionSummary: (uploaded: number, total: number) =>
      `${uploaded}/${total} comprobantes`,
  },

  // Receipt slot
  slot: {
    upload: 'Subir comprobante',
    replace: 'Reemplazar',
    download: 'Descargar',
    delete: 'Eliminar',
    markNotApplicable: 'No aplica este mes',
    undoNotApplicable: 'Deshacer',
    uploadedOn: 'Subido el',
  },

  // Not applicable modal
  notApplicableModal: {
    title: 'Marcar como no aplica',
    description: (receiptType: string, month: string) =>
      `¿Estás seguro de que no tienes comprobante de ${receiptType} para ${month}?`,
    noteLabel: 'Nota (opcional)',
    notePlaceholder: 'Ej: El servicio no se cobró este mes',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  },

  // Upload
  upload: {
    selectFile: 'Seleccionar archivo',
    dragDrop: 'Arrastra un archivo aquí o haz clic para seleccionar',
    uploading: 'Subiendo...',
    success: 'Comprobante subido exitosamente',
    error: 'Error al subir el comprobante',
    maxSize: 'Máx 5MB. Formatos: PDF, JPG, PNG, WEBP',
  },

  // Admin page
  admin: {
    title: 'Comprobantes del Inquilino',
    backToPolicy: 'Volver a la protección',
    noTenant: 'Esta protección no tiene inquilino asignado.',
    notApproved: 'Los comprobantes solo están disponibles para protecciones aprobadas.',
    filterByMonth: 'Filtrar por mes',
    allMonths: 'Todos los meses',
    summary: {
      uploaded: 'Subidos',
      notApplicable: 'No aplica',
      pending: 'Pendientes',
    },
  },

  // Months
  months: {
    1: 'Enero',
    2: 'Febrero',
    3: 'Marzo',
    4: 'Abril',
    5: 'Mayo',
    6: 'Junio',
    7: 'Julio',
    8: 'Agosto',
    9: 'Septiembre',
    10: 'Octubre',
    11: 'Noviembre',
    12: 'Diciembre',
  } as Record<number, string>,
};
