# Utilities

Data transformation and helper functions for the application.

## Directory Structure

```
utils/
├── dataTransform.ts       # Base transforms (shared by all actors)
├── prepareForDB.ts        # Consolidated actor data preparation
├── landlord/prepareForDB.ts   # Landlord-specific transforms
├── tenant/prepareForDB.ts     # Tenant-specific transforms
├── aval/prepareForDB.ts       # Aval-specific transforms
├── joint-obligor/prepareForDB.ts  # JointObligor-specific transforms
├── actorValidation.ts     # Actor validation helpers
├── names.ts               # Name formatting
├── currency.ts            # Currency formatting
├── addressUtils.ts        # Address utilities
├── policy.ts              # Policy utils (number, progress, display)
├── tokenUtils.ts          # Token utilities
└── trpcErrorHandler.ts    # tRPC error mapping
```

## Data Transformation

### Base Transforms (`dataTransform.ts`)

Shared functions used by all actor prepareForDB files:

```typescript
import {
  emptyStringsToNull,   // "" -> null recursively
  removeUndefined,      // Remove undefined fields
  normalizeBooleans,    // "true"/"false" -> true/false
  normalizeNumbers,     // "123" -> 123 for specified fields
  cleanFormData,        // Combined cleanup
} from '@/lib/utils/dataTransform';
```

### Consolidated Prepare (`prepareForDB.ts`)

Generic actor preparation with shared logic:

```typescript
import { prepareActorForDB, PrepareOptions } from '@/lib/utils/prepareForDB';

const prepared = prepareActorForDB(formData, {
  actorType: 'tenant',
  isCompany: false,
  isPartial: false,
});
```

### Actor-Specific Transforms

Each actor has specific requirements:

| Actor | Special Logic |
|-------|--------------|
| **Landlord** | Extracts policy fields, multi-landlord support |
| **Tenant** | Reference formatting |
| **Aval** | Mandatory property guarantee, marriage validation |
| **JointObligor** | Flexible guarantee (income vs property), Prisma relations |

```typescript
// Landlord
import { prepareLandlordForDB, extractPolicyFields } from '@/lib/utils/landlord/prepareForDB';

// Tenant
import { prepareTenantForDB, prepareReferencesForDB } from '@/lib/utils/tenant/prepareForDB';

// Aval
import { prepareAvalForDB } from '@/lib/utils/aval/prepareForDB';

// JointObligor (uses Prisma relation format)
import { prepareJointObligorForDB } from '@/lib/utils/joint-obligor/prepareForDB';
```

## Other Utilities

### Name Formatting (`names.ts`)
```typescript
import { formatFullName, getInitials } from '@/lib/utils/names';
```

### Currency (`currency.ts`)
```typescript
import { formatCurrency } from '@/lib/utils/currency';
formatCurrency(15000); // "$15,000.00"
```

### Policy Utils (`policy.ts`)
```typescript
import {
  generatePolicyNumber,       // Generate POL-YYYYMMDD-XXX
  validatePolicyNumberFormat, // Validate format
  calculatePolicyProgress,    // Calculate actor completion
  getPrimaryLandlord,         // Get primary from array
  getActorDisplayName,        // Format actor name
} from '@/lib/utils/policy';
```

### Error Handling (`trpcErrorHandler.ts`)
```typescript
import { serviceErrorToTRPC } from '@/lib/utils/trpcErrorHandler';
```

## Best Practices

- Keep utilities pure (no side effects)
- Import from specific files, not barrel exports
- Use `dataTransform.ts` functions as the base
- Actor-specific logic stays in actor-specific files
