# Hestia maintainability — hexagonal-Zod direction + tactical wins

## Context

After the 4-PR regression sweep (PRs #118–#121) the user asked for a structural maintainability proposal. The pain:

- **Regressions are frequent** and the flow is hard to trace: form → procedure → service → DB → service → output schema → form. Five+ shape representations per entity; manual sync between every pair.
- **`any` types are leaking everywhere**: audit found **332 `: any`** + **169 `as any`** in production code. ~70% of `as any` is concentrated in three structural patterns: `prepareForDB.ts` files (88 casts across 4 actors), undertyped relations on display components (`policy: any`), and RHF field-path API limits.
- **4 actor wizards are ~60% duplicate** (620 of 1,033 LOC). Adding a 5th actor type would mean cloning 4–6 files.
- **Output schemas are never imported by the frontend** — they exist only as `.output(...)` declarations. Contract guarantee fires only when integration tests run.
- **System is deployed but low-traffic** — window to land structural changes is now.

User agreed direction: **hexagonal architecture, Zod schemas as domain entities, DB + tRPC + forms as adapters**. Roll out vertical-slice first (tenant), tactical wins ship in parallel.

## North star

```
                src/lib/domain/<entity>/schema.ts        ← CANONICAL Zod
                          │  (z.infer for TS types)
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
    adapters/db.ts   adapters/api.ts   adapters/form.ts
    (Prisma input    (output schemas   (RHF defaults,
     + parsing)      derived via .pick) tab fields)
            │             │             │
            ▼             ▼             ▼
       PrismaClient   tRPC .output    useForm
```

**Rule:** every shape that touches the entity is `.pick`/`.omit`/`z.infer`/`.keyof`-derived from the canonical schema. No hand-written parallel representation. Prisma schema is the one exception — hand-synced for column-list only (migrations need it).

## Strategic track — vertical slice first

### Phase S1 — Tenant slice (proof of concept, ~3–4 days, 1 PR)

Target: prove the hexagonal pattern end-to-end for tenant. If it ships green, every other entity follows the same recipe.

**Files to create/move:**
- `src/lib/domain/tenant/schema.ts` — promote existing `src/lib/schemas/tenant/index.ts` to canonical. Keep tab schemas; add a `tenantDomainSchema` master that's the union of all individual + company complete shapes.
- `src/lib/domain/tenant/adapters/db.ts` — replaces `src/lib/utils/tenant/prepareForDB.ts`. Input is `unknown`, runs `tenantDomainSchema.parse(input)`, returns the Prisma-ready shape. Kills the 8 `as any` casts in that file.
- `src/lib/domain/tenant/adapters/api.ts` — exports `TenantApiOutput = tenantDomainSchema.pick({...public fields...})`. Replaces the hand-curated `TenantOutputShape` in `src/lib/schemas/actor/output.ts`.
- `src/lib/domain/tenant/adapters/form.ts` — derives form `defaultValues` from Zod (walk `_def.defaultValue`) and exports per-tab field lists via `.keyof()`. Replaces hand-coded `TENANT_TAB_FIELDS`.
- `src/lib/domain/tenant/select.ts` — single centralized Prisma `include` for the tenant. Replaces ad-hoc `getIncludes()` in `TenantService.ts`.
- `src/lib/domain/README.md` — the pattern recipe.

**Files to refactor:**
- `src/lib/services/actors/TenantService.ts` — use the centralized select; replace `validateTenantData(...)` calls with `tenantDomainSchema.safeParse(...)`.
- `src/server/routers/actor/shared.router.ts` — `.output(TenantApiOutput)` per procedure. Remove the `passthrough()` on `ActorAdminUpdateSchema` for tenant.
- `src/components/actor/tenant/*-RHF.tsx` — import `TenantTabDefaults` and types from `domain/tenant/adapters/form.ts`. Remove `defaultValues: { ...initialData }` `any` spread.
- Integration tests: assert the new adapter parses + rejects + drift-detects.

**Acceptance:**
- `bun run test:integration` green
- `bun run build` green
- `grep -rn "as any" src/lib/utils/tenant src/lib/services/actors/TenantService.ts` returns zero
- New file `src/lib/domain/README.md` documents the pattern with file:line references

### Phase S2–S6 — Port remaining entities (1 PR per entity, ~1–2 days each)

After tenant ships, port in this order:

| # | Entity | Why this order | Risk |
|---|---|---|---|
| S2 | **Landlord** | Has the multi-record case (saveMultipleLandlords); validates pattern for collection adapters | Property + financial data live on Policy, not Landlord — adapter has to bridge |
| S3 | **Aval** | Has the conditional-required pattern (married → spouse fields); validates pattern for refinements | Refinements need to survive the adapter |
| S4 | **JointObligor** | Has the discriminated-union pattern (income vs property guarantee); validates pattern for complex discriminators | Highest casts (58 `as any` in prepareForDB) — biggest win |
| S5 | **Policy** | Touches every actor + many sub-objects (propertyDetails, financial); validates pattern for aggregate entities | Bigger surface area |
| S6 | **Document + Investigation + Receipt** | Cleanest entities; quick wins | Low |

Each phase Sₙ removes the corresponding hand-written representations and shrinks the `any` count.

## Tactical track — ship in parallel, independent branches

These don't depend on the strategic migration and can land while the tenant slice is in review.

### T1 — Typed `policy` prop

**Problem:** 15+ display components take `policy: any`. `InlineActorEditorProps.policy: any` is the worst.

**Fix:** Define `PolicyWithRelations` from the tRPC inferred type (`inferProcedureOutput<AppRouter['policy']['getById']>`). Replace `policy: any` with `policy: PolicyWithRelations` across:
- `src/components/policies/InlineActorEditor.tsx`
- `src/components/policies/details/ActorInfoSections.tsx` (15 `any`)
- `src/components/policies/PolicyDetailsContent/tabs/GuarantorsTab.tsx` (10 `any`)
- All actor wizards' `policy` prop

**Effort:** ~1 day. Risk: low.

### T2 — Typed `PolicyActivity.details`

**Problem:** `PolicyActivity.details: Json` is untyped at write + read. We just added `{ forcedByAdmin, missingFields, missingDocuments }` (PR-2) without schema.

**Fix:** Discriminated-union Zod schema in `src/lib/domain/policyActivity/details.ts` keyed by the activity action. Write site `parse()`s before assigning; read site `parse()`s before consuming. Validate retroactively on existing rows via a one-time script.

**Effort:** ~1.5 days. Risk: low (forward-compatible — old rows still parse as the base shape).

### T3 — Generic wizard hook

**Problem:** 4 wizards have ~60% identical code: save handler, toast pattern, navigation, last-tab detection.

**Fix:** Extract `useActorWizardSave({ actorType, mutations, wizard, toast })` from the 4 files. Keep the wizards thin (compose tab content + render).

**Effort:** ~1 day. Risk: low. Saves ~150 LOC across the 4 files.

**Not yet:** the full "generic wizard factory" (Option A from the audit) — defer until S2-S6 are done so the pattern stabilizes.

### T4 — Frontend runtime validation of output schemas (opt-in)

**Problem:** Output schemas are documentation-only on the client. PR-1 caught `confirmUpload` drift only because of an integration test, not the running app.

**Fix:** `src/lib/trpc/parseOutput.ts` helper that wraps `useQuery`/`useMutation` and runs `.safeParse()` on the data. Opt-in per call site; start with the procedures the deployed UI consumes most. Add an integration test that simulates drift and asserts the helper catches it.

**Effort:** ~1 day. Risk: low.

### T5 — Stop the `prepareForDB.ts` casts now (in tenant slice; clone pattern in S3/S4)

JointObligor's 58 `as any` is the worst hotspot. Eliminate it in S4 by using `jointObligorDomainSchema.parse(input)` once and reading typed fields after — no casts.

## Guardrails — sequencing prevents regression

Land in parallel with T1–T4:

### G1 — Strict-mode `any` budget

`@typescript-eslint/no-explicit-any` from `warn` → `error` after the tactical wins land. Per-file disable for the remaining offenders (with `// FIXME(domain-migration)` comments) so the budget shrinks over time, not invisibly.

### G2 — CI `tsc --noEmit` check

Verify it's already running on every PR (it should be; `bun run build` includes it). If not, add to `.github/workflows/test.yml`.

### G3 — Architecture doc

`docs/ARCHITECTURE.md` — one-page explanation of the hexagonal pattern, the directory layout, the data flow for one entity, the rule "every shape derives from a canonical schema, no parallel hand-written representations". Anchor for new contributors.

### G4 — Codeowners / PR template additions

PR template adds a checkbox: "Did you add a new `any` or hand-written schema duplication? If so, justify in the description." Bumps friction enough to catch lazy adds.

## Sequencing

```
Week 1            Week 2              Week 3              Week 4+
─────────         ─────────           ─────────           ─────────
T1 typed policy   S1 tenant slice     S2 landlord slice   S3 aval slice
T3 wizard hook    (in review)         T4 runtime valid    S4 jointObligor
T2 activity-log                                           S5 policy
                                                          S6 document/inv/receipt
                                                          G1 any-budget → error
                                                          G3 ARCHITECTURE.md
```

The tenant slice (S1) gates the others. If it reveals the pattern is wrong, only ~3–4 days of work to redirect.

## Verification

After **each PR** lands:
- `bun run test:integration` green
- `bun run build` green
- `grep -rn 'as any' src/<changed-paths>` shows a reduction
- The deployed admin smoke flow still works (manual: open a policy, edit a tenant tab, mark complete → expect no regressions)

After **the whole sweep** lands:
- `grep -rn ': any\b' src/ | grep -v '\.test\.' | wc -l` < 100 (today: 332)
- `grep -rn 'as any' src/ | grep -v '\.test\.' | wc -l` < 30 (today: 169)
- Adding a new field to the Tenant model takes 1 commit, not 6 (Prisma migration + Zod schema; everything else auto-derives)
- Adding a new actor type takes ~150 LOC, not ~1,000 (one schema + one tabs config)

## Critical files reference

Most-load-bearing today:
- `src/lib/schemas/tenant/index.ts` — already the de-facto canonical Zod (will become `domain/tenant/schema.ts`)
- `src/server/routers/actor/shared.router.ts` — every tab save flows through here
- `src/lib/services/actors/BaseActorService.ts` — `submitActor` is the riskiest method (just refactored in PR-2)
- `src/lib/utils/*/prepareForDB.ts` (×4) — the `any` hotspot to eliminate
- `src/components/actor/*/-FormWizard-Simplified.tsx` (×4) — the duplication hotspot

Reusable utilities discovered:
- `src/lib/utils/trpcErrors.ts` — `getFriendlyError` + `readForceCompleteState` (PR-3 + PR-2 work); pattern for client-side parsing of structured tRPC errors
- `src/components/actor/shared/FormWizardTabs.tsx` + `FormWizardProgress.tsx` — already-shared wizard primitives; the generic hook builds on these
- `src/components/actor/__tests__/formLabelSchemaSync.test.ts` (PR-4) — Zod introspection utilities (`isZodOptional`, `getSchemaField`) reusable for the form-defaults derivation in S1

## Resolved decisions (locked-in)

1. **Folder layout**: new `src/lib/domain/<entity>/` directory. Signals the architectural shift. `src/lib/schemas/` stays for now and shrinks as entities migrate; can be retired after S6.

2. **Naming** (canonical for every entity Sₙ migrates): `<entity>Schema` (canonical Zod), `<entity>Select` (Prisma include constant), `<entity>ApiOutput` (output schema), `<entity>FormDefaults` (form helpers).

3. **Adapter contract**: every service / adapter returns `AsyncResult<T, ServiceError>`. `prepareForDB` (renamed `<entity>Adapter.toDb()` under `domain/<entity>/adapters/db.ts`) returns `Result<TPrismaInput, ServiceError>` — no throws across the boundary. Consistent with the existing service layer's Result pattern.

4. **Refinements** (passport-when-foreign, spouse-when-married, etc.): stay on the canonical schema. The hexagonal-adapter pattern survives `.refine()` because Zod chains it. Document the gotcha in `src/lib/domain/README.md` — adapters that don't care about a refinement (e.g. read-only API output) can `.pick` AWAY the refined fields.

5. **Prisma generator** (`prisma-zod-generator` etc.): defer until S5 (policy migration). The tenant slice S1 will surface how painful manual Prisma↔Zod column sync actually is. Re-evaluate at that point.

6. **Activity-log retroactive migration**: write a one-time backfill script (`scripts/migrate-activity-log-details.ts`) that loads every `PolicyActivity` row, validates its `details` against the new discriminated-union schema, patches non-parseable rows into a sentinel "legacy" variant, and writes the result back. Lock in the strict shape AFTER backfill. Cleaner long-term than carrying a forever-compat union.

7. **Tactical T1 (`policy` prop typing)**: type is `inferProcedureOutput<AppRouter['policy']['getById']>` (or the corresponding procedure each component consumes). Auto-tracked against router changes; no hand-sync.

## Unresolved (none)

All open questions from the planning pass are locked. Implementation can start at Phase S1 (tenant slice).

---

# Post-S1 audit (2026-05-28, after PR #138 opened)

## Context

S1 shipped as PR #138 against `release/2.13.0` — tenant domain slice complete, smoke test passed clean, CI green, ready to merge. Before sign-off and before S2 starts, ran a three-pronged audit (GitHub sync + post-S1 codebase reality + forward-looking entity reconnaissance) to verify the recipe before it gets applied 7 more times.

**Result:** GitHub is in sync. S1 codebase is clean. But the forward-looking audit surfaced three findings that change the shape of S4, S5, and the recipe itself.

## Findings

### Finding 1 — S4 (Joint Obligor) is two pieces of work, not one

The 62 `as any` casts in `prepareForDB.ts` aren't a transformation hygiene problem; they're a schema-modeling problem. The entity has a **2-axis discriminator** (`INDIVIDUAL`/`COMPANY` × `income`/`property` guarantee). The current Zod schema treats `guaranteeMethod` as a field, not a discriminator, so the data shape genuinely varies but the type system can't express it.

**Implication:** S4 needs a schema refactor FIRST (to a 4-branch discriminated union), THEN the mechanical port. If we ship S4 as currently described, the implementer hits the schema problem mid-PR and either bails or doubles scope.

**Resolution (Q4a):** File new issue **#139 (S4a — schema refactor)** that blocks **#132 (S4b — domain port)**. Two implementers can sequence the work cleanly.

### Finding 2 — S5 (Policy) is "design + build", not "port"

No canonical Policy schema exists today. The Policy "service" is **10 files** across `src/lib/services/policyService/*`. Lifecycle state machine (`COLLECTING_INFO` → `READY_FOR_APPROVAL` → `APPROVED` → `ACTIVE` → `RENEWED`/`CANCELLED`) is buried in service code. Renewals + guarantor-type-changes are state machines with preconditions, none formalized.

**Implication:** S5 isn't a port — it's a design exercise + port. It's also the biggest leverage: Policy aggregates over every actor. Doing it last lets us validate the recipe on the leaves first, then apply it to the aggregate as the capstone integration test.

**Resolution (Q1):** Reorder so S5 lands **last**, after S6a/b/c. Update #133's body to scope it as "design canonical schema + port" and document the new dependency.

### Finding 3 — Six recipe patterns are missing from `src/lib/domain/README.md`

The tenant slice didn't surface them because tenant doesn't have those cases. The forthcoming entities do:

| Pattern | Where it lands | Why tenant didn't surface it |
|---|---|---|
| A. Multi-record handling (transaction wrap) | S2 Landlord | Tenant is single-record per policy |
| B. Multi-dimensional discriminated unions | S4 Joint Obligor | Tenant has one discriminator |
| C. Cross-entity aggregate dependencies | S5 Policy | Tenant is a leaf entity |
| D. Sanitized public-vs-private outputs | S6b Investigation `getByToken` | Tenant has no public-portal endpoint |
| E. Lifecycle state machines (discriminated by status) | S6b Investigation, S6c Receipt | Tenant has no rich state machine |
| F. Per-procedure output narrowing | All entities with portal + admin shapes | Tenant uses one shape across procedures |

**Implication:** If we don't extend the recipe before S2, each subsequent slice has to rediscover these patterns ad-hoc.

**Resolution (Q2):** Stub all 6 patterns in `src/lib/domain/README.md` with one paragraph each (principle + "fill in concrete example when this pattern lands"). Each Sₙ PR fills its corresponding stub with real code. Stubs land **as part of #129** (G — guardrails + PR template + docs).

### Minor blind spots (non-blocking)

- `src/lib/constants/tenantTabFields.ts` is dead code (replaced by the form adapter). Cleanup absorbed into S2 alongside landlord's parallel cleanup (Q4b).
- `TenantService.getIncludes()` uses `as unknown as Record<string, boolean | object>` — type-system boundary workaround. Not a bug; the `satisfies` on `tenantSelect` guarantees the shape. Track as a follow-up if Zod's type inference improves.
- Hand-authored `tenantFormDefaults` doesn't walk `.default()` calls. Documented in the file; a future Zod-defaults-walker can replace it.

## Decisions locked

| Question | Resolution |
|---|---|
| Q1 — S4/S5 reshape | Reshape now: split S4 into S4a + S4b; move S5 to last; update issues |
| Q2 — Recipe extension | Stubs (β) in `src/lib/domain/README.md`; land with #129 |
| Q3a — T3 ordering | T3 (#127) explicitly blocked by S2 (#130); update issue body |
| Q3b — PR #138 smoke | Passed clean; ready to merge |
| Q4a — S4 split mechanism | File new issue #139 (S4a) blocking #132 (S4b — port) |
| Q4b — `tenantTabFields.ts` cleanup | Absorb into S2 alongside landlord's similar cleanup |

## Revised sequence

```
Already shipped:  Regression sweep PRs #118 → #122 (release/2.12.5)

In review:        PR #138 (S1 — Tenant slice, gating)   ← merge first

Independent       T1 #125 (typed policy prop)
parallel-able     T2 #126 (PolicyActivity.details + backfill)
right now:        T4 #128 (parseOutput client helper)
                  G  #129 (CI tsc + PR template + recipe stubs)
                  S2 #130 (Landlord — unblocks once #138 merges)

Blocked by S1:    S3 #131 (Aval)
                  S4a #139 (NEW — Joint Obligor schema refactor)
                  S4b #132 (Joint Obligor port — blocked by S4a)
                  S6a #134 (Document)
                  S6c #136 (Receipt — moved before Investigation)
                  S6b #135 (Investigation — moved after Receipt)

Blocked by S2:    T3 #127 (ActorWizard factory)

Blocked by T1-4:  T5 #137 (ESLint enforcement)

Capstone (last):  S5 #133 (Policy — design + port; depends on every Sₙ above)
```

## Immediate next steps (execute on exiting plan mode)

In this order:

1. **File new issue #139** — `S4a — Joint Obligor schema refactor to 4-branch discriminated union`. Block #132 on it. Body documents the 2-axis-discriminator problem, the target shape (`z.discriminatedUnion('jointObligorVariant', [4 branches])`), and acceptance criteria (62 `as any` count drops to zero in `prepareForDB.ts`).
2. **Edit #132** — retitle to `S4b — Joint Obligor domain port (after schema refactor)`. Add `Blocked by: #139` to body. Note the mechanical-port framing.
3. **Edit #133** — retitle to `S5 — Policy domain slice (design canonical schema + aggregate port)`. Add `Blocked by: #134, #135, #136` (depends on every actor entity migrating first). Body documents the missing canonical schema + state-machine formalization scope.
4. **Edit #127** — add `Blocked by: #130 (S2 Landlord)` to T3's body. Note the form-adapter dependency.
5. **Edit #129** — expand scope: in addition to CI tsc + PR template, add 6 pattern stubs (A–F) to `src/lib/domain/README.md`. Update body accordingly.
6. **Post audit summary comment on #123** — link to this plan file + summarize the three findings and the resulting reshape. Anchor for the team to understand why the issue bodies changed.
7. **Merge PR #138** — smoke is green; CI is green; pattern is locked. After merge, S2 + the parallel tactical wins unblock.

## What to start tomorrow

**Ready-to-start (no blockers)** — pick any of:
- T1 (#125) — typed `policy` prop, ~1 day, independent
- T2 (#126) — `PolicyActivity.details` discriminated union + backfill script, ~1.5 days, independent
- T4 (#128) — `parseOutput` client helper + canary, ~1 day, independent
- G (#129, expanded) — CI + PR template + 6 recipe stubs, ~1 day
- S2 (#130) — Landlord domain slice, ~1-2 days, requires #138 merged

**Recommendation for the first parallel pick**: **T1 (#125)** first. It's the smallest concrete win, validates the tRPC-inferred-type pattern, and unblocks T5 (#137) progression.

If two people are working: T1 + S2 in parallel. S2 validates the multi-record pattern (Finding A); T1 reduces visible `any` count immediately.

## Verification path

- PR #138 ready to merge: smoke clean, CI green, no conflicts ✓
- Plan changes are issue-body edits + one new issue + one comment on #123 + post-merge follow-ups; no codebase changes in this phase
- Next codebase activity: S2 (#130) once #138 lands
- Recipe stubs go into `src/lib/domain/README.md` as part of #129 implementation, not now
