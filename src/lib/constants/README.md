# Constants Documentation

## Overview

This directory contains configuration constants, field mappings, and static data used throughout the actor system. These constants ensure consistency across the application and make the system easily configurable.

## Directory Structure

```
constants/
├── actorConfig.ts              # Actor configuration and tabs
├── actorDocumentRequirements.ts # Required documents per actor type
├── actorSectionConfig.ts       # Actor section configuration
├── actorTabFields.ts           # Common tab field utilities
├── avalTabFields.ts            # Aval field mappings
├── businessConfig.ts           # Business-level configuration
├── documentCategories.ts       # Document category validation config
├── formMessages.ts             # Validation and UI messages
├── investigationConfig.ts      # Investigation configuration
├── jointObligorTabFields.ts    # Joint Obligor field mappings
├── landlordTabFields.ts        # Landlord field mappings
├── paymentConfig.ts            # Payment configuration
└── tenantTabFields.ts          # Tenant field mappings
```

## Actor Configuration (`actorConfig.ts`)

Central configuration for all actor types:

```typescript
export const actorConfig = {
  tenant: {
    personTabs: [
      { id: 'personal', label: 'Información Personal', icon: User },
      { id: 'employment', label: 'Empleo', icon: Briefcase },
      { id: 'financial', label: 'Información Financiera', icon: CreditCard },
      { id: 'references', label: 'Referencias', icon: Users },
      { id: 'documents', label: 'Documentos', icon: FileText },
    ],
    companyTabs: [
      { id: 'personal', label: 'Información de la Empresa', icon: Building2 },
      { id: 'financial', label: 'Información Financiera', icon: CreditCard },
      { id: 'references', label: 'Referencias', icon: Users },
      { id: 'documents', label: 'Documentos', icon: FileText },
    ],
  },
  // ... other actors
};
```

Note: `actorConfig` entries hold `personTabs`/`companyTabs` only. Required documents
live in `actorDocumentRequirements.ts`, not on `actorConfig`.

## Tab Field Mappings — DEPRECATED (#168)

Per-tab field lists are **derived from the canonical domain schemas** now:
`src/lib/domain/<entity>/adapters/form.ts` exposes `.keyof()`-derived tab-field lists
that can never drift from validation.

What remains in this directory is transitional:

- `src/lib/constants/{tenant,landlord,aval,jointObligor}TabFields.ts` — **dead code**
  (their only consumer, `useFormWizardSubmissionTRPC`, has zero importers); they carry
  16 of the repo's remaining `as any`. Deletion tracked in #168.
- `src/lib/constants/actorTabFields.ts` — still **live in one place**: the actor
  router's tab-NAME gate (`shared.router.ts:537 getTabFields`). A new tab must be
  registered there today or `actor.update` returns BAD_REQUEST — #168 routes this
  gate through the domain form adapters and then deletes the whole layer.

Do not add fields to any of these files; add them to the domain tab schema instead.

## Form Messages (`formMessages.ts`)

Centralized validation strings and toast payloads. UI labels live in `src/lib/i18n/`, not
here — only `VALIDATION_MESSAGES` and `TOAST_MESSAGES` remain (consumed by the validation
utils and the wizard submission hook):

```typescript
export const VALIDATION_MESSAGES = {
  required: 'Este campo es requerido',
  invalidEmail: 'Correo electrónico inválido',
  invalidRFC: 'RFC inválido',
  // ...
} as const;

export const TOAST_MESSAGES = {
  saved: { title: '✓ Guardado', description: 'Información guardada exitosamente' },
  saveError: { title: 'Error', description: 'Error al guardar la información', variant: 'destructive' },
  // ...
} as const;
```

## Document Upload Validation (`documentCategories.ts`)

Category-specific validation rules for file uploads. The UI automatically uses these rules to display hints and enforce limits.

### Configuration

```typescript
// Default validation (applies to all categories)
export const defaultValidationConfig: CategoryValidationConfig = {
  maxSizeMB: 5,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
  formatsLabel: 'PDF, JPG, PNG, WEBP',
};

// Category-specific overrides
export const categoryValidationOverrides: Partial<Record<DocumentCategory, Partial<CategoryValidationConfig>>> = {
  [DocumentCategory.PROPERTY_DEED]: { maxSizeMB: 10 },
  // Add more overrides as needed
};
```

### Usage

```typescript
import { getCategoryValidation } from '@/lib/constants/documentCategories';

// Get validation config for a category
const config = getCategoryValidation(DocumentCategory.PROPERTY_DEED);
// Returns: { maxSizeMB: 10, allowedMimeTypes: [...], formatsLabel: 'PDF, JPG, PNG, WEBP' }

// Default if no category
const defaultConfig = getCategoryValidation();
// Returns: { maxSizeMB: 5, ... }
```

### UI Integration

`DocumentManagerCard` automatically passes validation config to `DocumentUploader`:

