export const statuses = {
    policyStatus: {
        draft: 'Borrador',
        sent_to_tenant: 'Enviada a Inquilin@',
        in_progress: 'En Proceso',
        submitted: 'Completada por Inquilin@',
        under_review: 'En Revisión',
        approved: 'Aprobada',
        denied: 'Rechazada',
    } as Record<string, string>,

    // Full policy status labels (matching Prisma schema)
    policyStatusFull: {
        COLLECTING_INFO: 'Recopilando Información',
        PENDING_APPROVAL: 'Pendiente de Aprobación',
        ACTIVE: 'Activa',
        EXPIRED: 'Expirada',
        CANCELLED: 'Cancelada',
    } as Record<string, string>,

    guarantorType: {
        NONE: 'Sin Garantía',
        JOINT_OBLIGOR: 'Obligado Solidario',
        AVAL: 'Aval',
        BOTH: 'Ambos',
    } as Record<string, string>,

    propertyType: {
        HOUSE: 'Casa',
        APARTMENT: 'Departamento',
        COMMERCIAL: 'Local Comercial',
        OFFICE: 'Oficina',
        WAREHOUSE: 'Bodega',
        OTHER: 'Otro',
    } as Record<string, string>,

    employmentStatus: {
        EMPLOYED: 'Empleado',
        SELF_EMPLOYED: 'Autoempleado',
        BUSINESS_OWNER: 'Empresario',
        RETIRED: 'Jubilado',
        STUDENT: 'Estudiante',
        UNEMPLOYED: 'Desempleado',
        OTHER: 'Otro',
    } as Record<string, string>,

    paymentStatusFull: {
        PENDING: 'Pendiente',
        PROCESSING: 'Procesando',
        COMPLETED: 'Completado',
        FAILED: 'Fallido',
        CANCELLED: 'Cancelado',
        REFUNDED: 'Reembolsado',
        PARTIAL: 'Parcial',
        PENDING_VERIFICATION: 'Pendiente de Verificación',
    } as Record<string, string>,

    maritalStatus: {
        single: 'Soltero(a)',
        married_joint: 'Casado(a) — Bienes Mancomunados',
        married_separate: 'Casado(a) — Bienes Separados',
    } as Record<string, string>,

    guaranteeMethod: {
        property: 'Propiedad',
        income: 'Ingreso',
    } as Record<string, string>,

    nationality: {
        MEXICAN: 'Mexicana',
        FOREIGN: 'Extranjera',
    } as Record<string, string>,
};
