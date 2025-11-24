# Constants Documentation

## Overview

This directory contains configuration constants, field mappings, and static data used throughout the actor system. These constants ensure consistency across the application and make the system easily configurable.

## Directory Structure

```
constants/
├── actorConfig.ts          # Actor configuration and tabs
├── actorTabFields.ts       # Common tab field utilities
├── tenantTabFields.ts      # Tenant field mappings
├── landlordTabFields.ts    # Landlord field mappings
├── avalTabFields.ts        # Aval field mappings
├── jointObligorTabFields.ts # Joint Obligor field mappings
└── formMessages.ts         # Validation and UI messages
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
    requiredDocuments: {
      individual: ['ine', 'proof_of_address', 'proof_of_income'],
      company: ['company_constitution', 'legal_powers', 'rfc_document'],
    },
  },
  // ... other actors
};
```

## Tab Field Mappings

Define which fields belong to each tab for validation and saving:

### Tenant Tab Fields (`tenantTabFields.ts`)

```typescript
export const tenantIndividualTabFields: Record<TenantIndividualTab, string[]> = {
  personal: [
    'tenantType',
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'birthDate',
    'birthPlace',
    'nationality',
    'curp',
    'rfc',
    'identificationNumber',
    'email',
    'phoneNumber',
    'alternatePhoneNumber',
    'addressDetails',
    'addressDetails.street',
    // ... nested fields
  ],
  employment: [
    'employmentStatus',
    'occupation',
    'employerName',
    'position',
    'monthlyIncome',
    'employerAddressDetails',
    // ... employer address fields
  ],
  financial: [
    'monthlyIncome',
    'additionalIncome',
    'bankName',
    'accountHolder',
    'accountNumber',
  ],
  // ... other tabs
};
```

### Helper Functions

```typescript
// Get fields for specific tab
export function getTenantTabFields(
  tab: string,
  tenantType: 'INDIVIDUAL' | 'COMPANY'
): string[] {
  if (tenantType === 'COMPANY') {
    return tenantCompanyTabFields[tab] || [];
  }
  return tenantIndividualTabFields[tab] || [];
}

// Check if tab is complete
export function isTabComplete(
  tab: string,
  data: any,
  actorType: 'INDIVIDUAL' | 'COMPANY'
): boolean {
  const fields = getTenantTabFields(tab, actorType);

  return fields.every(field => {
    const value = getNestedValue(data, field);
    return value !== null && value !== undefined && value !== '';
  });
}
```

## Special Actor Features

### Landlord - Multiple Support
```typescript
export const landlordTabFields = {
  // ...fields
  isPrimary: true, // One must be primary
  ownershipPercentage: 0, // If co-ownership
};

export function validateLandlordArray(landlords: Landlord[]): boolean {
  // Ensure exactly one primary
  const primaryCount = landlords.filter(l => l.isPrimary).length;
  return primaryCount === 1;
}
```

### Aval - Mandatory Property
```typescript
export const avalTabFields = {
  property: [
    'hasPropertyGuarantee', // Always true
    'propertyValue',
    'propertyDeedNumber',
    'propertyRegistry',
    'maritalStatus',
    'spouseName', // Required if married
    // ...
  ],
};
```

### Joint Obligor - Flexible Guarantee
```typescript
export function getGuaranteeFields(
  guaranteeMethod: 'income' | 'property'
): string[] {
  if (guaranteeMethod === 'income') {
    return [
      'bankName',
      'accountHolder',
      'monthlyIncome',
    ];
  } else {
    return [
      'propertyValue',
      'propertyDeedNumber',
      'guaranteePropertyDetails',
      // ... property fields
    ];
  }
}
```

## Form Messages (`formMessages.ts`)

Centralized messages for consistency:

```typescript
export const formMessages = {
  validation: {
    required: 'Este campo es requerido',
    email: 'Ingrese un email válido',
    phone: 'Ingrese un teléfono válido',
    rfc: 'Ingrese un RFC válido',
    curp: 'Ingrese un CURP válido',
    minLength: 'Mínimo {min} caracteres',
    maxLength: 'Máximo {max} caracteres',
    minValue: 'El valor mínimo es {min}',
    maxValue: 'El valor máximo es {max}',
  },

  success: {
    saved: 'Información guardada exitosamente',
    submitted: 'Formulario enviado exitosamente',
    uploaded: 'Documento cargado exitosamente',
  },

  error: {
    generic: 'Ocurrió un error. Intente nuevamente',
    network: 'Error de conexión',
    validation: 'Por favor corrija los errores en el formulario',
    unauthorized: 'No autorizado',
  },

  info: {
    saving: 'Guardando...',
    loading: 'Cargando...',
    uploading: 'Subiendo archivo...',
  },
};
```

## Document Categories

```typescript
export const DOCUMENT_CATEGORIES = {
  IDENTITY: {
    label: 'Identificación',
    types: ['ine', 'passport', 'drivers_license'],
    maxFiles: 2,
  },
  ADDRESS: {
    label: 'Comprobante de Domicilio',
    types: ['utility_bill', 'bank_statement', 'lease'],
    maxFiles: 1,
  },
  INCOME: {
    label: 'Comprobante de Ingresos',
    types: ['pay_stub', 'tax_return', 'bank_statement'],
    maxFiles: 3,
  },
  PROPERTY: {
    label: 'Documentos de Propiedad',
    types: ['deed', 'tax_statement', 'registry'],
    maxFiles: 5,
  },
} as const;
```

## Status Enums

```typescript
export const ACTOR_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  REJECTED: 'rejected',
} as const;

export const GUARANTEE_METHODS = {
  INCOME: 'income',
  PROPERTY: 'property',
} as const;

export const EMPLOYMENT_STATUS = {
  EMPLOYED: 'employed',
  SELF_EMPLOYED: 'self_employed',
  UNEMPLOYED: 'unemployed',
  RETIRED: 'retired',
} as const;
```

## Validation Rules

```typescript
export const VALIDATION_RULES = {
  name: {
    min: 2,
    max: 50,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: {
    pattern: /^[0-9]{10}$/,
    format: '### ### ####',
  },
  rfc: {
    pattern: /^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
  },
  curp: {
    pattern: /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/,
  },
  postalCode: {
    pattern: /^[0-9]{5}$/,
  },
  income: {
    min: 0,
    max: 10000000,
  },
};
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

## Environment-Specific Constants

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_TIMEOUTS = {
  default: isDevelopment ? 30000 : 10000,
  upload: isDevelopment ? 60000 : 30000,
};

export const FEATURE_FLAGS = {
  enableNewActor: process.env.NEXT_PUBLIC_ENABLE_NEW_ACTOR === 'true',
  debugMode: isDevelopment,
};
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