# Utilities Documentation

## Overview

This directory contains utility functions and helpers used throughout the application. The key utilities are the `prepareForDB` functions that transform UI data to database format for each actor type.

## Directory Structure

```
utils/
├── tenant/
│   └── prepareForDB.ts      # Tenant data transformation
├── landlord/
│   └── prepareForDB.ts      # Landlord data transformation
├── aval/
│   └── prepareForDB.ts      # Aval data transformation
├── joint-obligor/
│   └── prepareForDB.ts      # Joint Obligor transformation
├── validation/              # Validation helpers
├── formatting/             # Data formatting utilities
└── types/                  # Type utilities
```

## PrepareForDB Utilities

These utilities transform schema-validated data into Prisma-compatible format for database operations.

### Core Responsibilities

1. **Field Mapping**: UI field names → database columns
2. **Type Conversion**: String dates → Date objects
3. **Relationship Handling**: Nested objects → Prisma relations
4. **Null Handling**: Undefined → null for database
5. **Special Logic**: Actor-specific transformations

### Tenant Example

```typescript
export function prepareTenantForDB(
  data: TenantComplete | TenantPartial,
  policyId: string,
  actorId?: string
): Prisma.TenantCreateInput | Prisma.TenantUpdateInput {
  const tenantType = data.tenantType || 'INDIVIDUAL';
  const isCompany = tenantType === 'COMPANY';

  const dbData: any = {
    // Link to policy
    policy: {
      connect: { id: policyId }
    },

    // Type field
    tenantType,

    // Map fields based on type
    ...(isCompany ? {
      companyName: data.companyName,
      rfc: data.rfc,
      // ... company fields
    } : {
      firstName: data.firstName,
      paternalLastName: data.paternalLastName,
      // ... individual fields
    }),

    // Handle address relation
    addressDetails: data.addressDetails ? {
      create: {
        street: data.addressDetails.street,
        // ... address fields
      }
    } : undefined,

    // Handle references array
    personalReferences: data.personalReferences ? {
      deleteMany: {}, // Clear existing
      create: data.personalReferences.map(ref => ({
        name: ref.name,
        // ... reference fields
      }))
    } : undefined,
  };

  return dbData;
}
```

### Landlord Special Features

Handles multiple landlords and policy field extraction:

```typescript
export function prepareMultiLandlordsForDB(
  landlords: Landlord[],
  policyId: string
): {
  landlordData: Prisma.LandlordCreateManyInput[],
  policyData: Partial<PolicyFinancialData>
} {
  const primaryLandlord = landlords.find(l => l.isPrimary);

  // Extract policy-level financial data
  const policyData = {
    monthlyRent: primaryLandlord?.monthlyRent,
    depositAmount: primaryLandlord?.depositAmount,
    // ... other financial fields
  };

  // Prepare each landlord
  const landlordData = landlords.map(landlord => ({
    ...prepareLandlordForDB(landlord, policyId),
    isPrimary: landlord.isPrimary,
  }));

  return { landlordData, policyData };
}
```

### Joint Obligor Flexible Guarantee

Handles conditional fields based on guarantee method:

```typescript
if (guaranteeMethod === 'income') {
  dbData.bankName = data.bankName;
  dbData.accountHolder = data.accountHolder;
  dbData.monthlyIncome = data.monthlyIncome;
} else if (guaranteeMethod === 'property') {
  dbData.propertyValue = data.propertyValue;
  dbData.propertyDeedNumber = data.propertyDeedNumber;
  dbData.guaranteePropertyDetails = {
    create: data.guaranteePropertyDetails
  };
}
```

## Validation Utilities

### Field Validation
```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRFC(rfc: string): boolean {
  // Mexican RFC validation
  const rfcRegex = /^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfc.toUpperCase());
}

export function validateCURP(curp: string): boolean {
  // Mexican CURP validation
  const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/;
  return curpRegex.test(curp.toUpperCase());
}
```

### Phone Number Formatting
```typescript
export function formatPhoneNumber(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as Mexican phone
  if (digits.length === 10) {
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  }

  return phone;
}
```

## Type Utilities

### Type Guards
```typescript
export function isIndividualActor(
  data: ActorData
): data is IndividualActorData {
  return 'firstName' in data && 'paternalLastName' in data;
}

export function isCompanyActor(
  data: ActorData
): data is CompanyActorData {
  return 'companyName' in data && 'rfc' in data;
}
```

### Type Helpers
```typescript
// Deep partial type
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

// Nullable fields
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

## Date Utilities

```typescript
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string'
    ? new Date(birthDate)
    : birthDate;

  const ageDiff = Date.now() - birth.getTime();
  const ageDate = new Date(ageDiff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
```

## Name Formatting

```typescript
export function formatFullName(
  firstName?: string,
  paternalLastName?: string,
  maternalLastName?: string,
  middleName?: string
): string {
  const parts = [
    firstName,
    middleName,
    paternalLastName,
    maternalLastName
  ].filter(Boolean);

  return parts.join(' ').trim();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

## Money Utilities

```typescript
export function formatCurrency(
  amount: number,
  currency: string = 'MXN'
): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function parseAmount(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}
```

## Address Utilities

```typescript
export function formatAddress(address: Address): string {
  const parts = [
    address.street,
    address.exteriorNumber,
    address.interiorNumber && `Int. ${address.interiorNumber}`,
    address.neighborhood,
    address.municipality,
    address.state,
    address.postalCode,
  ].filter(Boolean);

  return parts.join(', ');
}

export function parseAddressComponents(fullAddress: string): Partial<Address> {
  // Parse address string into components
  // Implementation depends on address format
}
```

## Error Handling Utilities

```typescript
export function formatZodErrors(
  error: ZodError
): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach(issue => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return errors;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
```

## Common Patterns

### Safe Data Access
```typescript
export function safeGet<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      return defaultValue;
    }
  }

  return result ?? defaultValue;
}
```

### Debounce Function
```typescript
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

## Testing Utilities

```typescript
export function createMockActor(
  type: ActorType,
  overrides: Partial<ActorData> = {}
): ActorData {
  const base = {
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    // ... default fields
  };

  return { ...base, ...overrides };
}

export function generateId(): string {
  return Math.random().toString(36).substring(7);
}
```

## Best Practices

### DO ✅
- Keep utilities pure (no side effects)
- Add TypeScript types for all functions
- Document complex logic
- Write unit tests for utilities
- Use descriptive function names

### DON'T ❌
- Mix business logic with utilities
- Access global state
- Make API calls from utilities
- Mutate input parameters
- Ignore edge cases

---

For more information on how these utilities fit into the larger system, see the [Actor System Architecture](../../docs/ACTOR_SYSTEM_ARCHITECTURE.md) documentation.