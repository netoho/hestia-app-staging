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

For every entity, the exports the rest of the codebase touches follow one pattern:

- `<entity>Schema` — canonical Zod (discriminated union for entities
  with variants, single schema otherwise)
- `<entity>Select` — Prisma include constant; the single source of
  truth for "what gets loaded with an entity"
- `<entity>ApiOutput` — tRPC output schema (drift-tested against
  `<entity>Schema`)
- `<entity>FormDefaults` — function returning `defaultValues` for RHF
- `<entity>TabFields(tabName)` — per-tab field-name list derived via
  `.keyof()` on the corresponding tab schema

**Actual canonical exports as merged** (prefer plain `<entity>Schema` for new
slices; these exceptions predate the rule and are kept to avoid churn):

| Entity | Canonical export | Discriminator |
|---|---|---|
| tenant | `tenantSchema` (schema.ts:151) | `tenantType` |
| landlord | `landlordSchema` (:126) + `multiLandlordSchema` (:132) | `isCompany` |
| aval | `avalMasterSchema` (:161) | `avalType` (PROPERTY-only guarantee; synthetic-variant retrofit = #151) |
| joint-obligor | `jointObligorCanonicalSchema` (:271) | synthetic `jointObligorVariant` |
| document / investigation | leaf schemas, no variant union | — |

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
- `bun run typecheck:ratchet` — tracked-file tsc error count did not grow
  (note: `bun run build` does NOT type-check — `ignoreBuildErrors` is on).
- `grep -rn "as any" src/lib/utils/<entity> src/lib/services/actors/<Entity>Service.ts src/components/actor/<entity>` — zero hits.

## Patterns the recipe extends to (A–F)

The tenant slice couldn't surface these; the later slices did. Each pattern below
is documented from **merged code** — read the cited files before applying it.

### A — Multi-record entities (worked example: landlord, S2)

A policy has 1..N landlords. The canonical layer models both the single record
(`landlordSchema`) and the collection (`multiLandlordSchema`, schema.ts:132); the
db adapter exposes `toDbMultiple` and the service wraps the collection write in a
transaction. Rule: the collection schema OWNS collection-level invariants (at
least one record, exactly-one-of-X); the per-record schema knows nothing about
its siblings. Gates/links/notifications iterate ALL records — never index 0 or
`isPrimary` (legacy).

### B — Multi-dimensional variants via a synthetic discriminator (joint-obligor, S4a)

When an entity varies on two axes (INDIVIDUAL|COMPANY × INCOME|PROPERTY),
`z.discriminatedUnion` needs ONE key. Synthesize it: `jointObligorVariant` with 4
literal branches (schema.ts:225-257), **derived on read / decomposed on write —
never a DB column** (schema.ts:39). `jointObligorStrictSchema` wraps the union in
`z.preprocess` (:282-300) that computes the variant from `(type, guaranteeMethod)`
before parsing. This killed the 58-cast prepareForDB hotspot: the type system can
finally express what the data actually is. Standard for every multi-axis entity
(aval retrofit tracked in #151).

### C — Aggregate entities (policy, S5a — pending #133)

Policy composes every actor + propertyDetails + payments. Design rule (to be
proven by S5a): the aggregate schema COMPOSES the per-entity canonical schemas
(`z.object({ tenant: tenantSchema.nullable(), landlords: z.array(...), ... })`)
and its select composes the per-entity selects — the aggregate never redeclares an
actor's fields. This is also what kills the admin-vs-portal data-path divergence
(see #171). Fill this section in with real code when S5a merges.

### D — Sanitized public outputs (investigation, S6b)

Endpoints reachable by unauthenticated token links must declare an allowlist:
the public `getByToken` payload is `.pick(INVESTIGATION_PUBLIC_FIELDS)` on the
canonical schema (adapters/api.ts:128-130) — secrets (`brokerToken`,
`landlordToken`, `tokenExpiry`, PII) cannot leak because the shape is built by
picking, never by omitting from the server shape. Any new public/token endpoint
copies this: define `<ENTITY>_PUBLIC_FIELDS`, derive via `.pick`, drift-test it.

### E — Lifecycle state machines (investigation S6b; receipt S6c pending #136)

Status enums live on the canonical schema as plain enum fields; **transition
rules live in the service** (see `policyWorkflowService.ALLOWED_TRANSITIONS` for
the shape: an explicit map + per-edge gates, never scattered ifs). The schema
stays a data contract; the machine is behavior. Docs for the policy machine:
`docs/POLICY_STATUS.md` — keep the transition table in sync with the
`ALLOWED_TRANSITIONS` map (it drifted once already).

### F — Per-procedure output narrowing (pending #148)

The polymorphic actor router still returns one loose `PolymorphicActorOutput`
(10 fields + `.passthrough()`, `policy: z.unknown()`), which makes field removal
invisible to the contract suite and manufactures tsc noise downstream. The fix:
each procedure declares the narrowest domain `…ApiOutput` that matches what it
returns (admin vs portal shapes may differ — that's Pattern D applied per
procedure). Fill in with real code when #148 lands.

## Known gaps the recipe does not cover yet

- **Clone/copy field-lists** (renewal, tenantReplacement, guarantorTypeChange)
  still hand-enumerate fields — a new schema field silently vanishes on clone
  until #159's drift test + derivation land.
- **Reverse form→schema drift** — a form field missing from the tab schema is
  silently dropped; #160 adds the reverse assertion to formLabelSchemaSync.
- **Wizard reset-on-data** — tab forms seed `defaultValues` once; admin inline
  editors don't reset on refetch (#171). The T3 factory (#127) is where the
  reset pattern gets baked in once.

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
