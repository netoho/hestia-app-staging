# Utilities

Data transformation and helper functions. **Actor data preparation no longer lives
here** — every `prepareForDB` file was deleted by the #123 hexagonal sweep; the write
path is `toDb()` in `src/lib/domain/<entity>/adapters/db.ts` for all four actors.

## Directory Structure (flat — no per-actor subdirectories anymore)

```
utils/
├── dataTransform.ts       # Base transforms (consumed by the domain db adapters)
├── actor.ts               # Actor helper utilities
├── actorMapping.ts        # Actor type/model mapping
├── actorValidation.ts     # Actor validation helpers
├── addressUtils.ts        # Address utilities
├── currency.ts            # Currency formatting
├── dateRangePresets.ts    # Date-range picker presets
├── filename.ts            # Filename utilities
├── formatting.ts          # Date, address, file size formatting
├── modernEmailTemplates.ts # Email template helpers
├── money.ts               # Money/amount utilities
├── names.ts               # Name formatting
├── optimisticUpdates.ts   # Optimistic UI update helpers
├── policy.ts              # Policy utils (number, progress, display)
├── prismaActorDelegate.ts # Prisma actor delegate abstraction
├── receiptConfig.ts       # Receipt configuration helpers
├── requestCache.ts        # Request-level caching
├── tokenUtils.ts          # Token utilities
├── trpcErrorHandler.ts    # Service-error → tRPC error mapping
├── trpcErrors.ts          # Client-side friendly-error parsing (getFriendlyError)
└── validationUtils.ts     # Shared validation helpers
```

## Data Transformation

### Base Transforms (`dataTransform.ts`)

```typescript
import {
  emptyStringsToNull,   // "" -> null recursively
  removeUndefined,      // Remove undefined fields
  normalizeBooleans,    // "true"/"false" -> true/false
  normalizeNumbers,     // "123" -> 123 for specified fields
  cleanFormData,        // Combined cleanup
} from '@/lib/utils/dataTransform';
```

These are the normalize step inside every domain `toDb()` — **normalize before
validate** is the load-bearing ordering (forms submit string numbers/booleans and
empty strings; canonical schemas reject all three).

### Actor writes — use the domain adapters

```typescript
import { tenantToDb } from '@/lib/domain/tenant/adapters/db';          // S1
import { landlordToDb } from '@/lib/domain/landlord/adapters/db';      // S2 (multi-record)
import { avalToDb } from '@/lib/domain/aval/adapters/db';              // S3
import { jointObligorToDb } from '@/lib/domain/joint-obligor/adapters/db'; // S4b (2-axis variant)
```

Anything that hand-builds an actor write payload instead of going through these is a
bug (one known: `LandlordService.buildUpdateData`, #152).

## Other Utilities

### Names / Currency / Errors
```typescript
import { formatFullName, getInitials } from '@/lib/utils/names';
import { formatCurrency } from '@/lib/utils/currency';   // 15000 -> "$15,000.00"
import { serviceErrorToTRPC } from '@/lib/utils/trpcErrorHandler';
import { getFriendlyError } from '@/lib/utils/trpcErrors'; // client-side toasts
```

### Policy Utils (`policy.ts`)
```typescript
import {
  generatePolicyNumber,       // POL-YYYYMMDD-XXX
  validatePolicyNumberFormat,
  calculatePolicyProgress,    // actor completion
  getActorDisplayName,
} from '@/lib/utils/policy';
```

`getPrimaryLandlord` still exists for legacy display ordering only — **do not use it
for business logic**: every landlord is first-class (links, gates, notifications
iterate ALL landlords).

## Best Practices

- Keep utilities pure (no side effects)
- Import from specific files, not barrel exports
- Entity shapes belong to `src/lib/domain/` — utils never define a parallel actor shape
