# Schema System Documentation

## Overview

This directory contains the Zod schema definitions that form the backbone of our actor validation system. After refactoring, we achieved a **60% reduction in validation code** by establishing a single source of truth for each actor type.

## Architecture

```
schemas/
├── shared/           # Reusable schema components
│   ├── address.schema.ts
│   ├── banking.schema.ts
│   ├── company.schema.ts
│   ├── contact.schema.ts
│   ├── person.schema.ts
│   ├── property.schema.ts
│   └── references.schema.ts
├── helpers.ts        # Schema helper utilities
├── policy/          # Policy-level schemas
│   └── wizard.ts
├── tenant/          # Tenant actor schemas
├── landlord/        # Landlord actor schemas
├── aval/           # Aval actor schemas
└── joint-obligor/   # Joint Obligor actor schemas
```

## Core Concepts

### 1. Three Validation Modes

Each actor supports three validation modes for different use cases:

```typescript
// Strict - All required fields must be present (final submission)
const strictSchema = tenantStrictSchema;

// Partial - Allows incomplete data (tab-by-tab saves)
const partialSchema = tenantPartialSchema;

// Admin - Flexible updates for staff corrections
const adminSchema = tenantAdminSchema;
```

### 2. Tab-Based Validation

Progressive data collection through tabs with independent validation:

```typescript
// Validate specific tab
const validation = validateTenantTab(
  'personal',     // tab name
  data,          // form data
  'INDIVIDUAL',  // actor type
  false         // isPartial
);
```

### 3. Discriminated Unions

Type-safe handling of variant types:

```typescript
// Individual vs Company
const TenantStrictSchema = z.union([
  tenantIndividualCompleteSchema,
  tenantCompanyCompleteSchema,
]);

// Flexible guarantee methods (Joint Obligor)
const guaranteeSchema = z.discriminatedUnion('guaranteeMethod', [
  incomeGuaranteeSchema,
  propertyGuaranteeSchema,
]);
```

## Actor Schemas

### Tenant (`/tenant/index.ts`)
- Supports INDIVIDUAL and COMPANY types
- 5 tabs: personal, employment, financial, references, documents
- Auto-migrates `isCompany` → `tenantType` enum

### Landlord (`/landlord/index.ts`)
- Supports multiple landlords per policy
- Primary landlord designation
- Financial data maps to Policy model
- 4 tabs: owner-info, property-info, financial-info, documents

### Aval (`/aval/index.ts`)
- Mandatory property guarantee
- Marriage info required for property owners
- Exactly 3 references required
- Uses `avalType` enum (INDIVIDUAL/COMPANY)

### Joint Obligor (`/joint-obligor/index.ts`)
- Flexible guarantee (income OR property)
- Relationship to tenant required
- Dynamic validation based on guarantee method
- Uses `jointObligorType` enum

## Shared Schemas

### Person Schema
Mexican 4-field naming convention:
```typescript
const personSchema = z.object({
  firstName: z.string(),
  middleName: z.string().optional(),
  paternalLastName: z.string(),
  maternalLastName: z.string(),
  // ... other fields
});
```

### Address Schema
Complete address with Mexican format:
```typescript
const addressSchema = z.object({
  street: z.string(),
  exteriorNumber: z.string(),
  interiorNumber: z.string().optional(),
  neighborhood: z.string(),
  municipality: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().default('México'),
});
```

## Usage Examples

### 1. Basic Validation
```typescript
import { tenantStrictSchema } from '@/lib/schemas/tenant';

const result = tenantStrictSchema.safeParse(data);
if (!result.success) {
  console.error(result.error.flatten());
}
```

### 2. Tab-Specific Validation
```typescript
import { validateTenantTab } from '@/lib/schemas/tenant';

const validation = validateTenantTab(
  'employment',
  formData,
  'INDIVIDUAL',
  true // partial validation
);
```

### 3. Type Generation
```typescript
import type { TenantComplete } from '@/lib/schemas/tenant';

// Automatically typed from schema
const tenant: TenantComplete = {
  tenantType: 'INDIVIDUAL',
  firstName: 'Juan',
  // ... all fields are type-checked
};
```

### 4. Creating a New Actor Schema

