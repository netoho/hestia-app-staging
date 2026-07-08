# `src/lib/schemas/` — router output schemas + legacy shims

> **Canonical entity schemas do NOT live here anymore.** They live in
> [`src/lib/domain/<entity>/`](../domain/README.md) — one canonical Zod schema per
> entity, with db/api/form adapters derived from it. This directory now holds two
> things: **router output schemas** (the API contract lock) and **@deprecated
> re-export shims** kept only until the remaining importers migrate.

## What lives here

```
schemas/
├── <domain>/output.ts   # ★ per-router response contracts (.output() on every procedure)
├── shared/              # reusable sub-schemas (address, person, company, references, …)
├── policy/wizard.ts     # policy creation wizard schema (moves to domain/policy with S5a #133)
├── helpers.ts           # schema helper utilities
├── actor/               # polymorphic actor router output shapes (see #148)
└── tenant/ landlord/ aval/ joint-obligor/
                         # @deprecated re-export shims → src/lib/domain/<entity>/
```

## Output schemas (`<domain>/output.ts`) — the contract lock

Every tRPC procedure declares `.output(<schema>)` against a schema here (14 files,
108 procedures — all locked). The frontend imports the same schemas, so dropping or
renaming a field the frontend consumes fails the matching integration test before it
lands. Existing files:

```
actor, address, contract, dashboard, document, investigation, onboard,
package, payment, policy, pricing, receipt, staff, user   (…/output.ts)
```

Conventions:

- **Mirror the actual service `select` (or the Prisma model)** — never your guess at
  what the frontend wants. For migrated entities, derive from the canonical schema:
  `<entity>ApiOutput` in `src/lib/domain/<entity>/adapters/api.ts` is the source;
  some output files re-export it.
- **Default Zod object mode** — extras stripped, missing required fields fail. That's
  what catches deletions.
- **`.passthrough()` is tracked debt** (#148): 27 live calls remain, concentrated in
  `policy/output.ts` (14) and `actor/output.ts` (6). The polymorphic
  `PolymorphicActorOutput` locks only 10 base fields — per-actor narrowing via the
  domain `…ApiOutput` shapes is the fix (Pattern F in the domain README).

Adding a procedure? Full recipe: [docs/TESTING.md](../../../docs/TESTING.md#recipes).

## The shims (`tenant/ landlord/ aval/ joint-obligor/index.ts`)

Each is a one-file re-export pointing at `src/lib/domain/<entity>` so old import
paths keep compiling. **Do not add anything to them.** New code imports from
`@/lib/domain/<entity>` directly. Shim deletion is a post-S5 cleanup once the
remaining importer files migrate (~19 at last audit).

## Where did X go?

| You're looking for… | It's now… |
|---|---|
| `tenantStrictSchema` / `tenantPartialSchema` / `tenantAdminSchema` (three validation modes) | Deleted. The canonical `tenantSchema` + tab schemas in `src/lib/domain/tenant/schema.ts` cover strict/partial via the adapters |
| `validateTenantTab(...)` | Deleted. Tab validation derives from the canonical tab schemas (`adapters/db.ts` filters by the `.keyof()`-derived tab field lists) |
| `TENANT_TAB_FIELDS` and friends | `src/lib/domain/<entity>/adapters/form.ts` (`.keyof()`-derived). The old constants files are dead code pending deletion (#168) |
| `prepareForDB` | Deleted app-wide. `toDb()` in `src/lib/domain/<entity>/adapters/db.ts` (normalize → validate → transform) |
| Guarantee variants (JO income/property) | `z.discriminatedUnion('jointObligorVariant', …)` in `src/lib/domain/joint-obligor/schema.ts` — synthetic 2-axis discriminator (S4a) |

## Shared sub-schemas (`shared/`)

Still live and consumed by the domain layer: `address`, `person`, `company`,
`contact`, `banking`, `property`, `references`. Mexican 4-field naming
(`firstName`, `middleName`, `paternalLastName`, `maternalLastName`) and the
Mexican address format live here.

---

Architecture rationale + entity walkthrough: [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).
Porting recipe (start here before touching schemas): [src/lib/domain/README.md](../domain/README.md).
