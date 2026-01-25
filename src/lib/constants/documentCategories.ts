import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";

// Complete document category mappings with Spanish labels
export const documentCategoryLabels: Record<DocumentCategory, { title: string; description: string }> = {
  [DocumentCategory.IDENTIFICATION]: {
    title: 'Identificación Oficial',
    description: 'INE, Pasaporte o Cédula Profesional'
  },
  [DocumentCategory.INCOME_PROOF]: {
    title: 'Comprobante de Ingresos',
    description: 'Recibos de nómina, estados de cuenta o declaración fiscal'
  },
  [DocumentCategory.ADDRESS_PROOF]: {
    title: 'Comprobante de Domicilio',
    description: 'Recibo de servicios (luz, agua, gas, teléfono) no mayor a 3 meses'
  },
  [DocumentCategory.BANK_STATEMENT]: {
    title: 'Estado de Cuenta Bancario',
    description: 'Estados de cuenta de los últimos 3 meses'
  },
  [DocumentCategory.PROPERTY_DEED]: {
    title: 'Escritura de Propiedad',
    description: 'Documento que acredite la propiedad del inmueble'
  },
  [DocumentCategory.TAX_RETURN]: {
    title: 'Declaración Fiscal',
    description: 'Declaración anual o parcial del SAT'
  },
  [DocumentCategory.EMPLOYMENT_LETTER]: {
    title: 'Carta Laboral',
    description: 'Carta de la empresa confirmando empleo y salario'
  },
  [DocumentCategory.PROPERTY_TAX_STATEMENT]: {
    title: 'Boleta Predial',
    description: 'Comprobante de pago del impuesto predial vigente'
  },
  [DocumentCategory.MARRIAGE_CERTIFICATE]: {
    title: 'Acta de Matrimonio',
    description: 'Documento oficial del registro civil'
  },
  [DocumentCategory.COMPANY_CONSTITUTION]: {
    title: 'Escritura Constitutiva',
    description: 'Acta constitutiva de la empresa con registro público'
  },
  [DocumentCategory.LEGAL_POWERS]: {
    title: 'Poderes Notariales',
    description: 'Poder notarial del representante legal'
  },
  [DocumentCategory.TAX_STATUS_CERTIFICATE]: {
    title: 'Constancia de Situación Fiscal',
    description: 'Documento del SAT con datos fiscales actualizados'
  },
  [DocumentCategory.CREDIT_REPORT]: {
    title: 'Reporte de Buró de Crédito',
    description: 'Historial crediticio reciente (no mayor a 3 meses)'
  },
  [DocumentCategory.PROPERTY_REGISTRY]: {
    title: 'Folio Real del Registro Público',
    description: 'Certificado de libertad de gravamen'
  },
  [DocumentCategory.PROPERTY_APPRAISAL]: {
    title: 'Avalúo de Propiedad',
    description: 'Avalúo comercial o catastral del inmueble'
  },
  [DocumentCategory.PASSPORT]: {
    title: 'Pasaporte',
    description: 'Pasaporte vigente (para extranjeros)'
  },
  [DocumentCategory.IMMIGRATION_DOCUMENT]: {
    title: 'Documento Migratorio',
    description: 'FM2, FM3 o tarjeta de residencia vigente'
  },
  [DocumentCategory.UTILITY_BILL]: {
    title: 'Recibo de Servicios',
    description: 'Recibo de luz, agua, gas o teléfono reciente'
  },
  [DocumentCategory.PAYROLL_RECEIPT]: {
    title: 'Recibo de Nómina',
    description: 'Últimos 3 recibos de nómina'
  },
  [DocumentCategory.OTHER]: {
    title: 'Otro Documento',
    description: 'Documento adicional relevante'
  }
};

/**
 * Helper functions for document category labels
 */
export function getDocumentCategoryLabel(category: DocumentCategory): string {
  return documentCategoryLabels[category]?.title || category;
}

export function getDocumentCategoryDescription(category: DocumentCategory): string {
  return documentCategoryLabels[category]?.description || '';
}

/**
 * For actor-specific document requirements, use:
 * @see actorDocumentRequirements.ts - getDocumentRequirements(), getRequiredDocuments(), etc.
 */

/**
 * File upload validation configuration
 */
export interface CategoryValidationConfig {
  maxSizeMB: number;
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  formatsLabel: string; // Human-readable format list for UI hints
}

export const defaultValidationConfig: CategoryValidationConfig = {
  maxSizeMB: 10,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
  formatsLabel: 'PDF, JPG, PNG, WEBP',
};

/**
 * Category-specific validation overrides (if needed)
 * Example: larger files for property appraisals
 */
export const categoryValidationOverrides: Partial<Record<DocumentCategory, Partial<CategoryValidationConfig>>> = {
  [DocumentCategory.PROPERTY_DEED]: { maxSizeMB: 35 },
};

/**
 * Get validation config for a document category
 */
export function getCategoryValidation(category?: DocumentCategory): CategoryValidationConfig {
  if (!category) return defaultValidationConfig;
  const override = categoryValidationOverrides[category];
  return override ? { ...defaultValidationConfig, ...override } : defaultValidationConfig;
}