```typescript
// 1. Define tab schemas
const actorPersonalTabSchema = personSchema.extend({
  actorType: z.enum(['INDIVIDUAL', 'COMPANY']),
  specialField: z.string(),
});

// 2. Create complete schemas
export const actorIndividualCompleteSchema = z.object({
  ...actorPersonalTabSchema.shape,
  ...actorEmploymentTabSchema.shape,
  // ... other tabs
});

// 3. Define validation modes
export const actorStrictSchema = z.union([
  actorIndividualCompleteSchema,
  actorCompanyCompleteSchema,
]);

export const actorPartialSchema = actorStrictSchema.partial();

// 4. Export types
export type ActorComplete = z.infer<typeof actorStrictSchema>;
```

## Best Practices

### DO ✅
- Use shared schemas for common fields
- Create separate schemas for each tab
- Export TypeScript types from schemas
- Use discriminated unions for variant types
- Validate at the edge (router level)

### DON'T ❌
- Use `.refine()` on schemas that will be merged
- Duplicate validation logic
- Mix database concerns with validation
- Create deeply nested schemas
- Hardcode validation messages in components

## Common Patterns

### Optional Fields
```typescript
// Use our helper for consistent optional handling
import { optional } from '../helpers';

const schema = z.object({
  requiredField: z.string(),
  optionalField: optional(z.string()),
});
```

### Conditional Validation
```typescript
// Use discriminated unions
const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('A'), fieldA: z.string() }),
  z.object({ type: z.literal('B'), fieldB: z.number() }),
]);
```

### Array Validation
```typescript
// Exact count
references: z.array(referenceSchema).length(3)

// Range
items: z.array(itemSchema).min(1).max(10)
```

## Output schemas (`<domain>/output.ts`)

Each tRPC router (and REST endpoint) declares its **response shape** in a `<domain>/output.ts` file inside this directory. The router pipes its return value through Zod via `.output(YourSchema)`, so dropping a column from a service `select` fails the matching integration test before it reaches the frontend. Frontend code can `import` these schemas directly for runtime validation.

Existing per-domain output schemas:

```
schemas/
├── policy/output.ts          # 11 policy procedures
├── payment/output.ts         # 17 payment procedures (PaymentShape mirrors Prisma column-for-column)
├── actor/output.ts           # 17 actor procedures (4 actor-type shapes)
├── receipt/output.ts         # 12 receipt procedures
├── investigation/output.ts   # 15 investigation procedures (sanitized public getByToken)
├── pricing/output.ts         # 6 pricing procedures
├── package/output.ts         # 4 package procedures
├── address/output.ts         # 2 address procedures
├── contract/output.ts        # contract.getByPolicy (placeholder)
├── user/output.ts            # 5 user procedures
├── staff/output.ts           # 5 staff procedures
├── onboard/output.ts         # 3 onboard procedures
└── document/output.ts        # 7 document procedures
```

Conventions:

- **Mirror the actual `service.select` or Prisma model**, not what you guess the frontend wants. Phase 2.2 caught a real drift because `userService.userSelect` excludes `emailVerified` and the schema initially declared it.
- **Default Zod object mode** — extras stripped, missing required fields fail. That's what catches deletions.
- Use **`.passthrough()`** for nested includes you haven't yet locked — the `actor/output.ts` polymorphic shape is the canonical example.

Full guide and recipes: [docs/TESTING.md](../../../docs/TESTING.md).

## Migration Guide

To migrate an existing actor to the new schema system:

1. Create schema file: `src/lib/schemas/[actor]/index.ts`
2. Define tab schemas for each form section
3. Create complete schemas combining all tabs
4. Define three validation modes (strict/partial/admin)
5. Export TypeScript types
6. Update service to use new schemas
7. Update router to validate with schemas
8. Update UI to use generated types

## Testing

Schemas are automatically tested through TypeScript compilation. Additional runtime tests:

```typescript
describe('Actor Schema', () => {
  it('validates complete data', () => {
    const valid = actorStrictSchema.safeParse(completeData);
    expect(valid.success).toBe(true);
  });

  it('allows partial data in admin mode', () => {
    const valid = actorAdminSchema.safeParse(partialData);
    expect(valid.success).toBe(true);
  });
});
```

## Performance

- Validation happens at the edge (router level)
- Schemas are parsed once and cached
- Type checking happens at compile time
- Average validation time: <5ms per actor

## Future Enhancements

- [ ] Add custom error messages per field
- [ ] Implement async validation for uniqueness checks
- [ ] Add schema versioning for migrations
- [ ] Create schema composition utilities
- [ ] Add validation performance metrics

---

For implementation details, see the individual actor schema files or refer to the [Actor System Architecture](../../../docs/ACTOR_SYSTEM_ARCHITECTURE.md) documentation.
