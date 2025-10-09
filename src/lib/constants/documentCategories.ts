import { DocumentCategory } from '@/types/policy';

export interface DocumentCategoryInfo {
  category: DocumentCategory;
  title: string;
  description: string;
  documentType: string;
  required: boolean;
  forCompany?: boolean;
  forIndividual?: boolean;
  forPropertyGuarantee?: boolean;
}

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

// Document requirements by actor type and entity type
export const documentCategories: DocumentCategoryInfo[] = [
  // Common documents for all individuals
  {
    category: DocumentCategory.IDENTIFICATION,
    title: documentCategoryLabels[DocumentCategory.IDENTIFICATION].title,
    description: documentCategoryLabels[DocumentCategory.IDENTIFICATION].description,
    documentType: 'identification',
    required: true,
    forIndividual: true
  },
  {
    category: DocumentCategory.INCOME_PROOF,
    title: documentCategoryLabels[DocumentCategory.INCOME_PROOF].title,
    description: documentCategoryLabels[DocumentCategory.INCOME_PROOF].description,
    documentType: 'income_proof',
    required: true,
    forIndividual: true
  },
  {
    category: DocumentCategory.ADDRESS_PROOF,
    title: documentCategoryLabels[DocumentCategory.ADDRESS_PROOF].title,
    description: documentCategoryLabels[DocumentCategory.ADDRESS_PROOF].description,
    documentType: 'address_proof',
    required: false,
    forIndividual: true
  },
  {
    category: DocumentCategory.BANK_STATEMENT,
    title: documentCategoryLabels[DocumentCategory.BANK_STATEMENT].title,
    description: documentCategoryLabels[DocumentCategory.BANK_STATEMENT].description,
    documentType: 'bank_statement',
    required: false,
    forIndividual: true,
    forCompany: true
  },
  {
    category: DocumentCategory.TAX_RETURN,
    title: documentCategoryLabels[DocumentCategory.TAX_RETURN].title,
    description: documentCategoryLabels[DocumentCategory.TAX_RETURN].description,
    documentType: 'tax_return',
    required: false,
    forIndividual: true,
    forCompany: true
  },
  {
    category: DocumentCategory.EMPLOYMENT_LETTER,
    title: documentCategoryLabels[DocumentCategory.EMPLOYMENT_LETTER].title,
    description: documentCategoryLabels[DocumentCategory.EMPLOYMENT_LETTER].description,
    documentType: 'employment_letter',
    required: false,
    forIndividual: true
  },
  {
    category: DocumentCategory.PAYROLL_RECEIPT,
    title: documentCategoryLabels[DocumentCategory.PAYROLL_RECEIPT].title,
    description: documentCategoryLabels[DocumentCategory.PAYROLL_RECEIPT].description,
    documentType: 'payroll_receipt',
    required: false,
    forIndividual: true
  },
  {
    category: DocumentCategory.CREDIT_REPORT,
    title: documentCategoryLabels[DocumentCategory.CREDIT_REPORT].title,
    description: documentCategoryLabels[DocumentCategory.CREDIT_REPORT].description,
    documentType: 'credit_report',
    required: false,
    forIndividual: true,
    forCompany: true
  },
  {
    category: DocumentCategory.UTILITY_BILL,
    title: documentCategoryLabels[DocumentCategory.UTILITY_BILL].title,
    description: documentCategoryLabels[DocumentCategory.UTILITY_BILL].description,
    documentType: 'utility_bill',
    required: false,
    forIndividual: true,
    forCompany: true
  },
  // Documents for foreign individuals
  {
    category: DocumentCategory.PASSPORT,
    title: documentCategoryLabels[DocumentCategory.PASSPORT].title,
    description: documentCategoryLabels[DocumentCategory.PASSPORT].description,
    documentType: 'passport',
    required: false,
    forIndividual: true
  },
  {
    category: DocumentCategory.IMMIGRATION_DOCUMENT,
    title: documentCategoryLabels[DocumentCategory.IMMIGRATION_DOCUMENT].title,
    description: documentCategoryLabels[DocumentCategory.IMMIGRATION_DOCUMENT].description,
    documentType: 'immigration_document',
    required: false,
    forIndividual: true
  },
  // Company-specific documents
  {
    category: DocumentCategory.COMPANY_CONSTITUTION,
    title: documentCategoryLabels[DocumentCategory.COMPANY_CONSTITUTION].title,
    description: documentCategoryLabels[DocumentCategory.COMPANY_CONSTITUTION].description,
    documentType: 'company_constitution',
    required: true,
    forCompany: true
  },
  {
    category: DocumentCategory.LEGAL_POWERS,
    title: documentCategoryLabels[DocumentCategory.LEGAL_POWERS].title,
    description: documentCategoryLabels[DocumentCategory.LEGAL_POWERS].description,
    documentType: 'legal_powers',
    required: true,
    forCompany: true
  },
  {
    category: DocumentCategory.TAX_STATUS_CERTIFICATE,
    title: documentCategoryLabels[DocumentCategory.TAX_STATUS_CERTIFICATE].title,
    description: documentCategoryLabels[DocumentCategory.TAX_STATUS_CERTIFICATE].description,
    documentType: 'tax_status_certificate',
    required: true,
    forCompany: true
  },
  // Property guarantee documents (for Aval)
  {
    category: DocumentCategory.PROPERTY_DEED,
    title: documentCategoryLabels[DocumentCategory.PROPERTY_DEED].title,
    description: documentCategoryLabels[DocumentCategory.PROPERTY_DEED].description,
    documentType: 'property_deed',
    required: true,
    forPropertyGuarantee: true
  },
  {
    category: DocumentCategory.PROPERTY_TAX_STATEMENT,
    title: documentCategoryLabels[DocumentCategory.PROPERTY_TAX_STATEMENT].title,
    description: documentCategoryLabels[DocumentCategory.PROPERTY_TAX_STATEMENT].description,
    documentType: 'property_tax_statement',
    required: true,
    forPropertyGuarantee: true
  },
  {
    category: DocumentCategory.PROPERTY_REGISTRY,
    title: documentCategoryLabels[DocumentCategory.PROPERTY_REGISTRY].title,
    description: documentCategoryLabels[DocumentCategory.PROPERTY_REGISTRY].description,
    documentType: 'property_registry',
    required: false,
    forPropertyGuarantee: true
  },
  {
    category: DocumentCategory.PROPERTY_APPRAISAL,
    title: documentCategoryLabels[DocumentCategory.PROPERTY_APPRAISAL].title,
    description: documentCategoryLabels[DocumentCategory.PROPERTY_APPRAISAL].description,
    documentType: 'property_appraisal',
    required: false,
    forPropertyGuarantee: true
  },
  // Special documents
  {
    category: DocumentCategory.MARRIAGE_CERTIFICATE,
    title: documentCategoryLabels[DocumentCategory.MARRIAGE_CERTIFICATE].title,
    description: documentCategoryLabels[DocumentCategory.MARRIAGE_CERTIFICATE].description,
    documentType: 'marriage_certificate',
    required: false,
    forIndividual: true
  },
  {
    category: DocumentCategory.OTHER,
    title: documentCategoryLabels[DocumentCategory.OTHER].title,
    description: documentCategoryLabels[DocumentCategory.OTHER].description,
    documentType: 'other',
    required: false,
    forIndividual: true,
    forCompany: true
  }
];