```typescript
const validationConfig = getCategoryValidation(category);

<DocumentUploader
  maxSizeMB={validationConfig.maxSizeMB}
  formatsHint={validationConfig.formatsLabel}
  // ...
/>
```

The upload hint displays: "Máx {maxSizeMB}MB. Formatos: {formatsLabel}"

### Adding Custom Limits

To add a custom limit for a category, add to `categoryValidationOverrides`:

```typescript
export const categoryValidationOverrides = {
  [DocumentCategory.PROPERTY_DEED]: { maxSizeMB: 10 },
  [DocumentCategory.PROPERTY_APPRAISAL]: { maxSizeMB: 15 },
  [DocumentCategory.COMPANY_CONSTITUTION]: {
    maxSizeMB: 20,
    formatsLabel: 'PDF only',
    allowedMimeTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
  },
};
```

## Actor Document Requirements (`actorDocumentRequirements.ts`)

Centralized configuration for required documents per actor type. Uses the Prisma-compatible `DocumentCategory` enum from `@/lib/enums`.

### Data Structure

```typescript
export const ACTOR_DOCUMENT_REQUIREMENTS = {
  tenant: {
    individual: [
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.INCOME_PROOF, required: true },
      { category: DocumentCategory.ADDRESS_PROOF, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
      { category: DocumentCategory.IMMIGRATION_DOCUMENT, required: true, condition: 'foreign' },
    ],
    company: [
      { category: DocumentCategory.COMPANY_CONSTITUTION, required: true },
      { category: DocumentCategory.LEGAL_POWERS, required: true },
      { category: DocumentCategory.IDENTIFICATION, required: true },
      { category: DocumentCategory.TAX_STATUS_CERTIFICATE, required: true },
      { category: DocumentCategory.BANK_STATEMENT, required: true },
    ],
  },
  // ... landlord, aval, jointObligor
};
```

### Conditional Requirements

Documents can have conditions that determine when they apply:

- `'foreign'` - Required only for actors with foreign nationality
- `'propertyGuarantee'` - Required only for property-based guarantees (Joint Obligor)
- `'incomeGuarantee'` - Required only for income-based guarantees (Joint Obligor)

### Helper Functions

```typescript
// Get all document requirements (filtered by conditions)
getDocumentRequirements(
  actorType: ActorType,
  isCompany: boolean,
  options?: { nationality?: 'MEXICAN' | 'FOREIGN'; guaranteeMethod?: 'income' | 'property' }
): DocumentRequirement[]

// Get only required documents
getRequiredDocuments(actorType, isCompany, options): DocumentRequirement[]

// Check if all required documents are uploaded
areRequiredDocumentsUploaded(
  actorType: ActorType,
  isCompany: boolean,
  uploadedCategories: Set<DocumentCategory> | DocumentCategory[],
  options?: GetDocumentRequirementsOptions
): boolean
```

### Usage in Services

The `validateRequiredDocuments()` method in each actor service uses these helpers:

```typescript
// Example from TenantService
protected async validateRequiredDocuments(tenantId: string): AsyncResult<boolean> {
  const tenant = await this.getById(tenantId);
  const isCompany = tenant.value.tenantType === 'COMPANY';

  const requiredDocs = getRequiredDocuments('tenant', isCompany, {
    nationality: tenant.value.nationality,
  });

  // Query uploaded documents and compare...
}
```

```

## Adding New Constants

### 1. Create Actor Tab Fields

```typescript
// src/lib/constants/newActorTabFields.ts
export const newActorIndividualTabFields = {
  personal: ['field1', 'field2'],
  // ... tabs
};

export function getNewActorTabFields(
  tab: string,
  type: 'INDIVIDUAL' | 'COMPANY'
): string[] {
  // Implementation
}
```

### 2. Add to Actor Config

```typescript
// actorConfig.ts
export const actorConfig = {
  // ... existing actors
  newActor: {
    personTabs: [...],
    companyTabs: [...],
    requiredDocuments: {...},
  },
};
```

### 3. Export from Index

```typescript
// index.ts
export * from './newActorTabFields';
```


## Best Practices

### DO ✅
- Use TypeScript const assertions for type safety
- Group related constants together
- Export types alongside constants
- Document special values or rules
- Use descriptive names

### DON'T ❌
- Hardcode values in components
- Duplicate constant definitions
- Mix configuration with logic
- Use magic numbers/strings
- Forget to update when adding features

## Testing Constants

```typescript
describe('Tab Fields', () => {
  it('should have all required fields defined', () => {
    const allFields = Object.values(tenantIndividualTabFields).flat();
    expect(allFields).toContain('firstName');
    expect(allFields).toContain('email');
  });

  it('should not have duplicate fields across tabs', () => {
    // Test for unique fields per tab
  });
});
```

---

For more information on how these constants are used throughout the system, see the [Actor System Architecture](../../docs/ACTOR_SYSTEM_ARCHITECTURE.md) documentation.