/**
 * Type definitions for review components
 */

import { LucideIcon } from 'lucide-react';

// Icon type for review components
export type ReviewIcon = LucideIcon;

// Review status types
export type ValidationStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

// Actor types
export type ActorType = 'tenant' | 'landlord' | 'jointObligor' | 'aval';

// Document category types
export type DocumentCategory =
  | 'IDENTIFICATION'
  | 'INCOME_PROOF'
  | 'ADDRESS_PROOF'
  | 'BANK_STATEMENT'
  | 'PROPERTY_DEED'
  | 'TAX_RETURN'
  | 'EMPLOYMENT_LETTER'
  | 'COMPANY_CONSTITUTION'
  | 'PASSPORT'
  | 'OTHER';

// Document type
export type DocumentType =
  | 'ine'
  | 'passport'
  | 'rfc_document'
  | 'company_constitution'
  | 'property_deed'
  | 'property_tax'
  | 'bank_statement'
  | 'income_proof'
  | 'tax_return'
  | 'payroll_receipt'
  | 'utility_bill';

// Section type
export type SectionType =
  | 'personal_info'
  | 'work_info'
  | 'financial_info'
  | 'references'
  | 'address'
  | 'company_info';

// Status icon component type
export type StatusIconComponent = React.ComponentType<{ className?: string }>;