# Architecture — Hexagonal Zod-canonical domain

This document describes the layering the Hestia codebase is migrating
toward (umbrella issue [#123][prd]; first vertical slice [#124][s1]).
For the recipe to migrate the next entity, see
[`src/lib/domain/README.md`](../src/lib/domain/README.md).

[prd]: https://github.com/netoho/hestia-app/issues/123
[s1]: https://github.com/netoho/hestia-app/issues/124

## The problem

Before the migration, a single entity (e.g. `Tenant`) had its shape
declared in 5–6 independent places, each kept in sync by hand:

1. The Prisma model columns
2. The service's inline `include` (what gets loaded with a tenant)
3. The Zod tab schemas (input validation)
4. The `TenantOutputShape` (tRPC output contract)
5. The hand-coded `TENANT_TAB_FIELDS` constant (used by tab filters)
6. The form `defaultValues` (hand-typed per tab)

Adding a field meant touching 5–6 files. Removing one without touching
all 5–6 silently broke a downstream consumer. The recent regression
sweep (PRs #118–#121) addressed four symptoms of this drift, but the
root cause was structural.

## The shape

**One canonical Zod schema per entity** lives under `src/lib/domain/`.
Everything else **derives** from it.

```
                src/lib/domain/<entity>/schema.ts        ← CANONICAL Zod
                          │  (z.infer for TS types)
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
    adapters/db.ts   adapters/api.ts   adapters/form.ts
    (Prisma input    (output schemas   (RHF defaults,
     + parsing)      derived via .pick) tab fields via .keyof)
            │             │             │
            ▼             ▼             ▼
       PrismaClient   tRPC .output    useForm
```

Plus a sibling `select.ts` that exports a single `<entity>Select`
constant — the only place the Prisma `include` for that entity is
declared.

## The rule

> Every shape that touches the entity is `.pick`/`.omit`/`z.infer`/
> `.keyof`-derived from the canonical schema, or `satisfies`-checked
> against it. No hand-written parallel representation.

Two exceptions, both documented:

1. The Prisma model is hand-synced for the column list. Migrations need
   their own format; the canonical schema is hand-aligned to columns
   (a generator can land in S5 as a follow-up).
2. The API output (`adapters/api.ts`) is hand-authored because Prisma
   emits `NULL`-but-not-undefined shapes while the canonical schema
   models the form input shape (most fields `.optional().nullable()`).
   A drift test in `__tests__/adapters.test.ts` (paired with `__tests__/schema.test.ts`) asserts every API field
   exists on the canonical schema — the lock that prevents divergence.

## Adapter contracts

- All adapter and service methods return `Result<T, ServiceError>` (or
  `AsyncResult<T>` when there's I/O). No throws across boundaries.
- DB adapter (`adapters/db.ts`) is the data-transformation layer that
  replaces the legacy `prepareForDB.ts` files. Accepts `unknown`,
  parses through the canonical schema, returns a Prisma-ready payload.
  **No `as any` casts inside** — the whole point of the adapter is to
  stop the field-by-field cast pattern.
- API adapter (`adapters/api.ts`) exports the tRPC output schema. The
  router declares `.output(<entity>ApiOutput)` per procedure.
- Form adapter (`adapters/form.ts`) exposes `defaultValues` and
  per-tab field lists derived via `.keyof()`. Used by every
  `*Tab-RHF.tsx` file.

## Refinements

Refinements (conditional-required, format checks, cross-field rules)
live on the canonical schema. They survive `.pick`/`.omit` because Zod
chains them at the property level. Adapters that don't care about a
specific refinement may `.pick` AWAY the refined field before piping
the schema into their consumer.

Example: `aval.spouseName` is required when `aval.maritalStatus` is
`married_*`. The refinement lives on the canonical aval schema; the
form-side conditional render and the server-side validation both
inherit it without re-declaring.

## Walkthrough: tenant (S1)

Files introduced by S1:

```
src/lib/domain/tenant/
├── schema.ts          ← canonical Zod for tenant
├── select.ts          ← Prisma include constant
└── adapters/
    ├── db.ts          ← toDb(unknown, opts) → Result<TenantDbPayload>
    ├── api.ts         ← tenantApiOutput (drift-tested)
    └── form.ts        ← tenantFormDefaults + tenantTabFields
```

Files deleted by S1:

- `src/lib/utils/tenant/prepareForDB.ts` (replaced by `adapters/db.ts`)

Files refactored by S1:

- `src/lib/services/actors/TenantService.ts` — uses `tenantSelect` and
  routes through `tenantToDb`
- `src/lib/schemas/tenant/index.ts` — becomes a re-export shim for
  backwards compatibility during S2–S6c
- `src/lib/schemas/actor/output.ts` — re-exports `TenantOutputShape`
  from the new adapter
- The four `Tenant*Tab-RHF.tsx` files — import from the domain layer
- `src/server/routers/actor/shared.router.ts` — imports the canonical
  tenant schemas from the domain layer

## Migration sequencing

The umbrella tracks 6 strategic ports (one per entity) + 5 tactical
wins shipping in parallel. See [#123][prd] for the full breakdown.
After every entity has migrated, `src/lib/schemas/<entity>/` shims
can be retired.

```
S1: tenant                        ✅ merged (PR #138)
S2: landlord                      ✅ merged (PRs #146/#147) — multi-record pattern
S3: aval                          ✅ merged (PR #149) — conditional-required refinement
S4: joint obligor                 ✅ merged (PRs #153/#154/#156) — 2-axis synthetic variant; 58+ casts removed
S6a: document                     ✅ merged (PR #157) — leaf entity
S6b: investigation                ✅ merged (PR #158) — sanitized output + state machine
S6c: receipt                      ⏳ next (#136)
S5: policy (aggregate, capstone)  ⏳ design-first, lands last (#133; multi-tenant split to #169)
```

## Why this matters

After every entity migrates:

- **Adding a field** is a one-file change (the canonical schema). Every
  adapter re-derives automatically.
- **Removing a field** breaks the build at every consumer that still
  uses it. No silent runtime regressions.
- **Adding a new actor type** (a 5th actor) takes ~150 LOC: one
  schema, one tabs config. The four-wizard cloning pattern is dead.
- **The `any` count drops from ~300 to under ~50** (mostly RHF
  field-path stragglers, marked with `// FIXME(domain-migration)`).
- **Type-flow is grep-able**: trace a field from canonical schema →
  adapters → consumers without crossing module-boundaries by hand.
