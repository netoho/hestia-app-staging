# `src/lib/domain/` — hexagonal domain layer

Each subdirectory holds the canonical Zod schema for one entity plus
its adapters. The hexagonal pattern: **Zod schemas are the domain;
Prisma / tRPC / RHF are adapters that derive from the schema.**

For the architectural rationale, see
[`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md). For the
umbrella migration plan, see issue
[#123](https://github.com/netoho/hestia-app/issues/123).

## Layout per entity

```
src/lib/domain/<entity>/
├── schema.ts          ← canonical Zod schema (refinements + types)
├── select.ts          ← Prisma include constant
├── adapters/
│   ├── db.ts          ← toDb / fromDb (replaces prepareForDB)
│   ├── api.ts         ← tRPC output schemas
│   └── form.ts        ← RHF defaults + tab field lists
└── __tests__/
    ├── schema.test.ts
    └── adapters.test.ts
```

## Naming convention

For every entity, the four exports the rest of the codebase touches
are named identically:

- `<entity>Schema` — canonical Zod (discriminated union for entities
  with INDIVIDUAL/COMPANY variants, single schema otherwise)
- `<entity>Select` — Prisma include constant; the single source of
  truth for "what gets loaded with an entity"
- `<entity>ApiOutput` — tRPC output schema (drift-tested against
  `<entity>Schema`)
- `<entity>FormDefaults` — function returning `defaultValues` for RHF
- `<entity>TabFields(tabName)` — per-tab field-name list derived via
  `.keyof()` on the corresponding tab schema

This is what S2 onwards inherits from S1's tenant slice.

## Recipe — porting the next entity (e.g. S2 landlord)

The tenant slice ([#124](https://github.com/netoho/hestia-app/issues/124))
is the worked example. To port landlord (or aval, joint obligor, etc.):

### 1. Build the canonical schema

```ts
// src/lib/domain/landlord/schema.ts
import { z } from 'zod';
// ... import shared person/address/company/banking schemas

// Promote the existing schemas from src/lib/schemas/<entity>/index.ts.
// Refinements stay verbatim. Add a discriminated-union `<entity>Schema`
// for entities with multiple variants.
export const landlordSchema = z.discriminatedUnion('isCompany', [
  landlordIndividualCompleteSchema,
  landlordCompanyCompleteSchema,
]);
```

### 2. Build the centralized select

```ts
// src/lib/domain/landlord/select.ts
import { Prisma } from '@/prisma/generated/prisma-client/client';

export const landlordSelect = {
  addressDetails: true,
  policy: { include: { propertyDetails: true } },
  // ... whatever the entity loads
} satisfies Prisma.LandlordInclude;

export type LandlordWithRelations = Prisma.LandlordGetPayload<{
  include: typeof landlordSelect;
}>;
```

### 3. Build the DB adapter

```ts
// src/lib/domain/landlord/adapters/db.ts
import { Result } from '@/lib/services/types/result';
import { landlordSchema } from '../schema';

export function toDb(input: unknown, opts: {...}): Result<LandlordDbPayload> {
  // Parse through landlordSchema (tab/partial/strict mode based on opts).
  // Normalize empty strings to null, string numbers to numbers, etc.
  // Filter to the active tab's fields when opts.tabName is set.
  // Return Result.ok(payload) — no `as any` inside.
}
```

### 4. Build the API adapter

```ts
// src/lib/domain/landlord/adapters/api.ts
import { z } from 'zod';

export const landlordApiOutput = z.object({...});  // hand-authored
                                                    // for Prisma-emitted shape
export const landlordApiOutputFields = Object.keys(landlordApiOutput.shape);

// In __tests__/adapters.test.ts: drift test asserting every API field
// exists in the canonical schema's keyof().
```

### 5. Build the form adapter

```ts
// src/lib/domain/landlord/adapters/form.ts
export function landlordFormDefaults(opts: {...}): Record<string, unknown> {...}
export function landlordTabFields(tabName: string): readonly string[] {
  switch (tabName) {
    case 'owner-info': return landlordOwnerInfoTabSchema.keyof().options;
    // ...
  }
}
```

### 6. Refactor the service

```ts
// src/lib/services/actors/LandlordService.ts
import { landlordSelect } from '@/lib/domain/landlord/select';
import { toDb as landlordToDb } from '@/lib/domain/landlord/adapters/db';

class LandlordService {
  protected getIncludes() {
    return landlordSelect;
  }
  public async save(...) {
    const adapterResult = landlordToDb(data, { ... });
    if (!adapterResult.ok) return Result.error(adapterResult.error);
    // ... use adapterResult.value for the Prisma update
  }
}
```

### 7. Delete `src/lib/utils/<entity>/prepareForDB.ts`

Confirm no remaining imports across the codebase, then delete.

### 8. Update consumers

- `src/server/routers/actor/shared.router.ts` — `.output(landlordApiOutput)` for landlord procedures; import schemas from the domain.
- `src/lib/schemas/actor/output.ts` — `LandlordOutputShape` → re-export from the new adapter.
- `src/lib/schemas/<entity>/index.ts` — becomes a re-export shim for backwards-compat.
- `src/components/actor/landlord/*Tab-RHF.tsx` — import `landlordFormDefaults` from the form adapter.

### 9. Write the tests

- `src/lib/domain/<entity>/__tests__/schema.test.ts` — parse + reject + refinements (one positive + one negative per refinement).
- `src/lib/domain/<entity>/__tests__/adapters.test.ts` — db roundtrip, api drift test, form defaults extraction.

### 10. Verify

- `bun run test:unit` — new unit tests green.
- `bun run test:integration` — existing integration tests green.
- `bun run build` — type-check green.
- `grep -rn "as any" src/lib/utils/<entity> src/lib/services/actors/<Entity>Service.ts src/components/actor/<entity>` — zero hits.

## What stays in `src/lib/schemas/<entity>/`?

Nothing, eventually. During S2–S6c each entity's `src/lib/schemas/`
file is converted to a re-export shim (`export * from
'@/lib/domain/<entity>/schema'`). Once every consumer has been
migrated to import from the domain path, the shims can be deleted in
a cleanup PR after S6c.

## What lives in `src/lib/schemas/shared/`?

Cross-cutting reusable schemas — `personNameSchema`,
`addressSchema`, `bankingSchema`, etc. These don't belong to a single
entity, so they stay in `schemas/shared/` and the domain entities
import from there.