// Helper functions
export function getDocumentCategoryLabel(category: DocumentCategory): string {
  return documentCategoryLabels[category]?.title || category;
}

export function getDocumentCategoryDescription(category: DocumentCategory): string {
  return documentCategoryLabels[category]?.description || '';
}

export function getDocumentCategoriesByActorType(
  actorType: 'landlord' | 'tenant' | 'joint-obligor' | 'aval',
  isCompany: boolean = false,
  includePropertyGuarantee: boolean = false
): DocumentCategoryInfo[] {
  return documentCategories.filter(doc => {
    // Property guarantee documents only for Aval
    if (doc.forPropertyGuarantee) {
      return includePropertyGuarantee || actorType === 'aval';
    }

    // Company vs Individual filtering
    if (isCompany) {
      return doc.forCompany === true;
    } else {
      return doc.forIndividual === true;
    }
  });
}

export function getRequiredDocumentCategories(
  actorType: 'landlord' | 'tenant' | 'joint-obligor' | 'aval',
  isCompany: boolean = false
): DocumentCategoryInfo[] {
  return getDocumentCategoriesByActorType(
    actorType,
    isCompany,
    actorType === 'aval'
  ).filter(doc => doc.required);
}

export function getOptionalDocumentCategories(
  actorType: 'landlord' | 'tenant' | 'joint-obligor' | 'aval',
  isCompany: boolean = false
): DocumentCategoryInfo[] {
  return getDocumentCategoriesByActorType(
    actorType,
    isCompany,
    actorType === 'aval'
  ).filter(doc => !doc.required);
}