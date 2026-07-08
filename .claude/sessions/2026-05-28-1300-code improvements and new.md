# code improvements and new - 2026-05-28 13:00

## Session Overview
- **Start time:** 2026-05-28 13:00
- **Branch:** feat/s1-tenant-domain-slice (S1 PR #138 awaiting merge against release/2.13.0)

## Context carried in

Just shipped the regression sweep (PRs #118–#121) and opened the maintainability initiative #123 with 14 child issues (#124–#137). S1 (Tenant domain slice) is open as PR #138 — the gating slice that establishes the hexagonal pattern for S2–S6c to follow.

Open issues to grab from:
- **S-track**: #124 (in review), #130 (S2 Landlord), #131 (S3 Aval), #132 (S4 Joint Obligor — biggest as-any cleanup), #133 (S5 Policy), #134/#135/#136 (S6a/b/c Document/Investigation/Receipt)
- **T-track (independent, parallel-able)**: #125 (typed policy prop), #126 (typed PolicyActivity.details + backfill), #127 (generic ActorWizard factory), #128 (parseOutput client helper)
- **Guardrails**: #129 (CI tsc + PR template), #137 (T5 ESLint no-explicit-any)

## Goals

_To be confirmed with user — likely picking up tactical wins (T1–T4) and/or S2 once S1 merges._

## Progress

### Update — 2026-05-28 13:02 — Tomorrow's entrypoint

**Status**: Mid-flight on the maintainability sweep (#123). PR #138 (S1 tenant slice) is **open, awaiting smoke test + review**. Everything below is what you need to pick this back up without re-deriving context.

---

#### Where we are right now

- **Branch**: `feat/s1-tenant-domain-slice` (7 commits, pushed). Last commit `67365d0` — docs.
- **PR open**: [#138](https://github.com/netoho/hestia-app/pull/138) → `release/2.13.0`. Closes #124. Part of umbrella #123.
- **Release branch**: `release/2.13.0` (just cut, pushed). NEXT PRs all target this branch.
- **Verification state when PR #138 was opened**: 186 unit tests pass / 371 integration tests pass / `bun run build` green / zero `as any` in tenant paths.

---

#### The sweep — full map

Umbrella PRD: **[#123](https://github.com/netoho/hestia-app/issues/123)** (this is the strategic doc; refer back to it for the Why)

Recipe / pattern: **`src/lib/domain/README.md`** (porting recipe — read it before starting S2)
Architecture overview: **`docs/ARCHITECTURE.md`**

##### Strategic track — entity migrations (one PR each)

| Issue | Slice | Status | Blocked by |
|---|---|---|---|
| **#124** | S1 Tenant (gating, HITL) | **PR #138 in review** | — |
| #130 | S2 Landlord | not started | #124 |
| #131 | S3 Aval (validates conditional-required refinement) | not started | #124 |
| #132 | S4 Joint Obligor (biggest `as any` cleanup, 58 casts) | not started | #124 |
| #133 | S5 Policy (aggregate) | not started | #124 |
| #134 | S6a Document | not started | #124 |
| #135 | S6b Investigation | not started | #124 |
| #136 | S6c Receipt | not started | #124 |

##### Tactical track — independent, parallel-able with S1 in review

| Issue | Slice | Status | Notes |
|---|---|---|---|
| #125 | T1 — typed `policy` prop across 15+ components | **ready to start** | independent |
| #126 | T2 — typed `PolicyActivity.details` + backfill script | **ready to start** | independent |
| #127 | T3 — generic `ActorWizard` factory replacing 4 wizards | **ready to start** | independent (soft: S1 first if you want form adapters in the factory) |
| #128 | T4 — `parseOutput` client helper + canary adoption | **ready to start** | independent |

##### Guardrails

| Issue | Slice | Status | Notes |
|---|---|---|---|
| #129 | G — CI `tsc --noEmit` + PR template checklist | ready to start | tiny PR |
| #137 | T5 — ESLint `no-explicit-any` warn → error | blocked | needs T1+T2+T3+T4 to merge first |

---

#### S1 acceptance checklist (for the smoke test/review)

When reviewing PR #138, the bars to hit:

- [x] `src/lib/domain/tenant/{schema,select,adapters/{db,api,form}}.ts` exist
- [x] `TenantService` uses `tenantSelect` + `toDb`
- [x] `src/lib/utils/tenant/prepareForDB.ts` **deleted**
- [x] `actor.update` (tenant variant) declares `.output(tenantApiOutput)` via the re-exported `TenantOutputShape`
- [x] `TenantPersonalInfoTab-RHF` uses `tenantFormDefaults`
- [x] Unit tests for schema + adapters + **drift test** (44 new, all green)
- [x] `docs/ARCHITECTURE.md` + `src/lib/domain/README.md`
- [x] `grep -rn "as any" src/lib/utils/tenant src/lib/services/actors/TenantService.ts src/components/actor/tenant` → zero hits
- [x] Build + unit + integration all green

**Deferred from S1** (called out in PR body, follow-ups):

1. Removing `.passthrough()` from `ActorAdminUpdateSchema` for tenant fields specifically (requires per-type input schema or discriminated union at procedure level — deferred until after S2–S4)
2. The 3 non-PersonalInfo tabs (Employment/Rental/References) still construct their own `defaultValues` per-field (`...?? ''`). PR-4 left them as-is; S1 didn't widen scope to refactor them
3. Promoting `tenantFormDefaults` to a Zod-`.default()` walker (lower prio, explicit shape is clearer to read)
4. `prisma-zod-generator` evaluation deferred to S5

---

#### Smoke test plan for S1 PR #138

If you're driving the smoke locally tomorrow:

```bash
git fetch origin
git checkout feat/s1-tenant-domain-slice
git pull origin feat/s1-tenant-domain-slice

# Stash the .env.test.local footgun (points at dev DB):
mv .env.test.local .env.test.local.bak.session 2>/dev/null

bun run test:db:up
bun run test:unit              # → expect 186 pass / 0 fail
bun run test:integration:no-docker  # → expect 371 pass / 0 fail
bun run build                  # → expect green

# Restore:
mv .env.test.local.bak.session .env.test.local 2>/dev/null

# UI smoke (manual):
bun run dev
# 1. Open a tenant in the policy editor
# 2. Edit a personal field, save → no behavioral change
# 3. Edit an employment field, save → ditto
# 4. Force-complete a tenant (PR-2 flow) → still works through new adapter
# 5. Check that getById returns the same shape on the wire (DevTools)
```

The drift test (in `src/lib/domain/tenant/__tests__/adapters.test.ts`) is the load-bearing assertion — if it stays green, the API output is locked to the canonical schema.

---

#### What to start tomorrow — recommendation

Two parallel branches make sense:

1. **If PR #138 isn't merged yet**: pick a tactical (#125 or #127) and start it. T1 and T3 are the two highest-impact tactical wins. T1 is the fastest (typed prop replacement, ~1 day). T3 is the biggest LOC win (~600 LOC collapse from the 4 wizards).
2. **If PR #138 is merged**: start S4 (#132) — the joint-obligor port. It's the biggest strategic ROI (58 `as any` casts eliminated). Follow the recipe in `src/lib/domain/README.md` verbatim; tenant is the worked example.

Either way, **target `release/2.13.0`** for the PR base branch (per memory: PRs target the active release).

---

#### Conventions reminders

- **Commit per concern** — one focused commit per logical change. See PR #138's commits for the pattern (schema+select, adapters, service refactor, shim redirects, component updates, tests, docs — 7 commits).
- **PR base = active release branch** (`release/2.13.0` right now).
- **GitHub issues** for tickets (`gh issue create`), not Jira.
- **Tests use `bun`**: `bun run test:unit`, `bun run test:integration:no-docker`, `bun run build`.
- **Integration test footgun**: `.env.test.local` points at the dev DB. Stash it before running integration tests, restore after.
- **Use "protección" not "póliza"** in any user-facing copy (CLAUDE.md rule).
- **Naming convention for entity domains**: `<entity>Schema`, `<entity>Select`, `<entity>ApiOutput`, `<entity>FormDefaults`, `<entity>TabFields`.

---

#### Git Changes (since session start)

- Modified: `.claude/sessions/.current-session` (now points at this session)
- Added: `.claude/sessions/2026-05-28-1300-code improvements and new.md` (this file)

Working tree on `feat/s1-tenant-domain-slice` is otherwise clean — all S1 work was already committed and pushed before the session started.

---

#### Open questions / unresolved before tomorrow

1. **Smoke test outcome on PR #138** — does the manual tenant edit flow behave identically? Document the result here when you run it.
2. **Review feedback on the pattern** — if reviewers want the pattern adjusted (folder layout, naming, adapter return shape), this is the moment to redirect before S2–S6c apply it 7 more times.
3. **Pick #1 for tomorrow** — T1, T3, or wait for #138 to merge then S4. Decide based on review timing.
4. **The `release/2.13.0` branch lifecycle** — when does it stop accepting PRs and cut over to `release/2.14.0`? Worth confirming with the team if this initiative spans more than a couple weeks.

---

### Update — 2026-05-28 16:33 — PR #138 merged + audit follow-through + lessons

**Summary**: S1 (Tenant) is now on `release/2.13.0`. Ran a three-pronged audit between phases (GitHub sync + post-S1 codebase reality + forward-looking entity reconnaissance) which surfaced three significant findings; turned them into issue reshapes + a new issue + an umbrella comment. Capturing the next steps and the lessons learned so far so tomorrow's contributor (or future-self) can pick up cleanly.

**Git Changes**:
- Modified: `.claude/sessions/.current-session` (session pointer maintenance)
- Untracked: `.claude/sessions/2026-05-28-1300-code improvements and new.md` (this file — force-add at session end), `schema-source.md` at repo root (personal copy of the planning doc; ignored)
- Local branch: `feat/s1-tenant-domain-slice` (now stale — should switch to `release/2.13.0`)
- Merge target landed: `origin/release/2.13.0` is now at `c41cdf9 Merge pull request #138 from netoho/feat/s1-tenant-domain-slice` (the 7 S1 commits visible just below it)

**Task progress**: 21 completed in this session (#27 through #47), 0 in_progress, 0 pending. Audit follow-through tasks (#42–#47):
- ✓ #42 — File new issue #139 (S4a — Joint Obligor schema refactor)
- ✓ #43 — Edit #132 → S4b (port, blocked by #139)
- ✓ #44 — Edit #133 → S5 reframed as design + port, reordered to last
- ✓ #45 — Edit #127 → T3 explicitly blocked by S2 (#130)
- ✓ #46 — Edit #129 → G expanded with 6 recipe stubs
- ✓ #47 — Post audit summary comment on #123

---

#### Timeline of the session

- 13:00 — Session started; PR #138 in review, smoke testing.
- 13:02 — Wrote "tomorrow's entrypoint" log (the big summary block above).
- ~14:31 UTC — User merged PR #138 to `release/2.13.0`.
- 15:30 — `/session-current` check confirmed state.
- ~15:35 — User invoked `/grill-me`: requested a thorough audit of codebase + GitHub state to find blind spots and improvements.
- 15:35–16:30 — Three parallel `Explore` agents (GitHub sync, post-S1 codebase reality, forward-looking entity audit).
- ~16:00 — Grilled user on six decisions; user confirmed reshape-now + recipe-stubs + T3-blocked-by-S2 + S4-split-via-new-issue + tenantTabFields-cleanup-into-S2.
- ~16:15 — Wrote the resolutions into the plan file as a "Post-S1 audit" section.
- ~16:20 — Executed the audit follow-through: filed #139, edited #132/#133/#127/#129, posted summary comment on #123.
- 16:33 — This session update.

---

#### Lessons learned so far (regression sweep + S1)

12 takeaways from PRs #118–#122 (regression sweep) + PR #138 (S1 hexagonal slice) so future-me / next contributor doesn't re-derive them:

1. **Pattern recipes don't generalize from a single example.** S1 (tenant) was the proof-of-concept, but the forward-looking audit revealed 6 patterns tenant doesn't surface (multi-record, multi-dim discriminator, aggregate, sanitized output, state machine, per-procedure narrowing). **Implication**: when picking a proof-of-concept for a future architectural shift, pick one with multiple complexity dimensions, not just "biggest/most-used".

2. **Hidden scope ambushes are caught by forward-looking audits BETWEEN phases.** S4 looked like a port until we counted 62 `as any` casts and traced the root cause. S5 looked like a port until we counted "10 service files + no canonical schema". **Implication**: between phases, run a "what does the NEXT phase actually look like?" exploration before starting it. Worth the ~1 hour cost.

3. **The drift test is the load-bearing safety net.** In S1, `adapters.test.ts` asserts every API field exists in the canonical schema. This pattern transfers cleanly to every Sₙ and is the single most important test in the new architecture. **Implication**: every Sₙ MUST include a drift test of this shape, or the API output silently grows fields the schema doesn't model.

4. **Normalize-before-validate is the legacy contract.** During S1, the first unit-test failure was caused by putting schema validation BEFORE empty-string-to-null normalization. Forms submit string numbers + booleans + empty strings; canonical schemas reject all three. The order matters; inline comment in `db.ts` documents it. **Implication**: every `<entity>/adapters/db.ts` follows the SAME ordering (normalize → validate → transform). Document this in the recipe.

5. **`Result<T>` / `AsyncResult<T>` consistency lowers cognitive load.** Every adapter and service in the new layer returns the Result envelope; callers handle errors uniformly. **Implication**: don't mix throw/catch + Result — pick one and apply it ruthlessly.

6. **Backwards-compat shims work, but camouflage migration debt.** The `src/lib/schemas/tenant/index.ts` re-export shim kept 10 callsites compiling, but the shim hides a migration step. **Implication**: track shim removal in a TODO list — each Sₙ that touches an entity should also migrate that entity's importers off the shim.

7. **Type-system fights migrate up the stack.** `as any` in `prepareForDB.ts` was the visible problem; the hidden cause was that the canonical schema couldn't express what the data shape actually was (joint-obligor 2-axis). **Implication**: count `as any` per file, but don't assume the fix is local — sometimes it's "make the schema correct".

8. **Commit per concern paid off.** The 7 commits in PR #138 (schema+select, adapters, service refactor, shim redirects, component updates, tests, docs) made review tractable. Copilot's auto-summary was clean. **Implication**: keep doing this for every Sₙ; resist mid-PR squash.

9. **The architecture doc is load-bearing for the team, not just for me.** `docs/ARCHITECTURE.md` + `src/lib/domain/README.md` are the recipe. Without them, S2–S6c would each re-derive the pattern from scratch. **Implication**: invest in docs at S1; highest-leverage artifact in the initiative.

10. **Smoke testing is the human-in-the-loop check tests can't replace.** Manual smoke caught no regressions but is what gave you confidence to merge.

11. **The `.env.test.local` footgun is real.** Every integration test run requires stashing it. Documented in `docs/TESTING.md` but easy to forget. **Implication**: future cleanup PR — bake the stash into the test runner script.

12. **Issue updates can cascade and that's OK.** When the audit findings landed, FIVE issues needed body edits + 1 new issue + 1 comment on umbrella. Not overhead — it's the cost of keeping the source of truth aligned with reality. **Implication**: budget ~30 min of issue maintenance between phases.

---

#### Current sweep state (as of 16:33 today)

| # | Slice | Status | Notes |
|---|---|---|---|
| #124 / PR #138 | S1 — Tenant slice (gating) | **MERGED** | `c41cdf9` on `release/2.13.0` |
| #125 | T1 — Typed policy prop | **ready to start** | smallest concrete win |
| #126 | T2 — PolicyActivity.details + backfill | ready to start | independent |
| #127 | T3 — Generic ActorWizard factory | **blocked by #130 (S2)** | updated this session |
| #128 | T4 — parseOutput client helper + canary | ready to start | independent |
| #129 | G — CI tsc + PR template + **6 recipe stubs** | ready to start (expanded scope) | updated this session |
| #130 | S2 — Landlord domain slice | **ready to start** (S1 merged) | validates multi-record + absorbs `tenantTabFields.ts` cleanup |
| #131 | S3 — Aval (conditional refinement) | ready to start (S1 merged) | clean teaching example |
| #132 | S4b — Joint Obligor port | blocked by #139 (S4a) | reframed as mechanical port |
| #133 | S5 — Policy (design + port; capstone) | blocked by #134/#135/#136 | reordered to last |
| #134 | S6a — Document | ready to start (S1 merged) | leaf entity warm-up |
| #135 | S6b — Investigation | ready to start (S1 merged) | state machine + sanitized output |
| #136 | S6c — Receipt | ready to start (S1 merged) | state machine + dual-auth |
| #137 | T5 — ESLint no-explicit-any | blocked by T1+T2+T3+T4 | unchanged |
| #139 | **S4a — JointObligor schema refactor (NEW)** | ready to start (S1 merged) | filed this session; blocks #132 |

**Newly unblocked by S1 merge**: S2, S3, S4a, S6a, S6b, S6c (every Sₙ except S4b and S5).

---

#### Next steps — tomorrow's pickup

**Step 0 (housekeeping, before anything else)**:

```bash
cd /Users/neto/Development/hestia/hestia-app
git fetch origin
git checkout release/2.13.0
git pull origin release/2.13.0
# (optional, cleanup) git branch -D feat/s1-tenant-domain-slice
```

**Recommended Step 1 (lowest risk, highest visible-`any`-count drop)**:

Start **T1 #125 — typed `policy` prop**. ~1 day. Independent of the strategic track. Replaces `policy: any` in 15+ display components with `inferProcedureOutput<AppRouter['policy']['getById']>`. Smallest concrete win, validates the tRPC-inferred-type pattern, unblocks T5 (#137) progression.

```bash
git checkout -b feat/t1-typed-policy-prop release/2.13.0
# implement per #125 acceptance criteria
# commit per concern, push, gh pr create against release/2.13.0
```

**Recommended Step 2 (parallel-able)**:

If a second person is available, start **S2 #130 — Landlord domain slice**. ~1-2 days. Validates the multi-record pattern. Absorbs the dead `tenantTabFields.ts` cleanup. Recipe is in `src/lib/domain/README.md`.

```bash
git checkout -b feat/s2-landlord-domain-slice release/2.13.0
# follow the recipe verbatim; tenant is the worked example
```

**Other options**:

- **T2 #126 (PolicyActivity.details + backfill)** — ~1.5 days, independent. Backfill script is a fun design challenge.
- **G #129 (expanded — CI + PR template + 6 recipe stubs)** — ~1 day. Lowest LOC, highest documentation leverage. Lands docs before the next strategic slice.
- **S3 #131 (Aval)** — clean teaching example of the conditional-required pattern; mechanical port now that S1 is merged.

**Do not start (blocked)**:
- T3 #127 — until S2 merges
- T5 #137 — until T1+T2+T3+T4 merge
- S4b #132 — until S4a #139 merges (note S4a IS ready to start)
- S5 #133 — capstone, last

---

#### Open questions / unresolved before tomorrow

1. **Pick T1 or S2 (or both)?** Recommendation above is T1 first solo, or T1+S2 in parallel if two people.
2. **Squash strategy for next strategic PR** — PR #138 was merged with `--merge` (7 commits preserved). For S2 onwards: preserve commits (`--merge`) for strategic slices, squash (`--squash`) for tactical wins where granularity matters less. Decide upfront.
3. **`release/2.13.0` cadence** — when does this branch get tagged/deployed? Still open from session start.
4. **`schema-source.md` at repo root** — personal artifact, not tracked. Delete or move to `.claude/`.
5. **Audit between phases — make it a ritual?** This session's audit caught 3 critical findings at ~1h cost. Worth formalizing as a standing practice: every strategic-slice merge triggers a "before next slice" audit.

---

#### Pointers for tomorrow's contributor

- Plan file: `/Users/neto/.claude/plans/ultrathink-now-that-you-compiled-stallman.md` (locked decisions + post-S1 audit section)
- Architecture: `docs/ARCHITECTURE.md` (one-page rationale + tenant walkthrough)
- Recipe: `src/lib/domain/README.md` (concrete porting steps — read before S2)
- Umbrella PRD: https://github.com/netoho/hestia-app/issues/123
- Audit comment: https://github.com/netoho/hestia-app/issues/123#issuecomment-4564962009
- Tenant slice (the worked example): `src/lib/domain/tenant/` + `src/lib/domain/tenant/__tests__/`
- Memory rules (relevant): commit-per-concern; PR target = active release branch (`release/2.13.0`); GitHub issues not Jira

---

### Update — 2026-06-08 12:48 — Multi-landlord epic CLOSED + maintainability sweep S2/S3 shipped

**Summary**: Since the last entry (2026-05-28) two arcs completed: (A) the **multi-landlord epic (#140)** shipped end-to-end and is **closed**; (B) the **maintainability sweep (#123)** advanced through **S2 Landlord** and **S3 Aval**. Tenant(S1)✅ Landlord(S2)✅ Aval(S3)✅.

**Git Changes**:
- Branch: `feat/s3-aval-domain-slice` (last commit `a6bbf89`), 2 commits ahead of `release/2.13.0`.
- This-branch commits: `aab4e0a` feat(domain): aval slice; `a6bbf89` refactor(aval): migrate consumers + delete prepareForDB.
- Working-tree leftovers are **not-mine** and intentionally untouched: `CLAUDE.md` (M — the "primary landlord = isPrimary, don't rely on index" line was deleted by the user on purpose; see memory `project_primary_landlord_legacy`), `.claude/sessions/.current-session` (M), `schema-source.md` (??).

**Todo Progress** (S3 phase): 4 completed, 0 in progress, 0 pending.
- ✓ domain/aval/schema.ts + select.ts
- ✓ aval adapters (db/api/form) + 25 unit tests
- ✓ wire consumers + delete prepareForDB + remove 2 `as any`
- ✓ verify + commit + PR (#149)

**PR ledger (this session arc)**:
- MERGED: #141 (gate/progress/links), #142 (renewal clone), #143 (creation wizard + focus data-loss + dead formMessages), #144 (notifications/investigation-approval/cover-banking correctness), #145 (per-co-owner renewal UI), #146 (S2 landlord domain+backend), #147 (S2 landlord form-layer zero-`as any`).
- OPEN / awaiting merge: **#149 (S3 Aval)**.
- Housekeeping: **#140 closed** (epic done); **#130 closed** (S2 done); **#148 filed** (tech-debt: remove `.passthrough()` for landlord+tenant once relation sub-schemas exist).

**Details — what each arc delivered**:

*A. Multi-landlord epic (#140, closed):* every landlord is now first-class; "primary landlord" is legacy.
- Creation wizard captures N landlords; gate/progress/share-links/reminders cover all landlords.
- Renewal clones all landlords + **per-co-owner renewal selection UI** (LandlordSelection → array, mirroring JO/aval instance pattern).
- Notifications fan out to all landlords (payment, expiration, quarterly); **any landlord** can approve/reject the tenant investigation (shared token, first-to-act wins); cover letter lists every non-null banking block; banking optional for all.
- Bug fix: SessionProvider `refetchOnWindowFocus={false}` + `keepDirtyValues` reset → focus no longer wipes actor-form edits.

*B. Hexagonal domain slices (#123):* pattern = canonical Zod in `src/lib/domain/<entity>/` + db/api/form adapters; `src/lib/schemas/<entity>/index.ts` becomes a re-export shim; `src/lib/utils/<entity>/prepareForDB.ts` deleted; `<Entity>Service.getIncludes()` → `<entity>Select`; `<Entity>OutputShape` → `<entity>ApiOutput`.
- S2 Landlord: multi-record case; `{ landlordData, policyData }` split adapter; zero `as any` across service+utils+components.
- S3 Aval: **conditional-required refinement** pattern (spouse-when-married). Refine lives on the property *tab* schema; aggregate schemas spread the *base* (refinements don't survive shape-spread); form `.keyof()` uses the base (refined = `ZodEffects`). `toDbReferences` handles exactly-3 refs → `{ create }`.
- Verification each slice: full unit suite + 39 actor integration tests green; baseline tsc diff net-negative (S2 −3, S3 −6).

**Next steps (prioritized)**:
1. **Merge #149** after smoke test (see guide below).
2. **S4 Joint Obligor** — highest `as any` payoff (**58** in `joint-obligor/prepareForDB.ts`). Gated on **#139** (JO schema → 4-branch discriminated union for income-vs-property guarantee). #139 is a genuine *design* fork — grill the user on the 4-branch shape before coding. Then **#132** does the port.
3. **S5 Policy (#133)** capstone (aggregate; lands last) → **S6a/b/c** Document/Investigation/Receipt (#134-136).
4. Tactical (independent, low-risk): **T1 #125** typed `policy` prop, T2 #126, T3 #127, T4 #128.
5. Guardrail **#129** (CI tsc gate) — PR-template + recipe stubs can land now; the **tsc-gate itself is blocked** until the error count nears zero (~251 today; the S-track is what clears it).

**Blind spots / risks (read before next pickup)**:
- **`.passthrough()` debt (#148)**: actor-router outputs still passthrough nested relations (`addressDetails`, `policy`, …) for *every* entity (S1 kept it too — it's inherent to the polymorphic router). Core scalar fields are contract-locked; nested shapes are not. Not urgent; do once shared relation sub-schemas exist.
- **Endemic tsc noise (~251 errors)**: the `baseline-diff` is noisy because a cluster of pre-existing errors reshapes on any type change — `TS7053` document-category indexing across actor components, RHF "two different types with this name" (PropertyStep-RHF), `ActorCard`/`useDocumentOperations`/`useShareLinks` document-array typing. These are NOT introduced by the slices; they're the backlog. Always diff with `comm` + exclude `TS7053|ProcedureResolver|can't be used to index` and trust the NET count.
- **Pre-existing latent bug NOT fixed (out of scope)**: `AvalService.ts` ~line 101 `throw new ServiceError(..., { avalId: id })` references undefined `id` (param is `avalId`) → `Cannot find name 'id'` (in baseline). Only matters on the not-found error path. Worth a one-line fix in a future touch.
- **Adapter typing is loose**: `AvalDbPayload = Record<string,unknown>` forced 3 `AddressWithMetadata` casts in the service. JO/Policy may want a tighter payload type to avoid this.
- **Docker flakiness**: the test DB container went down twice mid-session (daemon not running). Always `bun run test:db:up` and confirm "Healthy" before integration tests; frontend-only changes don't need it.
- **Shims accumulate**: `schemas/{tenant,landlord,aval}/index.ts` are now re-export shims. Deletion is deferred to a post-S6 cleanup PR — don't delete early (many importers).
- **Behavior-preservation confidence** rests on the 39 actor integration tests (they exercise the polymorphic router for all actor types) + the per-slice unit tests. There is no end-to-end test that drives a full aval tab-save through the service with the `{create}` references format — covered indirectly only.

**Smoke test guide**:
- **S3 Aval (#149) — primary target**:
  1. Staff dashboard → a policy with an **Aval** guarantor → edit the aval actor.
  2. Tabs load + save: Personal, Employment (individual only), **Property/Guarantee**, References, Documents.
  3. **Conditional refine**: Property tab → set marital status `married_joint` with **no** spouse name → save should be **blocked**; add spouse name → **saves**. `single` → saves with no spouse.
  4. **Exactly-3 references**: try saving 2 refs → blocked; 4 → blocked; 3 → saves.
  5. Property guarantee required fields: value, deed number, registry folio.
  6. **Company aval**: legal-rep fields map correctly (name fields → legalRep*).
  7. **Actor portal** (token link, not staff): repeat a tab save as the aval themselves.
- **Regression (shared polymorphic router touched by shims + getIncludes)**: smoke-test **tenant** and **landlord** actor edit + **joint-obligor** edit too — they share the actor router/output path.
- **Multi-landlord (merged #141-145), re-confirm**: create policy with 2+ landlords (each gets an info-request link); renewal page shows per-landlord carry-over checkboxes; a payment/expiration/quarterly notification reaches **all** landlords; any landlord can approve an investigation.

**Key pointers**:
- Recipe: `src/lib/domain/README.md` · worked examples: `src/lib/domain/{tenant,landlord,aval}/`.
- Verify pattern: `bun run test:unit`; `bun run test:db:up` then `bun run test:integration:filter tests/integration/routers/actor.test.ts`; baseline tsc diff via `git stash` + `comm`.
- `.env.test.local` points at the **dev** DB (no `_test` suffix) — the preload guard blocks it; integration runs must bypass it (`mv .env.test.local .env.test.local.bak`, run, restore). Docker daemon must be running.

---

### Update — 2026-06-18 13:53 — S4 (Joint Obligor) + S6a (Document) + S6b (Investigation) shipped & MERGED

**Summary**: This arc completed and **merged** the Joint Obligor port (S4: PR0 enum + S4a + S4b), the Document slice (S6a), and the Investigation slice (S6b) into `release/2.13.0`. The hexagonal sweep (#123) now has only **S6c Receipt** + the **S5 Policy capstone** + tactical/guardrail remaining.

**Git Changes**:
- Branch: `feat/s6b-investigation-domain` (`a221194`) — merged via #158; now stale.
- Working-tree leftovers (not-mine, intentional): `M CLAUDE.md`, `M .claude/sessions/.current-session`, `?? <this session file>`, `?? schema-source.md`.
- ⚠️ **LOCAL `release/2.13.0` is STALE** (behind #156/#157/#158). **Step 0 tomorrow: `git fetch origin && git checkout release/2.13.0 && git pull`** (then delete the merged `feat/*` branches).

**PR ledger (this arc — all MERGED into `release/2.13.0`)**:
- **#153** PR0 — `GuaranteeMethod` UPPERCASE enum + app-wide value normalization (migration **already run** manually ✓).
- **#154** S4a — JO canonical `z.discriminatedUnion` + synthetic `jointObligorVariant`.
- **#156** S4b — JO domain port: typed `toDb` + address upsert + **deleted both `prepareForDB.ts`** (−623 lines; the 58-`as any` hotspot gone).
- **#157** S6a — Document (ActorDocument) slice + typed `actorFieldFor` ownership check (−3 `as any`).
- **#158** S6b — Investigation slice + **sanitized `getByToken` via `.pick`** (PR #100 invariant).

**Housekeeping (this arc)**: #131 closed; filed **#150** (JO field-parity — product), **#151** (aval variant retrofit), **#152** (landlord single-update wiring gap); re-scoped #139/#132 via audit comments.

**Headline wins**:
- Project `as any` **~163 → ~99** on merged release (S4b −61, S6a −3). #123 story 32 (≥50 drop) cleared. *(Verify exact count after pulling release — local s6b branch still reads 163 since it was cut pre-S4b-merge.)*
- S4 (Joint Obligor) — the worst hotspot — fully eliminated; its complete-save path no longer writes ~12 phantom fields.
- New patterns validated: **2-axis synthetic discriminator** (JO), **leaf-entity slice** (Document), **sanitized-output-via-`.pick`** (Investigation).

**#123 status**:
| Slice | State |
|---|---|
| S1 Tenant / S2 Landlord / S3 Aval | merged (prior) |
| PR0 / S4a / S4b (Joint Obligor) · S6a Document · S6b Investigation | ✅ merged THIS arc |
| **S6c Receipt (#136)** | ⏭️ NEXT (last S6 leaf) |
| **S5 Policy (#133)** | ⏭️ capstone — now gated only on S6c; **DESIGN-first, not mechanical** |
| T1–T4 (#125–128) · guardrail #129 | ⏭️ tactical |
| follow-ups #150 / #151 / #152 | filed, not started |

**Next steps (prioritized)**:
1. **Step 0**: pull release (local stale), delete merged branches.
2. **S6c Receipt (#136)** — `TenantReceipt` + `ReceiptConfig`. Last S6 leaf. Pattern = **state-machine (receipt statuses) + dual-auth (tenant token / monthly receipt portal)**; likely a token/sanitized output. Closest worked example: **investigation (#158)** for the token + state-machine shape; document (#157) for the leaf shape.
3. **S5 Policy (#133)** — capstone aggregate. **NOT mechanical**: ~10 service files, no single canonical schema → needs a **design pass first (grill the user on the aggregate schema)** before coding. Lands last (after S6c).
4. Tactical **T1–T4** (#125–128) + guardrail **#129** (CI `tsc`/eslint `no-explicit-any` gate — increasingly viable as `as any` → ~99; turn it on once low enough).
5. Follow-ups: **#150** (product: JO DOB/ID/company-detail parity), **#151** (aval `avalVariant` retrofit — see memory `project_actor_variant_consistency`), **#152** (route `LandlordService` single-actor update through `landlordToDb`).

**⚠️ SMOKE TESTS NEEDED** — S4b/S6a/S6b landed via merge **without manual smoke**. Run `bun run dev` and verify:
- **S4b Joint Obligor (HIGHEST RISK — rewired production write path; 42 integration tests pass but confirm manually)**:
  1. Staff → policy with a Joint Obligor → edit JO actor.
  2. Personal tab save → names + address persist (`addressId` set).
  3. Guarantee tab **INCOME** → bank fields + `monthlyIncome` persist; `hasPropertyGuarantee=false`.
  4. Guarantee tab **PROPERTY** → property value/deed/registry + guarantee-property address persist; `hasPropertyGuarantee=true`.
  5. Exactly-3 references save. Company JO → `legalRep*` persist.
  6. Actor portal (JO **token** link): repeat a tab save as the JO.
  7. Submit / force-complete → `informationComplete` flips.
- **PR0 enum (migration ran)**: existing `guaranteeMethod` data is UPPERCASE; JO/aval guarantee tabs load+save; cover-letter/PDF "Método de Garantía" renders (i18n keys now UPPERCASE).
- **S6a Document**: upload (presigned) → confirmUpload → list → download → delete; actor token sees only own docs (403 on others').
- **S6b Investigation**: open the broker/landlord **approval page** (`getByToken`) and inspect the network response — confirm **NO `brokerToken`/`landlordToken`/`tokenExpiry` leak**; create → submit → approve/reject via token; approval URLs work.
- **Cross-cutting regression**: one policy — edit all 4 actor types + upload a doc + approve an investigation.

**Gotchas / lessons (this arc)**:
- LOCAL `release` stale after merges — fetch/pull FIRST.
- Docker daemon dropped mid-session — `open -a Docker` (then `bun run test:db:up`, confirm "Healthy") before integration.
- `.env.test.local` → dev DB; stash before integration (`mv … .bak`), restore after.
- **tsc baseline ~421 is noise** (TS7053 doc-category indexing, ProcedureResolver, RHF) — ALWAYS base-vs-branch `comm` diff (line-number-stripped) + trust the NET; never read the absolute count.
- **Grep the WHOLE repo** (incl. `prisma/`, `scripts/`, gitignored `tests/`) when sweeping — the `seed.ts` uppercase miss + the JO `update → save()` reachability were caught only by going beyond `src/`. (I twice mis-judged the JO complete-save as "dead" before reading the full call chain — read `BaseActorService.update` → `this.save()` before claiming reachability.)
- Pre-existing latent issues left as-is (out of scope, noted on PRs): `validateJointObligorTab` `.partial()` on `ZodType` (tsc); `JointObligorService` line-6 `Prisma`/`PrismaClient` imported from `…/enums` (wrong module); `AvalService` ~L101 `id` vs `avalId`.

**Key pointers**:
- Recipe: `src/lib/domain/README.md` · worked examples now: `tenant, landlord, aval, joint-obligor (2-axis variant), document (leaf), investigation (sanitized output)`.
- Verify: `bun run test:unit`; `bun run test:db:up` → `bun run test:integration:filter tests/integration` (full) or one router file; tsc base-vs-branch `comm` diff.
- Umbrella PRD: #123. Memory: `project_actor_variant_consistency` (synthetic-variant standard; aval retrofit = #151).

---

### Update — 2026-07-05 — WORLD-STATE AUDIT (52 agents) + grill session + execution day

**Summary**: Ran the full sync audit (code ↔ GitHub ↔ session ↔ all 28 *.md; 9 auditors + 36 adversarial verifiers + critic + 6 gap-fillers, 0 errors). Verdict: code/session in sync, GitHub peripherally drifted, docs badly stale. **Greenfield rewrite evaluated and REJECTED on evidence** (user ratified). Grilled through every branch; then executed: GitHub true-up, 188 branches deleted, guardrails PR opened, ship runbook delivered.

**Audit headlines** (full detail: task output `w8f68yeax`, journal in session subagents dir):
- E2E suite already existed but **gitignored + dead** (ESM crash, dead selectors) and `resetDatabase()` could truncate the dev DB (no `_test` guard — fixed in PR #170).
- **Smoke tests for S4b/S6a/S6b: RUN AND PASSED** by the audit itself (scratch Postgres + live dev server; JO both variants, 9/9 uploads, sanitized getByToken leak-free). #155's only recorded blocker satisfied.
- PR #155 merge auto-deploys prod; GuaranteeMethod migration must run right AFTER deploy; **unverified whether it already ran on prod** (if so, prod JO/aval saves have been failing since ~06-09 and shipping is a FIX).
- Prod frozen at v2.12.5 (05-27); staging repo stale; tags lapsed at 2.12.3; no type gate anywhere (`ignoreBuildErrors: true`, ESLint not installed); tsc = 417 (now 411 tracked).
- Security: tokens 1000d + survive cancellation; deactivated users can log in; open BROKER self-registration; in-memory rate limiter.
- Canonical numbers: `as any` = **96**, integration tests = **385/15 files**, procedures = **108** (all output-locked), REST = 18 files/20 exports.
- Pain #1 verdict: hex works where shipped (scalar add = 3 files + migration); biggest uncovered hole = **clone copy-lists silently null new fields** (renewal/replacement/guarantorTypeChange).

**Decisions locked (grill session)**:
1. **Continue sweep** — no greenfield. 2. **Ship #155 now** via runbook. 3. **E2E**: fresh harness, 7 spanning scenarios + renewal; full suite on PR→main/master + push release/*+hotfix/*; branch protection (PAID plan — available). 4. **Sequencing**: ship → guardrails+e2e harness → copy-list drift test → S6c → T3+T1 → S5a last behind full net. 5. **Docs**: one purge PR (tomorrow) + PR-template rule. 6. **Security**: isActive gate, tokens 180d + cancellation invalidation, dep hygiene, **NO self-registration ever** (dashboard invite + join link), **Turnstile** on public pages. 7. **S5 split**: #133 = S5a slice (1:1), #169 = S5b multi-tenant 1:N.

**Executed this session**:
- **Issues filed #159–#169**: 159 copy-list drift (CRITICAL) · 160 reverse form→schema drift test · 161 e2e epic · 162 kill self-registration · 163 Turnstile · 164 isActive · 165 token TTL 180d · 166 dep hygiene (next→15.5.20) · 167 docs purge · 168 dead tab-fields (−16 as-any) · 169 S5b.
- **Closed with evidence**: #132/#134/#135/#139 (auto-close never fired — non-default-branch merges). **Comments**: #123 status+plan, #129 reshaped checklist, #127/#151/#148/#136/#137 corrections. **#133 retitled S5a** + rescoped.
- **Branch cleanup**: 98 local + 90 remote merged branches deleted; `origin/HEAD → main` fixed. Survivors = unmerged-commit branches only.
- **`release/2.14.0` cut + pushed** (next-arc base). **PR #170 opened** (guardrails, 6 commits): .gitignore tracks tests/+.github/, `_test` guard, 3 test tsc fixes, `.env.test.local` auto-fallback (stash dance dead), ESLint 10 flat config (any=warn), **tsc ratchet baseline 411** (`bun run typecheck:ratchet`, CI-wired), typescript pinned 5.9.3, PR template. Unit 304/304 green.
- **Ship runbook delivered** (scratchpad `RUNBOOK-ship-2.13.0.md`, sent to user): Phase 0 pre-flight SQL ⏳ **WAITING ON USER** → merge → deploy → user migrates → verify → tag.
- **Memory written**: `project_release_flow`, `project_security_decisions`, `project_e2e_and_guardrails`.

**Next steps**:
1. ⏳ User runs Phase 0 pre-flight → ship #155 → tag 2.13.0 (+ backfill 2.12.5 tag) → then branch protection on main (Tests required; add e2e when #161 lands).
2. Docs purge PR (#167) — tomorrow's first PR, base `release/2.14.0` (includes CLAUDE.md domain-layer rule + Patterns A–F).
3. E2E harness PR (#161 phase 1: E2E-01/02). 4. #159 drift test. 5. Quick wins: #164, #166, #168, #162. 6. S6c (#136) → T3/T1 → S5a → S5b.

**Gotchas discovered**: `bun add` rewrites package.json (re-read before editing); GitHub "Closes #" only fires on default-branch merges — always close slice issues manually; ratchet counts TRACKED files only (untracked local files skew tsc counts); eslint installed at v10 (flat config required).

---

### Update — 2026-07-05 (later) — 🚢 2.13.0 SHIPPED + docs purge PR

**Ship (task 4 complete)**: pre-flight = Case A (migration unapplied on prod, 0 stray rows, income×6 lowercase + NULLs). **PR #155 was sitting in DRAFT — the hidden reason it never merged.** `gh pr ready` → merge → Vercel prod live in ~90s → user ran migration → smoke passed → tagged **2.13.0** (`ac83545`) + backfilled **2.12.5** (`c1a9fdc`). PR #170 (guardrails) also merged by user into release/2.14.0; ratchet live in CI (its first run caught my own determinism bug — local `.next/types` suppressed 21 errors → fixed with `tsconfig.ratchet.json`, baseline **434**, verified identical local vs pristine clone).

**⚠️ Branch protection BLOCKED**: gh returns 403 "Upgrade to GitHub Pro" for BOTH classic protection and rulesets — the `netoho` account hosting this private repo is on the FREE plan (user believes they're on paid — plan may be on another account/org). Until resolved, CI gates are advisory-by-convention. Revisit when the plan question is answered.

**Prod smoke findings → #171** (one root cause, two symptoms): admin inline editor tab forms never `reset()` to fetched/refetched data — refresh button doesn't reload addresses (InlineActorEditor invalidates at :121 but no form reset) and JO "Información Financiera" always renders the hardcoded `guaranteeMethod:'INCOME'` default (JointObligorGuaranteeTab-RHF:55). The class ("filled in one surface, invisible in the other") maps to the existing plan: T3 #127 (bake reset-on-data in the factory), S5a #133 (canonical selects for admin aggregate), #148 (locked outputs), #159/#160 (save-side), #161 (cross-surface parity assertions — scope comment added). Also filed **#172** (S3 avatar orphan cleanup, salvaged from BACKLOG.md).

**Docs purge shipped as PR #173** (closes #167; base release/2.14.0; 8 commits): deleted BACKLOG+CODE_QUALITY_PLAN, archived root plan files to docs/archive/, refreshed all counts (385/15, 108+20), POLICY_STATUS direct-approval edge, ONBOARDING port/scripts/enums, rewrote schemas+services-actors READMEs, **domain README Patterns A–F from merged code** (completes that #129 item), catalog fixes (dashboard router, 4 REST routes, verified methods), created RELEASE_RUNBOOK.md + documentManagement README + scripts README, **CLAUDE.md now teaches the domain layer** (+ carries the user's primary-landlord line removal).

**Next**: merge #173 when CI green → e2e harness phase 1 (#161: fresh ESM config, MinIO, data-testid pass, E2E-01/02) → #159 drift test → quick wins (#164/#166/#168/#162) → S6c #136 → T3/T1 → S5a → S5b. GitHub plan question for the user (protection needs Pro on netoho or repo transfer).

---

### Update — 2026-07-05 (night) — E2E PHASE 1 GREEN: harness + E2E-01/02 shipped as PR #174; 9 real bugs surfaced

**Summary**: #173 (docs purge) merged by user. Built the #161 e2e harness from scratch and ran the run-to-green loop (13 iterations on E2E-01, 7 on E2E-02). **Both scenarios green end-to-end** (baseline ~57s; company+JO+split ~84s): wizard → portals (real presigned MinIO uploads) → investigation → public approval → auto PENDING_APPROVAL → manual payment+receipt+verify → ACTIVE. Full verification: e2e 3/3, integration 385/385, unit 304/304, ratchet 434=baseline. **PR #174** → release/2.14.0.

**The harness caught 9 real app bugs** (the whole point of pain #2):
- FIXED in #174: (1) AddressAutocomplete hardcoded native `required` on all 8 inputs → optional-empty-address forms were **silently unsubmittable** in prod (requestSubmit fails native validation, zero feedback); (2) tenant personal passed `required` under a `<FormLabel optional>`; (3) **`policy.getById`'s strict actor sub-shapes STRIPPED portal-saved fields on the wire** (guaranteeMethod/monthlyIncome/occupation/…) → admin detail rendered "-" — **the root cause of #171's display symptom**; now passthrough until #148/S5a (caught by E2E-02's cross-surface parity assert). Also: `forcePathStyle` for custom S3 endpoints (presigned URLs vs MinIO/Spaces).
- FILED as **#175** (null/empty/zero rejection family): null-vs-optional address objects blocking tenant completeness; router inputs 400ing on null optional strings (company legalRep*); empty-string dates failing regex on the adapter-bypassing savePropertyDetails path; **`upsertAddress({})` → Prisma "Argument street is missing" → whole tab-save transaction 500s**; JO income 0-default vs .positive(); ManualPaymentDialog amount prefill 0. E2E helper workaround fills are commented = #175's regression checklist.

**Harness design locked in code**: dedicated `hestia_e2e_test` DB; workers=1 + per-scenario freshDb; stable seeded admin id (`test-admin-user-id` — resets don't invalidate the storageState JWT; without it every create P2003s); official minio/minio image (bitnami catalog is GONE from Docker Hub) with bucket-create in global-setup; converging batch-fill (`fillAllStable`) defeats the dev-strict-mode remount wipe; tokens read from DB (persisted before email attempts); payments seeded (Stripe-only creation paths excluded by design) then driven through the real record/verify dialogs; ONE data-testid added app-wide (policy-actions-menu). CI: e2e.yml fires on PR→main/master + push release/**|hotfix/** (NOT on feature PRs — those run test.yml).

**Run-to-green lessons (for E2E-03+)**: CardTitle is a div (never getByRole heading); RHF hydration needs a value-barrier + converging fills; `requestSubmit()` silently no-ops on ANY native-invalid control; kill orphaned :9002 servers before blaming code; probes > theories (checkValidity dump + trpc capture cracked every wall); playwright global-setup resets the DB — replay probes must build own state.

**GitHub**: PR #174 open (CI watched); #175 filed; root-cause comment on #171; phase-1 comment on #161. Next per sequence: merge #174 → E2E-03/04 PR → #159 drift test → quick wins (#164/#166/#168/#162/#175) → S6c #136 → T3/T1 → S5a → S5b.

---

### Update — 2026-07-05 (late night) — E2E PHASE 2: 03/04 GREEN as PR #176; FIVE app bugs — aval + company-guarantor portals were structurally unusable

**Summary**: #174 merged by user → built E2E-03 (company landlord + JO COMPANY_PROPERTY) and E2E-04 (aval `married_joint` + spouse + S3-refine negative probe) on the phase-1 harness. Run-to-green (4 iterations on 03, 3 on 04) flushed out **five app bugs invisible to unit+integration** — all fixed in-PR. **PR #176** → release/2.14.0. Full verify: e2e **5/5** (~5.8m), integration **385/385**, unit **304/304**, ratchet **409** (−25, baseline updated).

**The five bugs** (the aval portal + ALL company-guarantor self-service were dead; staff force-complete was the silent workaround):
1. **Dead type toggle** — tenant/JO/aval personal tabs validated against the mount-time type prop (`z.literal` pins) while rendering by the watched value → the Persona Moral radio could never save. Fix: dynamic resolvers (validate against the type in the form values).
2. **Discriminator reversion** — zodResolver strips non-tab-schema fields → guarantee/references/documents payloads carry no `jointObligorType` → JO service defaulted INDIVIDUAL and the adapter FORCE-WROTE it → any such save reverted a COMPANY JO. Tenant adapter had the same unconditional `working.tenantType = opts.tenantType` ("defensive" comment, destructive behavior). Fix: JO service falls back to ROW truth (type + guaranteeMethod); JO/tenant adapters only write the type column when the input carried a type signal. E2E-02 now asserts `tenantType==='COMPANY'` survives.
3. **Company references never counted** — JO + aval `validateCompleteness` counted `personalReferences` unconditionally; company actors only get commercial refs UI → company submission impossible (`requiresForce` the only path). Fix: count by type.
4. **Aval tab saves 400'd against a pseudo-partial master** — `avalPartialSchema` spreads the personal tab UN-partialed and `avalToDb` does NOT validate (unlike tenant/JO adapters) → EVERY non-personal aval tab save failed ("firstName Required" on employment). Fix: tab saves validate against that tab's schema (mirrors JO `validateTabData`); ZodEffects tabs (property/spouse refine) validate full; master gate kept for non-tab saves.
5. **Aval references tab rendered ZERO cards** — `initialData?.personalReferences || [3 defaults]`: fresh aval has `[]` (truthy!) → no cards → 3-refs requirement unmeetable. Fix: length-checked fallback (JO tab already did).

**Also fixed**: e2e.yml maiden CI run died at `bun install` (prisma.config.ts resolves DATABASE_URL eagerly; job env only had E2E_DATABASE_URL) → job-level DATABASE_URL mirroring test.yml:33. First green E2E Actions run should be #176's merge push.

**Harness additions**: WizardOptions company-landlord toggle + AVAL branch; helpers `completeLandlordCompanyPortal`, `completeJointObligorCompanyPropertyPortal` (in-portal type switch needs save→toast-barrier→reload→re-save: `tabSaved` is client-state, tab SET derives from saved type), `completeAvalMarriedPortal` (negative probe: property save blocked until spouseName filled — asserts 'Spouse name is required when married', an English string in the Spanish UI, nit noted in PR); shared `pickUnsetSelects`/`pickOptionByName`/`fillOptionalStrings`/`fillCommercialReference`.

**Run-to-green lessons (new)**: exit code 0 through a pipe is tail's, not playwright's (capture full output, no pipes); trace.zip network entries (resources/*.json by sha1) beat theorizing — the "8 calls all 200" probe is what proved the JO save never fired; Playwright's error-context.md ARIA snapshot instantly revealed the references-tab flip (commercial→personal mid-fill) and the zero-cards render; specs are LOADED at run start — edits mid-run don't apply; the dev-overlay "N Issues" badge in a snapshot = a component render crashed.

**GitHub**: **PR #176 open** (CI watching); **#177 filed** (MARRIAGE_CERTIFICATE dead category — E2E-04's cert upload not driveable, needs product call); comments: #175 (TenantService.upsertAddress logged-and-swallowed EVERY tenant flow + fillOptionalStrings = regression checklist), #171 (dead-toggle same split-brain family; residue: buildUpdateData still guesses validation schema — row-truth plumbing belongs to S5a/#148), #161 (phase-2 status table).

**Next**: merge #176 (watch first green E2E workflow run on the merge push) → E2E-05/06/07 PR (phase 3) → #159 drift test → quick wins (#164/#166/#168/#162/#175/#177) → S6c #136 → T3/T1 → S5a → S5b.

---

### Update — 2026-07-06 — E2E PHASE 3: 05/06/07 GREEN as PR #178; SIX more app fixes — multi-landlord fan-out + aval company + admin force paths were all broken

**Summary**: #176 merged; first-ever green E2E workflow run confirmed (user reviewed its log → asked to kill 2 noise sources). Built E2E-05 (FOREIGN tenant + 2 landlords IND+COMPANY + BOTH guarantors: JO IND/PROPERTY + aval COMPANY; 10 iterations), E2E-06 (COMPANY tenant + JO COMPANY/INCOME + aval single; **first-try green**), E2E-07 (admin force-complete + direct COLLECTING_INFO→ACTIVE; 2 iterations). **PR #178** → release/2.14.0 (7 commits). Full verify: e2e **7/7 journeys** (~11m), integration **385/385**, unit **309/309**, ratchet **409=baseline**.

**The six fixes** (unit+integration blind to all of them):
1. **Email disabled state** — EMAIL_PROVIDER '' fell through to resend → per-send 'RESEND_API_KEY not configured' spam. ''/'none' = disabled: ONE notice, silent no-op sends. e2e env now 'none'.
2. **Streetless upsertAddress no-op** — tenant Historial tab posts {} → prisma.propertyAddress.upsert threw (street = only required column) and callers swallowed it (fires EVERY individual-tenant flow — the CI-log "db error"). Base helpers now treat streetless payloads as nothing-to-persist. Return type AsyncResult<string|undefined>.
3. **Multi-landlord submitted-gate lockout** — portal page + getManyByToken canEdit used `.some(informationComplete)` → one landlord's submit locked ALL co-owners out ("Información Enviada", rows incomplete) → landlord gate unreachable via self-service. Fixed: `selfId` in the output (resolved by presented token), both gates self-scoped.
4. **Landlord wizard primary-scoped** — isCompany/tab-set/financial/DocumentsSection all keyed off `landlords.find(isPrimary)` → company co-owner got INDIVIDUAL doc set (company docs un-uploadable). Fixed: selfLandlord from selfId (primary/first = admin-edit fallbacks). The exact legacy-primary class CLAUDE.md bans.
5. **Aval company: missing schema-required inputs + phantom column** — (a) personal tab lacked companyRfc (RFC input bound to `rfc`!) + legalRepPosition/Rfc/Email/Phone → RHF rejected every company save on UNMOUNTED fields, zero feedback, no request fired (#160 reverse-drift, live). Added the fields (mirrors JO). (b) **Aval model has NO isCompany column** (avalType is the only discriminator) yet AvalService read `aval.isCompany` in 4 places → always undefined → every aval validated INDIVIDUAL forever (incl. MY phase-2 refs fix — built on the same phantom; tsc silent because ActorData declares isCompany). All 4 → `avalType === 'COMPANY'`; posted avalType wins over row for toDb/validation context. THE #151 case (commented there).
6. **Force-complete dialog unreachable** — MarkCompleteDialog CTAs were Radix AlertDialogActions → auto-close on click → onOpenChange wiped state BEFORE the requiresForce answer → step-2 force layout could never render from the actor card (InlineActorEditor's plain-Button variant masked it). preventDefault both steps; mutation lifecycle owns open/close.

**Found, not fixed (product)**: **collective-form save hostage** — landlord portal renders ALL cards, sibling cards' native-required address grids + multi-array schema validation block ANY landlord's save silently (requestSubmit no-op) until every card is valid. Helpers pay the hostage (fillSiblingLandlordCards + address sweep); product call = scope validation to token-holder's card. Commented on #171. Also: landlord portal array order ≠ creation order (helpers locate own card by prefilled email).

**Run-to-green lessons (new)**: read the failure SCREENSHOT (test-failed-1.png) — instantly showed filled grids + dev-overlay Issues badge; trace network entries prove "no request ever fired" (RHF invisible-field rejection signature: no messages + no server error + no request); `echo "$OUT" | grep -c` assertions on run output make log-noise cleanups self-verifying; sequential-save flows: barrier on the success toast text from formMessages ('✓ Guardado'); wrapper exit -1 ≠ suite failure (read the output: "8 passed").

**GitHub**: PR #178 open (CI watching); comments: #161 (phase-3 table: 7/8 scenarios green, only E2E-08 renewal left), #171 (lockout fixed + hostage product call), #151 (phantom-column motivating case). Session file untracked-as-usual.

**Next**: merge #178 → E2E-08 renewal (phase 4, pairs with #159 clone-drift) → #159 → quick wins (#164/#166/#168/#162/#175/#177) → S6c #136 → T3/T1 → S5a → S5b.

---

### Update — 2026-07-05 22:42 — 🏁 END-OF-DAY ENTRYPOINT: phases 2+3 done in ONE day (11 app bugs), PR #178 CI-green awaiting merge

**What a day**: 2.13.0 was shipped LAST night; TODAY the e2e net went from 2 scenarios to **7 of 8** across two PRs (#176 merged, #178 open+green), and the run-to-green loops flushed out **eleven real app bugs** — collectively proving the aval portal, ALL company-guarantor self-service, multi-landlord co-owner flows, and the actor-card force-complete had NEVER worked end-to-end. Staff force-complete was the silent crutch for all of it. Unit+integration stayed green throughout — pain #2's thesis is now beyond argument.

**Git state at close**:
- Branch `feat/e2e-scenarios-05-07` (7 commits, pushed). Last: `81690fe` (E2E-05/06/07 specs).
- **PR #178 OPEN, CI green (test 5m12s), merge-state CLEAN** → release/2.14.0. ⏳ user merge.
- PR #176 MERGED earlier today (its merge push produced the FIRST green E2E workflow run — user read its log, asked for the 2 noise cleanups that opened phase 3).
- Working tree: only session-file leftovers (`.current-session` M + this file untracked — force-add at session end).
- Task list: 10/10 phase-3 tasks completed (list state lost in a session bridge; work is in the commits).

**Verification at close**: e2e **7/7 journeys** (~11m serial: 56s/1.4m/1.8m/1.6m/2.2m/2.0m/19s + auth), integration **385/385**, unit **309/309** (was 304 — +5 aval schema tests ride S3 files), ratchet **409 = baseline** (lowered from 434 in #176).

---

#### TOMORROW — Step 0 (housekeeping)

```bash
cd /Users/neto/Development/hestia/hestia-app
git fetch origin --prune
# after user merges #178:
git checkout release/2.14.0 && git pull origin release/2.14.0
git branch -D feat/e2e-scenarios-05-07
# watch the E2E workflow run on the merge push — MUST be noise-free now:
gh run list --workflow=e2e.yml --limit 1   # expect: success, log has ONE '[email] disabled' line, ZERO RESEND/upsertAddress errors
```

If #178 is NOT merged yet: it's ready (CI green, CLEAN); HITL smoke steps are in the PR body (multi-landlord A/B portals, company co-owner doc set, aval Persona Moral full flow, actor-card Completar force step).

#### TOMORROW — the work: E2E-08 renewal (phase 4, LAST scenario) + #159

E2E-08 per #161: **renewal — clone-all-landlords + per-co-owner selection + copy-list integrity**. Pairs with **#159** (CRITICAL: clone copy-lists silently null new fields — renewal/tenantReplacement/guarantorTypeChange hand-enumerate fields; a drift test + derivation from the canonical schemas is the fix). Recommended order: write the #159 drift test FIRST (it defines what "copy-list integrity" means), then E2E-08 drives the renewal UI against it.
- Renewal pointers: per-co-owner selection UI shipped in PR #145 (LandlordSelection → array); clone service paths from PR #142 (renewal clone); the June-epic PRs #141-#145 are the map.
- Renewal flow entry: policy detail → renewal action (recon the trigger; it wasn't driven by any e2e yet).
- Expect the loop to find bugs again — renewal is exactly the "hand-enumerated copy-list" zone the audit flagged as the biggest uncovered hole.

Then the quick-win lane: **#164** isActive login gate, **#166** dep hygiene, **#168** dead tab-fields (−16 as-any), **#162** kill self-registration, **#175** null/empty family (the e2e helpers' `fillOptionalStrings`/address-guards are its regression checklist — delete workarounds as fixes land), **#177** marriage-cert product call. Then S6c #136 → T3/T1 → S5a → S5b.

#### The 11-bug ledger (for release notes / smoke awareness)

Phase 2 (#176, merged): 1) dead type toggle (tenant/JO/aval resolvers pinned to mount-time type — Persona Moral radio could never save); 2) discriminator reversion (JO service defaulted INDIVIDUAL + adapters force-wrote it on tab saves; tenant adapter same); 3) company references never counted (JO+aval completeness read personalReferences only); 4) aval tab saves 400'd (pseudo-partial master schema; avalToDb doesn't validate — tab-schema routing added); 5) aval references tab rendered zero cards (`[] || defaults` truthiness). +CI: e2e.yml DATABASE_URL at install.
Phase 3 (#178, open): 6) email disabled state (''→resend fallthrough spam); 7) streetless upsertAddress no-op (tenant Historial {} crash, swallowed — #175 evidence); 8) multi-landlord submitted-gate lockout (`.some()` in page + getManyByToken canEdit → one submit locked all co-owners out; `selfId` added to output schema); 9) landlord wizard primary-scoped (isCompany/docs/financial off legacy primary → company co-owner got individual doc set); 10) aval company tab missing 5 schema-required inputs (companyRfc bound to `rfc`, legalRep Position/Rfc/Email/Phone absent → silent unmounted-field rejection, no request fired) + **AvalService branched on phantom `aval.isCompany` — the column does NOT exist, avalType is the only discriminator** (4 reads fixed; my own phase-2 fix #3 had inherited the phantom); 11) MarkCompleteDialog CTAs were AlertDialogActions → auto-close wiped state before requiresForce arrived → actor-card force flow unreachable (preventDefault both steps).

#### Harness facts (current, for E2E-08 work)

- **Run**: docker up once (`hestia-test-db` :5433 + `hestia-test-minio` :9100 — were already healthy all day); `bun run test:e2e:provision` once per schema change; iterate with `pkill -f "next dev.*9002"; bunx playwright test --config=tests/e2e/playwright.config.ts e2e-08 2>&1` in background, NO pipes (exit code!), full output captured.
- **Helper inventory** (tests/e2e/helpers/): wizard `createPolicyViaWizard` (tenant IND/COMPANY, landlord IND/COMPANY, `coLandlords[]`, guarantor NONE/JO/AVAL/**BOTH**, tenantPercentage); portals — tenant (individual±foreign, company), landlord (individual, company — both take `{email}` to locate their card in the COLLECTIVE form + pay the sibling hostage via `fillSiblingLandlordCards`), JO (income-individual, property-individual, company×{PROPERTY,INCOME} with flip+reload dance), aval (married probe, single, company flip+reload); admin — investigations, payments seed+record+verify, `approvePolicyToActive` (PENDING_APPROVAL), `approvePolicyDirectFromCollecting` (COLLECTING_INFO green button), `forceCompleteActor` (two-step dialog); shared — `fillAllStable` (converging batch), `pickUnsetSelects` ('Seleccion' placeholder sweep), `pickOptionByName`, `fillOptionalStrings` (#175 checklist), `fillAddressNth`, `landlordIndexByEmail`.
- **Debug toolkit that cracked every wall today**: Read the failure **screenshot** (test-failed-1.png) — filled-vs-empty at a glance; **error-context.md** ARIA snapshot — which tab selected, which cards rendered, FormMessages; **trace.zip network extraction** (python over 0-trace.network + resources/<sha1>.json) — proves "request never fired" (RHF unmounted-field rejection signature: no messages + no server error + no request) vs "200 with tRPC error"; server-log greps on the captured run output; `grep -c` assertions in the run command make log cleanups self-verifying.
- **Mechanics to remember**: `tabSaved` is CLIENT-only → type-flip flows need save → '✓ Guardado' toast barrier → reload → re-save; specs are loaded at run START (mid-run edits don't apply); wrapper exit -1 ≠ failure (read "N passed"); `requestSubmit()` no-ops silently on ANY native-invalid control (sibling cards!); landlord portal card order ≠ creation order.

#### Open product calls (waiting on user/product)

1. **Collective-form save hostage** (#171 comment): scope landlord-portal validation to the token-holder's card, or keep collective + surface blocking validation. Helpers currently pay the hostage.
2. **#177 marriage certificate**: dead category; needs required-vs-optional + which tab.
3. Spouse-refine message is English ('Spouse name is required when married') in the Spanish UI — E2E-04 asserts the current string; change message + spec together.
4. GitHub plan question STILL open (branch protection 403 on free plan — from 2.13.0 ship night).

#### Numbers at close

`as any` ~96 → untouched today (e2e-first day); tsc ratchet **409**; e2e **7/8 scenarios** (E2E-08 renewal left); 13 e2e app-bug fixes total across #174/#176/#178 (3+5+6, counting CI fixes separately); issues filed today: #177; comments: #161×2, #171×2, #151, #175.

---

### Update — 2026-07-07 10:57 — 🏁 ENTRYPOINT: the 2026-07-06 marathon — 6 PRs (4 merged, 2 open), walker finds 12 app bugs, spanning set 8/8, T3 factory live

**Summary**: Biggest single day of the initiative. Shipped in order: #179 (log noise), #181 (CI core/nightly split + noise gate), #182 (#159 drift net + snapshot archives — found 2 renewal bugs), #183+#186 filed, #184 (E2E-08 renewal → **spanning set 8/8**, zero bugs — first ever), #185 (T3 ActorWizard factory, OPEN), #187 (#180 walker PR A+B, OPEN, stacked) — the walker alone caught **12 real app bugs** including two production headliners: `policy.getById` stripping 12 financial columns (admin fiscal data false/empty app-wide) and `buildUpdateData`'s company branch dropping `personalEmail` on every company-actor update.

**Git state at close**:
- Branch `feat/180-parity-walker` (T3 commit + 4 walker commits), pushed. Last: `4d73b35`.
- **Merge queue (user, IN ORDER): #185 (T3, base release/2.14.0) → #187 (walker A+B, base auto-retargets on #185 merge)**. Both CI-green-pending; e2e-core gate runs on each release push (~5-6 min, expect "clean: zero error-level server log lines").
- Working tree: session files only. release/2.14.0 now holds #176/#178/#179/#181/#182/#184 (+#185/#187 pending) — 2.14.0 ships "when we have it all" (user call).
- ⚠️ **Manual migration pending at ship**: `20260706123654_history_snapshots` (3× additive nullable JSONB on History tables).

**Verification at close**: e2e **11/11** (~15.1m full; @core ~5-6m), integration **390/390**, unit **342/342**, ratchet **409 → 407** (net −2 today, baselines committed), build green, noise **0** everywhere.

---

#### Decisions locked today (grill + answers)

1. **Same-form invariant**: portal ≡ inline admin editor; ONLY navigation differs (admin any-tab, actors sequential). Divergence = bug, fix the app.
2. **Full-field parity** via schema-driven walker; brittleness = form smell → rename/fix forms. License granted to modify forms/services.
3. **Strict staleness tests + fix the app** (#171 edit half rides walker PR C, not T3 — remount clobbers dirty state; needs per-tab `form.reset(initialData,{keepDirtyValues})` keyed on `dataUpdatedAt`).
4. **PolicyHeader refresh = TRUE full refresh, SPA-native** (`utils.invalidate()`+refetch — decided, unimplemented; rides PR C/E2E-10).
5. **CI**: two workflows; @core = E2E-01+E2E-07 on PR→main + release/hotfix pushes; nightly full on NEWEST `release/**` (fallback main) at 08:00 UTC + failure auto-files "Nightly e2e failing" issue; log-noise gate in both. **Cron activates only when e2e-nightly.yml reaches main (= ship)**; until then `gh workflow run e2e-nightly.yml`.
6. **Seed-ACTIVE convention STANDING**: DB-seed pre-existing policy state instead of re-driving creation (helpers/seed.ts documents it).
7. Admin/portal fields identical — NO admin-only exceptions.
8. Suite growth unbounded → nightly absorbs; @core stays lean.
9. Guarantor archive: full-fidelity snapshots (folded into #159 ✓ shipped); deleteCoOwner hard-delete OK but MUST log activity event → **#183**.
10. DOM component-test stack → **#186** (recommend status quo until the reset hook needs it).
11. Branch protection: **403 — GitHub free plan** (standing plan question); nothing blocks merges (old check name vanished with rename); mark `E2E core / e2e-core` required when plan changes.
12. Product calls stay BATCHED for one session (list below).

#### The day's PR/issue ledger

| Item | State | Content |
|---|---|---|
| PR #179 | MERGED | executeTransaction: 4xx ServiceErrors → silent info; log() flattens Errors, dup bare line dropped |
| PR #181 | MERGED | e2e-core.yml + e2e-nightly.yml + log-noise gate both; concurrency-cancel; nightly ref-pick `sort -V` + issue alert; gate dogfooded both directions |
| PR #182 | MERGED | #159 stage 1: driftHelpers (fillAllColumns via information_schema + pg_enum, compareRows, phantomExclusions), policyCloneDrift roundtrips (renewal all-entities marker roundtrip, replacement snapshot+LEAK check, guarantor-change), copyLists.ts TENANT_REPLACEMENT_RESET + unit drift test, actorArchive.ts shared helper + `snapshot Json` on 3 History tables (tokens redacted). **Found+fixed: renewal dropped landlord.nationality (FOREIGN→MEXICAN) + blanked landlord.address** |
| #183 | FILED | deleteCoOwner zero audit trail (info-log is silent no-op, no PolicyActivity); minimal fix = 'landlord_removed' event; isPrimary guard flagged |
| PR #184 | MERGED | E2E-08 renewal → **8/8 spanning set**. seed.ts (2 landlords + tenant COMPLETE + 10 real MinIO docs + APPROVED investigation), completeActorStrict (no-force = clone-integrity proof), real S3 copyObject first exercise ("10 documentos copiados" toast-asserted), per-co-owner CFDI toggle, renewedToId + archival asserts, direct ACTIVE. **Zero app bugs — first phase ever** (the #182 net de-risked it). E2E-05 flake noted (aval company-flip reload race; CI retries:1 covers) |
| PR #185 | **OPEN** | T3 #127: ActorWizard + 4 configs (tenant/JO/aval share useActorUpdateSave; landlord config: 3-mutation dispatch + deleteCoOwner + selfId scoping, primary/first only admin fallbacks); 5 call sites rewired (InlineActorEditor switch → config map); 4 wizards + dead LandlordBankInfoTab-RHF deleted; wizard layer net **−480 LOC**; 25 unit tests (gating matrix, config↔tab drift, selfId chain, docs payloads); e2e 9/9 FIRST RUN. Deviations in PR body: no DOM stack (→#186), FormDefaults→#180, reset→walker phase |
| #186 | FILED | DOM test stack decision: (a) happy-dom+RTL, (b) status quo (RECOMMENDED), (c) Playwright CT; revisit when reset hook lands |
| PR #187 | **OPEN** (stacked on #185) | #180 walker PR A+B, retitled "all four actors × both variants" |

#### The walker (#187) — what exists now

- **Enabler**: `FormControl` stamps `data-field={RHF name}` on EVERY control (one line, ui/form.tsx) — fields addressable by canonical schema key on both surfaces.
- **Engine** (`tests/e2e/helpers/walker.ts`): `walksFor(variant)` registry (all 4 actors × INDIVIDUAL/COMPANY); tab schemas from the domain layer; value gen per Zod type with format-valid overrides (RFC-13/companyRfc-12/CURP-18/CLABE-18/phone-10/postal-5, `ENUM_PICK_FIRST` for nationality to avoid variant flips, enums pick LAST otherwise); control driver (input/textarea/combobox/radiogroup/checkbox/date + address COMPOSITES via grid ids scoped inside the data-field root); landlord via `landlords.0.*` prefix (SINGLE-landlord policies; multi blocked on #171 hostage); COMPANY variants DB-seeded (`flipActorsToCompany`); transit tabs (landlord property-info: grid-0-if-empty + 2 date fields that reject empty strings); `uploadWalkerDoc` for save-gated tabs (JO income proof; company-aval property deed+tax attempted); `allowedSkip` contract — every skip carries a documented reason.
- **Driver hardening**: verify-after-click on checkboxes/radios (optimistic values = phantom drift); toastless-save diagnostics (aria-invalid fields + FormMessage dump); barrier model = NEXT tab's first-field wait (lingering toasts false-pass), terminal saves use fresh-toast barrier.
- **Spec** `e2e-09-parity-walker.spec.ts`: E2E-09a (individual ×4 actors) + E2E-09b (company ×4) — fill EVERY schema field via portal → read back field-by-field in InlineActorEditor (~230 fields/run).

#### Walker findings ledger (12 real bugs fixed + flags)

PR A fixed: (1) tenant `workEmail` unrendered; (2) JO `workEmail` unrendered; (3) aval `personalEmail`+`workEmail` unrendered; (4) **AddressAutocomplete swallowed ALL Slot-forwarded props** (id/aria-describedby/aria-invalid/data-field → broken label association + error announcement for EVERY address field app-wide); (5) **aval `nationality` free-text Input vs MEXICAN|FOREIGN enum** ("Nacionalidad inválida" for any human answer) → radios.
PR B fixed: (6) **`policy.getById` stripped 12 columns** (PolicyTopLevelShape lacked hasIVA, issuesTaxReceipts, securityDeposit, maintenanceFee, maintenanceIncludedInRent, rentIncreasePercentage, paymentMethod, tenantPaymentMethod, tenantRequiresCFDI, tenantCFDIData, contractStartDate, contractEndDate — #174 class at policy top level; admin fiscal data was false/empty app-wide); (7) **buildUpdateData company branch dropped `personalEmail`** on every company-actor update (DB-verified: workEmail persisted, personalEmail NULL; CompanyActorData type gained the field; the #171/#152 residue LIVE); (8) landlord individual card `workEmail`; (9) landlord company card `personalEmail`; (10) tenant company `legalRepId` (real column). Plus #182's (11) nationality + (12) address on renewal.
**Self-correction recorded**: JO/aval `legalRepId` inputs were added then REVERTED — their MODELS have no such column (#150 family); rendering an input that silently discards is worse than absent → allowedSkip with reason.
**Documented flags (not coded)**: landlord company legacy `address` schema-REQUIRED yet rendered nowhere and saves pass (schema/resolver drift → #160 sweep); `landlordFinancialInfoTabSchema` surplus ×5 (cfdiData, monthlyIncome, hasAdditionalIncome, additionalIncomeSource/Amount — no tab renders them); additional-contact block gated on legacy `isPrimary` (co-owners can't fill extended contact); **company-aval property save TOASTLESS under walker** (resolver clean, aria-invalid empty, no request; E2E-06's flip+RELOAD path saves it — suspect stale pre-walk row literals on unmounted fields; TODO in registry, open investigation).

#### Run-to-green lessons (new, hard-won)

- **Assert messages MUST name the actor** — three "identical" workEmail failures were three DIFFERENT actors; I chased stale-server/Turbopack-cache ghosts for 3 runs before the ARIA snapshot heading ("Bienvenido, Obligado Solidario") exposed the misread.
- **NEVER `bun run build` while the e2e dev server lives — they share `.next`** (all 9 specs ENOENT'd on app-build-manifest mid-run).
- `reuseExistingServer:true` + orphaned playwright (a stray `&` inside a run_in_background command) = stale server serving pre-edit code; kill via `lsof -ti :9002 | xargs kill -9` before every run.
- DB truth beats theorizing: `docker exec hestia-test-db psql -U test -d hestia_e2e_test -c ...` on the LAST run's leftover state pinpointed personalEmail NULL-while-workEmail-persisted in one query.
- Offline zod parse (`bun -e` importing domain schemas) kills resolver theories in seconds.
- Trace console extraction (python over trace.zip .trace lines, type=console) surfaces client-only errors; dev-overlay "N Issues" ≠ necessarily the blocker (hydration + setState-in-render warnings were red herrings).
- Toast text barriers false-pass on lingering toasts across consecutive saves — sync on the next tab's first field instead (matches the proven helpers' bare-click `save()`).
- Timebox carve-outs beat heroics: company-aval property mystery got a documented TODO + E2E-06 coverage note instead of a 5-run rabbit hole.

#### NEXT STEPS (priority order, detailed)

**Step 0 (user)**: merge **#185 → #187** in order; watch e2e-core on each release push (gate line "clean: zero error-level server log lines").

**1. #180 PR C** (next work block):
   - Reverse direction: admin inline edit (probe per tab, distinctive value) → portal reload → assert; reuse walker reader on the portal side.
   - Deletes: admin deletes a personal reference + a document → portal + DB reflect; decide S3-object semantics against #172's hygiene family.
   - **Reset-on-refetch (#171 edit half)**: `useWizardDataReset(form)` hook exported from ActorWizard (form.reset(initialData,{keepDirtyValues:true}) keyed on dataUpdatedAt) + ~20 per-tab one-line adoptions; then E2E-10 staleness choreography: two browser contexts, admin page HELD OPEN, portal saves, three RefreshCw buttons asserted (PolicyHeader→FULL refresh SPA-native — implement `utils.invalidate()`, today it's policy-only; actor-tab; payments), stale-open editor shows fresh values.
   - Root-cause the company-aval toastless save (lead: RHF onInvalid dev hook, or walker reload-after-personal-save mirroring E2E-06).
**2. Product-calls batch session (user wants ONE session)**: #171 collective-form hostage (unblocks multi-landlord walk) · #177 marriage cert · E2E-04's English spouse message · #150 JO/aval missing fields (walker's legalRepId evidence attached) · landlord financial surplus ×5 (real requirements or schema trim?) · landlord company legacy `address` (render or drop from schema) · isPrimary-gated additional contact (co-owner parity).
**3. Quick wins**: #166 dep hygiene (Next 15.5.20 SECURITY bump — cheapest first) · #164 isActive login gate · #165 token TTL+cancellation (ship WITH its cancellation e2e spec) · #183 deleteCoOwner activity event · #168 dead tab-fields (−16 as-any) · #162 kill self-registration · #175 null/empty family (walker/helpers workarounds = regression checklist).
**4. Then**: doc reject→re-upload spec · S6c #136 · #159 stage 2 + #148 + #152 ride **S5a #133** (walker gave all three fresh evidence) · T1 #125/T2 #126/T4 #128/T5 #137 · **2.14.0 ship** (runbook: merge→deploy→MANUAL migration `20260706123654_history_snapshots`→tag; post-ship: dispatch e2e-nightly once to validate, cron self-activates, branch protection when plan allows).

#### Numbers at close

Ratchet **407** (409→408 T3, 408→407 walker; two baseline commits). Wizard layer **−480 LOC** net (1,265 deleted). e2e suite **11 tests / ~15m full / @core ~5-6m**; walker walks **~230 fields/run**; suite runtime unbounded by decision (nightly). Walker bug tally: **12** (all invisible to unit+integration+journey specs). Issues filed today: #183, #186. Issues commented: #159×2, #161×2, #171×2, #127, #180×2. Session file untracked-as-usual — force-add at session end.

---

### Update — 2026-07-07 12:36 — ⚠️ #187 MIS-MERGE caught + re-landed as #188; GRILL SESSION: multi-tenant (#169) semantics locked, product-call batch resolved, roadmap re-cut

**Mis-merge (the day's operational find)**: #185 merged fine (release/2.14.0, Tests+E2E-core green on push `54437ed`). **#187 merged into `feat/t3-actor-wizard-factory`** — GitHub only auto-retargets stacked PRs when the base branch is DELETED; T3's branch survived, so the walker commits never reached the release and **zero CI ran** (PR-to-feature-branch matches no workflow trigger). Re-landed as **PR #188** (`feat/180-parity-walker` → release/2.14.0, same 6 commits, diff walker-only). **Process guard: delete head branches at merge, or merge stacked PRs only after the child's base auto-flips.** USER: merge #188 when Tests is green, watch E2E-core on the release push.

**Grill session (the product-calls batch the plan wanted — held via AskUserQuestion, all decisions user-confirmed):**

- **Ship gate**: 2.14.0 ships **after walker PR C** (+ two tiny riders below). Multi-tenant = 2.15.0 arc.
- **S5a shape (#133 comment posted)**: canonical `policySchema` models `tenants: z.array(tenantSchema)` from day one; DB keeps `@unique` until S5b (adapter wraps `row ? [row] : []`). ONE consumer sweep (~89 refs / 40 files, re-measured).
- **Multi-tenant #169 (full ledger posted on the issue)**: no primary/payer EVER · gate = ALL tenants complete-or-forced (`checkPolicyActorsComplete` + workflowService:57 loop) · every tenant gets own link · payments = ONE undivided obligation, same link to all, first-pay-wins, `tenantPercentage` + CFDI columns STAY policy-level (forced by single payment) · receipts stay policy-scoped, any tenant satisfies, cron nags all · one investigation per tenant (mechanics already per-actor) · carátula lists all co-arrendatarios · wizard 1..N, admin add/remove pre-ACTIVE only, ≥1 enforced, ACTIVE→`replaceTenant(tenantId)` only, removal = snapshot + activity event (#183 lesson) · migration drops `@unique` = MANUAL prod step · new nightly e2e spec + walker `tenants.N`; @core unchanged.
- **#189 FILED — landlord portal de-collectivization** (resolves the #161-parked collective-form hostage): per-record forms, admin-only co-owner add/remove; riders: un-gate isPrimary additional-contact, drop landlord COMPANY legacy `address`, trim financial surplus ×5. Unblocks multi-landlord walker walk. Early 2.15.0, sets the pattern S5b follows.
- **#150**: ADD parity fields (JO DOB/ID + company gaps; aval half rides #151). **#177**: conditional MARRIAGE_CERTIFICATE slot, optional until legal rules (comments posted).
- **Security timing**: **#166 (Next SECURITY bump) + #164 (isActive gate) ride 2.14.0** pre-ship; #162 + #165(+its cancellation spec) open 2.15.0; #163 after test-bypass design.

**Roadmap as re-cut**: merge #188 → **walker PR C** (reverse walk, deletes, reset-on-refetch hook = #171 edit half, E2E-10 staleness + PolicyHeader true refresh, aval-toastless RC) → **#166+#164** → **SHIP 2.14.0** (runbook: deploy → MANUAL `20260706123654_history_snapshots` → tag → dispatch e2e-nightly once, cron self-activates) → 2.15.0: #189 → #162/#165+spec/#163 → #150(+#151) + #177 + doc-reupload spec → **S5a #133** → **S5b #169** → rest of S/T-track.

**E2E finish line quantified**: ~85% — spanning 8/8 + walker 09a/b done; left = PR C + doc-reupload spec + cancellation spec (rides #165); parked riders: receipt portal (S6c), Stripe webhook journey, multi-landlord walk (#189 unblocks), multi-tenant spec (S5b).

**Unresolved (carried)**: legal call on #177 required-ness · branch protection blocked on GitHub plan · company-aval toastless save (PR C investigates) · % comisión + Descuento definitions (CSV) · co-arrendatario signing ops (legal, non-blocking) · E2E-05 flake (harden if recurs).

**GitHub writes this session**: PR #188; issue #189; comments on #169 (ledger), #133 (S5a shape), #150, #177, #161.

---

### Update — 2026-07-07 12:50 — Five rulings landed; #188 CI-green awaiting merge

**#188 status**: `Tests` SUCCESS, mergeState CLEAN — **USER: merge it** (then watch E2E-core on the release push).

**Rulings (user, this session) + where they landed:**
1. **#177 marriage cert: OPTIONAL, final** — conditional slot renders, never gates completion; "pending legal" caveat closed (comment on #177).
2. **GitHub plan**: still free; **user checking the upgrade THIS WEEK** → on upgrade: enable branch protection, mark `E2E core / e2e-core` required on main + release pushes (standing decision #11 from 07-06).
3. **% comisión + Descuento: NOT NEEDED** — no issue existed; README section now records the ruling as reference-only → **PR #191** (docs-only, base release/2.14.0, via scratch worktree — walker checkout untouched).
4. **All tenants SIGN** → #169 addendum comment: policy PDF (`src/lib/pdf/policyDataTransformer.ts`), carátula (`getPolicyForCover.ts:76,118` — `CoverTenant` goes plural), investigation views, and any tenant-identity surface iterate the collection + per-tenant signature blocks.
5. **Company-aval toastless save: issue FILED → #190** (bug) — full evidence from walker.ts:298-303 TODO + the 3 leads; root-cause rides walker PR C; if the reload-mirror lead confirms, fix folds into `useWizardDataReset`.

**Merge queue for user**: #188 (walker re-land) → #191 (docs, trivial). Then PR C work block starts.

---

### Update — 2026-07-07 21:15 — 🏁 WALKER PR C SHIPPED AS #192: #171 edit half + #190 root-caused + E2E-09c/09d/10; suite 13 scenarios, all green

**Done in one block** (#188 merged by user at 12:48, then this): **PR #192** open → release/2.14.0, 6 commits, all-green verification: **e2e 14/14 (19.5m full suite)**, unit **348** (+6), integration **390**, ratchet **407==baseline**.

**App fixes (the #192 payload):**
1. **`useWizardDataReset`** (`src/components/actor/shared/`) adopted by ALL 15 tab forms + context provider in ActorWizard + `dataUpdatedAt` threaded from 5 mount points. reset(fresh, keepDirtyValues) keyed on the query's dataUpdatedAt, **and never while ANY field is dirty** — the first full-suite run caught reset clobbering a mid-typing references card (E2E-02 red): **keepDirtyValues does NOT protect useFieldArray items**. Hard-won rule.
2. **Invisible-error toast** (same hook): submit errors on fields with no rendered control (the #190 class) now toast the field names. #190 ROOT CAUSE: stale pre-walk row values in defaultValues failing hidden-field validation → silent death. Company-aval property walk RE-ENABLED, 09b green.
3. **InlineActorEditor `refetchOnMount:'always'`** — the app QueryClient runs staleTime 5min + no focus refetch; reopened editors served pure cache. THIS was the stale-open mechanism. (Editor remounts per open — `{editingActor && <InlineActorEditor/>}` — so refetchOnMount fires.)
4. **PolicyHeader full refresh** = `utils.invalidate()` (new handleFullRefresh; section buttons keep scopes + gained aria-labels "Actualizar <título>").
5. **Scoped wizard save** (contentRef.querySelector, was document-first-form — dialog portals to body-end, page forms could hijack admin saves) + landlord `landlords[0]=[...]` array-as-element bug + JO references optional-chain crash.

**New specs:** E2E-09c reverse (admin probe/tab → portal, INDIVIDUAL; probe prefs /email$/→text whitelist; save barrier = auto-advance unmounts probe field), E2E-09d deletes (4 seeded refs → admin deletes 1 + doc → portal/DB/**S3** all assert; **native window.confirm on doc delete — Playwright dismisses by default, spec registers dialog handler**), E2E-10 staleness (two contexts, mounted-view discipline: staleTime means mounted views NEVER self-heal — choreograph asserts against MOUNTED sections only; 'Pendiente'/'Completado' exact-text counts; X-button closes — **Escape after save auto-advance is unreliable**).
**Run-to-green lessons added:** trace-driven diagnosis (network events → "no request ever fired" beats theorizing); `| tail` eats exit codes — write log + explicit EXIT; spec files load per-worker (mid-run edits can apply); paidAt not paidDate.

**GitHub:** PR #192; completion comments on #171/#180/#190 (all "close on merge") + #161 queue update (13 scenarios; left: doc-reupload spec, cancellation w/#165, receipt w/#136, multi-landlord w/#189, multi-tenant w/#169).

**NEXT:** user merges #191 + #192 (watch E2E-core gate) → **#166+#164 ride 2.14.0** → SHIP (runbook + manual migration `20260706123654_history_snapshots`) → 2.15.0 opens with #189 → security batch → #150/#177 → S5a #133 (tenants-array shape per 07-07 grill) → S5b #169.

---

### Update — 2026-07-08 00:05 — 🚢 2.14.0 SHIP TRAIN ASSEMBLED: #193 (isActive) + #194 (deps) + #195 (RELEASE PR)

#191+#192 merged by user; release CI green on `4d50bdc` (E2E-core + Tests). Then the two grill-decided riders, both built + verified this block:

**PR #193 — #164 isActive gate** (CI green, CLEAN, mergeable): both login paths reject inactive accounts with the GENERIC 401; `jwt` callback re-validates isActive+role vs DB max every 5 min (`SESSION_REVALIDATE_MS`, exported) — deactivation kills sessions in minutes (session callback returns null for flagged tokens), role changes propagate, reactivation self-heals. 8 integration tests — incl. an active-credentials CONTROL that caught a vacuous pass: **next-auth v4 provider objects carry a default no-op `authorize` at top level; the real one is `provider.options.authorize`**. Integration 398, ratchet 407.

**PR #194 — #166 dep hygiene** (@core-validated): next 15.5.9→**15.5.20** (18 advisories, 9 high), postcss 8.5.16; removed re-verified-dead: patch-package, react-dropzone, @vercel/speed-insights, **dotenv** (scripts use dotenv-cli's binary!), @google-cloud/storage, @tanstack/react-query-devtools, @types/lodash; @types/nodemailer → devDeps; **lodash phantom killed** (AddressAutocomplete → repo's own debounce in optimisticUpdates.ts — drop-in, no .cancel). Audit **108→83 (37→24 high), direct-dep highs 0** ✓. Verified: build on 15.5.20, unit 348, integration 390, e2e @core 3/3, ratchet 407.

**PR #195 — RELEASE 2.14.0 → main**: full runbook checklist in body (merge=deploy → MANUAL `20260706123654_history_snapshots` → tag v2.14.0 → `gh workflow run e2e-nightly.yml` once, cron self-activates → smoke → close #171/#180/#190/#164/#166; branch protection when plan upgrades). Single migration confirmed via git diff (3× additive nullable JSONB).

**USER MERGE ORDER: #193 → #194 (watch E2E-core on each release push) → #195 (=DEPLOY) → runbook steps 2-6.**

---

### Update — 2026-07-08 03:40 — 🚢 2.14.0 LIVE IN PROD; 2.15.0 OPEN; #189 DE-COLLECTIVIZATION SHIPPED AS PR #196

**2.14.0 SHIPPED**: user merged the full train (#193→#194→#195, verified on main: `b9dd151`); prod deployment SUCCESS 04:37Z. Ship housekeeping done by me: **tag v2.14.0 pushed**, **e2e-nightly dispatched** (run 28918330790; cron self-activates), #180+#190 closed (#164/#166/#171 auto-closed via commit keywords on main). ⚠️ **MANUAL MIGRATION `20260706123654_history_snapshots` surfaced to user as DUE** (deploy live) — VERIFY IT RAN.

**`release/2.15.0` cut from main + pushed.** The multi-tenant release arc runs: #189 ✓(PR #196) → security batch #162/#165+spec/#163 → #150(+#151)/#177/doc-reupload → **S5a #133** (tenants-array canonical shape) → **S5b #169**.

**PR #196 (#189 + #183)**: the collective landlord form is DEAD.
- Single-record LandlordOwnerInfoTab (plain names, resolver-follows-isCompany, reset hook); portal token → own row only (flat actor.update — the financial tab's existing path); admin editor per landlord card (getById; listByPolicy branch gone); creation wizard's multi-landlord step untouched (staff enters N at once).
- **Admin-only co-owner add/remove**: `actor.addCoOwner` (empty row; email/phone/address are legacy-REQUIRED columns → '' placeholders; co-owner fills own record via own link) + confirm-dialog removal; **both log PolicyActivity** (landlord_added/landlord_removed) = #183 closed.
- **Schema riders per grill rulings**: company legacy `address` OUT of tab schema (was required-yet-unrendered — strict completeness demanded an unfillable field, REAL BUG); financial tab → 3 rendered toggles only; dormant columns moved to the api drift-test's prismaBaseFields allowlist; dead dormant-column writers deleted from buildUpdateData.
- **E2E**: helpers rewritten (hostage workarounds fillSiblingLandlordCards/landlordIndexByEmail DELETED); walker un-prefixed; **E2E-09e** multi-landlord isolation (2 tokens, distinct values, DB-asserted zero bleed, per-card editors, add/remove + activity asserts) — GREEN FIRST RUN.
- Verified: e2e **15/15 (19.7m)**, integration **404** (+6), unit 348, ratchet **407→399 baseline updated**.

**Gotchas recorded**: executeDbOperation swallows typed ServiceErrors (guards go OUTSIDE the wrapper); Landlord model has legacy-REQUIRED email/phone/address columns; next-auth v4 provider top-level `authorize` is a no-op default (`options.authorize` is real — caught by an anti-vacuous control test in #164's suite); post-delete transient `Arrendador not found` listDocuments 4xxs are expected-noise class.

**NEXT**: user merges #196 (watch Tests + E2E-core on release/2.15.0 push) → security batch (#162 kill self-registration; #165 token TTL+cancellation WITH its e2e spec; #163 Turnstile after bypass design) → #150(+#151)+#177 → S5a → S5b. Standing: branch protection when plan upgrades; verify prod migration ran.

---

### Update — 2026-07-08 07:20 — SECURITY BATCH + FEATURE PAIR SHIPPED: 4 PRs (#197 #198 #199 #200); Turnstile parked LAST by user call

**User calls this block**: Turnstile #163 → the VERY END (after all features); #196 merged (user).

**PR #197 (#162)**: /register + RegisterForm DELETED; /api/auth/register = **410 tombstone** (tested: 410 + zero user rows); brokers join invite-only (staff.create already accepts BROKER — verified, nothing to extend); no UI ever linked /register.

**PR #198 (#165)**: TOKEN_CONFIG.EXPIRATION_DAYS **1000→180**; `cancelPolicy` nulls accessToken/tokenExpiry for tenant+ALL landlords+JOs+avals in one tx (receipt portal dies with the tenant token); shareLinks only READS tokens (no resurrection). Integration: token-death w/ live-before control + 179-181d TTL window. **E2E-11 NEW** (real-UI cancel → 4 portals dead, zero form surface) — green 46s first run. Known-noise: dead-token getByToken logs generic "Database error" ❌ (executeDbOperation wrap, #179 class).

**PR #199 (#177)**: OPTIONAL Acta de Matrimonio DocumentManagerCard in BOTH spouse sections (aval property + JO property branch, married_* condition); never gates; requirements config untouched. E2E-04 uploads + asserts actorDocument COMPLETE — green 1.7m.

**PR #200 (#150-lite)**: `legalRepId String?` on JointObligor+Aval (migration `20260708120000_jo_aval_legal_rep_id`, additive, MANUAL prod); CompanyActorData + base buildUpdateData (one edit covers both); both company personal tabs render it; walker allowedSkips removed → **09b round-trips it (green 1.8m)**. **#159 drift net CAUGHT the column being dropped by renewal's hand-enumerated JO/aval blocks mid-PR** (tenant's block had it) — two lines added, roundtrips green. SCOPE CORRECTION posted on #150: DOB/gov-ID is NOT tenant parity (NO actor has those columns; CURP encodes DOB; ID = IDENTIFICATION upload) — new capability needs its own product call. #151 refactor NOT ridden (features-first call).

**Verification per PR**: ratchet 399 stable; unit 350; integration 405; targeted e2e green each (E2E-11 46s, E2E-04 1.7m, 09b 1.8m). Zero file overlap across the four PRs — merge in any order.

**⚠️ Migration riding 2.15.0 so far**: `20260708120000_jo_aval_legal_rep_id` (2× additive nullable TEXT).

**NEXT**: user merges #197→#200 (watch E2E-core per push) → doc-reupload spec (test-only, safe anytime) → **S5a #133** (starts after #200 merges — renewal.ts conflict avoidance) → S5b #169 → remaining → **#163 Turnstile LAST**. Standing: verify 2.14.0 prod migration ran; branch protection on plan upgrade.

### Update — 2026-07-08 (late) — 🎯 STARTING POINT: S5b FULL WORK BREAKDOWN + NEW SHIP RULING

**NEW RULING (user)**: **2.15.0 SHIPS TO PROD immediately after S5b multi-tenant.** Everything else previously queued for 2.15.0 slides to 2.16.0 — **Turnstile #163 goes in 2.16.0** (the release AFTER), alongside #201 doc-review, #151, #148, #152, #160, S6c #136, T-track (#125/#126/#128/#137), #168, #175, #172, wizard-shim import migration.

**Git state**: branch `feat/133-s5a-phase-c` @ d4e85eb, tree clean (session files only). **Open PR: #203 (S5a Phase C) — CI pending, user merges.** Tasks: all 19 tracked tasks completed through S5a.

**⚠️ STANDING (unconfirmed)**: 2.14.0 prod migration `20260706123654_history_snapshots` — VERIFY IT RAN. Branch protection on plan upgrade. 2.15.0 migrations accumulating for ship: `20260708120000_jo_aval_legal_rep_id` + S5b's 1:N (below).

---

#### S5b #169 — THE COMPLETE WORK BREAKDOWN (next session starts here, after #203 merges)

**A. Migration + relation flip** (the load-bearing change)
1. Prisma: `Policy.tenant Tenant?` → `tenants Tenant[]`; drop `Tenant.policyId @unique` → `@@index([policyId])`. Migration authored by hand (`*_tenant_one_to_many`: DROP unique index, CREATE plain index) — MANUAL on prod at ship.
2. **The Prisma client key `tenant` DIES app-wide** → every `include/select/create` site flips. Centralization pays off: `policySelect`/`policySelectList` (ONE place), `policyRowToAggregate` INVERTS (native `tenants` passthrough; legacy wire `tenant = tenants[0] ?? null` until the sweep completes — semantic caveat: legacy consumers see "first", acceptable only during transition).
3. Non-centralized `tenant:` prisma sites to flip (grep `tenant:` + `prisma.tenant` + `.tenant?.`): createPolicy nested create → `tenants: { create: [...] }` · renewal.ts tenant clone block → loop (the #159 drift net WILL catch misses — proven twice) · tenantReplacement.ts · policyWorkflowService selects (:46 gate include, :180, :239 ACTIVE-notification, :360) · actorTokenService.checkPolicyActorsComplete + generatePolicyActorTokens · getPolicyForCover (CoverTenant → plural) · reports CSV route · cron routes (incomplete-actors-reminder, receipt-reminder, expiry, quarterly) · getPolicies search WHERE `tenant:{...}` → `tenants:{some:{...}}` · shareLinks.ts tenant block → loop · docx coverPageTransformer + pdf policyDataTransformer (ALL co-arrendatarios + per-tenant signature blocks per 2026-07-07 ruling) · tests: factories/scenarios/seed.ts.

**B. New capabilities** (grill ledger on #169 is the spec)
4. Admin add/remove tenant PRE-ACTIVE, mirroring the #189 landlord pattern EXACTLY: `actor.addTenant({policyId})` (empty row, ≥1 not needed on add, ≤? no cap ruled — no hard max) + `actor.deleteTenant({id})` (≥1 enforced; **tenantHistory snapshot via actorArchive helper + tenant_removed activity**; add → tenant_added + link sendable). TenantTab UI → per-tenant cards + Agregar/Eliminar (copy LandlordTab #189 verbatim pattern).
5. `policy.replaceTenant` gains `tenantId` param (UI picks which tenant on the modal).
6. Wizard TenantStep → 1..N (LandlordsStep pattern, "Agregar co-inquilino").
7. Gates plural: checkPolicyActorsComplete iterates tenants (ALL complete-or-forced); checkAllInvestigationsApproved tenants loop; **canonical policySchema ALREADY encodes this** (allTenantsComplete refinement, S5a).
8. Payments: generatePaymentLinks emails the SAME link to ALL tenants; drop `customer_email` prefill when N>1 (paymentService.ts:268/278/633). tenantPercentage + CFDI columns STAY policy-level (ruled).
9. Receipts: policy-scoped stays; reminder cron nags ALL tenants until month satisfied.
10. Renewal selection schema: `tenant` single → `tenants[]` per-tenant include selection (mirror landlords).

**C. Wire + sweep**
11. Components off legacy `policy.tenant` → `tenants` (TenantTab, OverviewTab, cards, ReplaceTenantModal, PaymentsTab labels, dashboard/CSV display "Tenant A (+N)"); then REMOVE the legacy `tenant` key from outputs (same PR as the sweep — the transition contract ends).
12. Integration: multi-tenant scenarios/factory variants; addTenant/deleteTenant tests (mirror #189's six); gate tests (2 tenants, one incomplete → blocked; forced → passes); replaceTenant(tenantId).

**D. E2E**
13. Walker: multi-tenant isolation test (E2E-09f, mirror 09e: 2 tenant tokens, distinct values, zero bleed, per-card admin editors, admin add/remove + activity asserts).
14. E2E-13 multi-tenant journey: wizard 2 tenants → both links valid → gate blocks until 2nd complete/forced → 2 investigations → shared payment link → carátula lists both → ACTIVE.
15. Helpers: wizard.ts coTenants support; portals unchanged (per-record already); seed.ts multi-tenant fixture.

**E. SHIP 2.15.0** (immediately after S5b merges + full suite green)
16. Release PR → main (=deploy) → **MANUAL migrations: jo_aval_legal_rep_id + tenant_one_to_many** → tag v2.15.0 → dispatch nightly once → smoke (multi-tenant policy end-to-end in prod) → close #169/#133/#189/#150/#162/#165/#177/#201-filed-not-closed.
17. Then 2.16.0 opens: **Turnstile #163** + the deferred list above.

**Estimate**: S5b ≈ 2-3 work blocks (A+B one block, C+D one block, ship prep half). The S5a groundwork (plural aggregate + gates encoded + centralized selects + #189 pattern) has pre-paid the hard parts.

Train #197-#200 + #202 all merged by user. **PR #203 completes S5a**:
- `policyRowToAggregate` (adapters/db.ts): EVERY policy read (getPolicyById/getPolicies/createPolicy) returns **plural `tenants`** + legacy singular `tenant` as the explicit transition contract (components flip in S5b; iterate, never index).
- adapters/api.ts: wire core shape, **bidirectional drift test** vs canonical (#174 strip class now test-caught in BOTH directions); output.ts's 42-field hand-mirror DELETED (PolicyTopLevelShape = the adapter shape); getById/list/create outputs gain `tenants` arrays.
- adapters/form.ts: wizard schema relocated (old path = @deprecated shim; 6 step components migrate later).
- getPolicyById/getPolicies → centralized policySelect/policySelectList (verbatim; list tier keeps its take-10 activities — caught during the swap); renewal + guarantorTypeChange adopt the precondition GUARDS (messages preserved; no test coupling — verified).
- Deferred deliberately: full write-path toDb → S5b (tenant-collection writes make it load-bearing); nested actor passthroughs → #148.
- Verified: **integration 405/405 (the contract net blessed the whole swap)**, unit 375 (+8), domain 25/25, ratchet 371, e2e 01+07+**08** (renewal guard exercised) 4/4 in 2.1m.
- Gotcha caught mid-run: `--grep @core` + explicit spec files FILTERS the untagged files out — killed and reran as plain file selection.

**NEXT**: user merges #203 → **S5b #169 BUILD BEGINS** (migration drop-@unique + wizard/portal/admin UI for N tenants + payment-link fan-out + reminder crons + carátula/PDF plural + component sweep tenant→tenants + walker `tenants.N` + multi-tenant e2e spec) → then #201 doc-review, #151, #148, remaining track → **#163 Turnstile LAST**. Standing: 2.14.0 prod migration verify; 2.15.0 migrations so far: jo_aval_legal_rep_id.

---

### Update — 2026-07-08 09:40 — E2E-12 UNBUILDABLE (feature never existed) → #201 FILED; S5a PHASE A+B SHIPPED AS PR #202

**Doc reject→re-upload finding**: ActorDocument's verifiedAt/verifiedBy/rejectionReason are DEAD COLUMNS — no writer (the investigation router's rejection writes are actorInvestigation-level), no UI on either surface. The #161 queue item presumed a machine that was never built. User ruling: file + proceed to S5a → **#201 filed** (minimal design + 3 product decisions: rejected-blocks-completeness?, re-upload-replaces?, notify?) — slots after S5b, before Turnstile.

**PR #202 — S5a Phase A+B** (#133): `src/lib/domain/policy/{schema,select}.ts` + 19 tests.
- policySchema = discriminatedUnion(status) w/ per-state reqs (ACTIVE/EXPIRED→activation dates; CANCELLED→cancelledAt+reason) + refinements (percentages sum 100; guarantors-match-type post-collection; **ALL-tenants-complete to advance** — S5b's gate encoded NOW).
- **tenants: array day one** (grill ruling; DB 1:1 until S5b; Phase-C adapter wraps row).
- **DESIGN DEVIATION (argued on #133)**: aggregate composes actor LIFECYCLE REFS (id/discriminator/informationComplete/verification), NOT full canonical actor schemas — completes reject real mid-collection rows; zod3 has no deep-partial over discriminatedUnions; refs = exactly what the gates read.
- Preconditions as parseable guards: renewal (ACTIVE|EXPIRED + ≥1 landlord; overwrite OK), guarantorTypeChange (pre-activation).
- policySelect (getPolicyById verbatim) + policySelectList (getPolicies) `satisfies Prisma.PolicyInclude` + payload types.
- Drift test: every core scalar ⊆ Prisma.PolicyScalarFieldEnum.
- **Phase C (adapters + 10 policyService files + router outputs) WAITS for the #197-#200 train** (renewal.ts overlap with #200). Baseline note: this branch = 399; #199 carries 371 — merge-order independent.

**CI postscript (2026-07-08 ~08:30)**: 4 simultaneous pushes starved the runners — #198/#199 failed with UNIFORM 5000ms timeouts across unrelated files (flake pattern; #198 rerun passed unchanged). #199's SECOND failure was REAL: ratchet 401>399 — the two new documents[MARRIAGE_CERTIFICATE] indexes each added a TS7053 (my local ratchet output got swallowed by a backgrounded command chain — lesson: never background the ratchet). ROOT CAUSE predated the PR: useDocumentOperations' `documents` mis-inferred as the RAW response when initialData present (RQ TData collapse) → EVERY documents[Category] index app-wide was implicit-any. One GroupedDocuments annotation (runtime always matched — select applies to initialData) killed the family: **ratchet 399 → 371**, baseline committed on #199. ALL FOUR PRs GREEN: #197 ✓ #198 ✓(flake rerun) #199 ✓(371 baseline) #200 ✓. Merge order free (zero file overlap; baseline change only on #199).

### Update — 2026-07-08 02:35 — S5B GO: PROD DEMO 13:00 CST TODAY; grill closed; wave-1 building

**#203 MERGED 07:30Z → S5a complete on release/2.15.0. Session resumed; S5b #169 BUILD IS RUNNING on `feat/169-s5b-multitenant`.**

**Grill rulings (today, all locked)**: demo ON PROD ~13:00 CST with ALL FOUR beats (wizard N tenants · per-tenant links+gate · admin add/remove · payment link+carátula); user ON STANDBY for merge×2 + manual migrations; cut line agreed — defer e2e specs (09f/13), renewal per-tenant selection (clone-ALL meanwhile), legacy `tenant` key removal. Payment links: NEW per-payment "Enviar a inquilinos" button, **TENANT-paid payments only** (user caught: never landlord-paid), emails same link to all tenants. No tenant cap (no hard max ruled). Neutral "Inquilino N" titles, "Agregar coinquilino". replaceTenant keeps pre-ACTIVE statuses + gains tenantId. Admin-force = existing per-actor informationComplete. TenantReceipt.tenantId stays required = uploader attribution (flag post-demo). Fallback: local demo if prod not green by ~11:30.

**Recon (9-mapper ultracode sweep, 0 errors)**: CSV needs NO change (selects no tenant fields — stale hint); receiptService.getMonthStatus VIOLATES any-tenant-satisfies (tenantId filter — fixing); NO payment-link email exists today (new feature); reminderService:147 pre-existing bug — links built from actor ID not token (fixing in loop conversion); marriage-cert needed no migration (enum was in init).

**Phase 1 DONE (inline)**: schema `tenants Tenant[]` + @unique dropped + @@index; migration `20260708130000_tenant_one_to_many` (DROP INDEX "Tenant_policyId_key"; CREATE "Tenant_policyId_idx"; sorts AFTER jo_aval_legal_rep_id); client regenerated; seed ×4 keys; policySelect/List → tenants (orderBy createdAt asc, display-only); policyRowToAggregate INVERTED (native tenants passthrough, legacy tenant=tenants[0]??null). Post-flip tsc: 634 (371 baseline + ~263 flip) — dump at scratchpad/tsc-post-flip.txt.

**Wave 1 IN FLIGHT** (workflow wf_b6f0e599-69d, 7 file-partitioned agents): B1 policy core/router/renewal/replace(tenantId) · B2 gates(:46,:57 loop,:239 fan-out)/tokens C5/shareLinks/reminder+bugfix/investigation+document routers · B3 payments prefill-N>1/sendPaymentLinkToTenants C4/webhook fan-out/receipts policy-scope/PaymentsTab button · B4 addTenant/removeTenant C2 (archiveAndCleanupTenant exists :105)/TenantTab cards/ReplaceModal · B5 wizard tenantsStepSchema min1 no-max/useFieldArray/i18n · B6 lists (+N badge)/dashboard/investigation UI/portals · B7 getPolicyForCover C6/DOCX+PDF all-co-arrendatarios+per-tenant signatures. Then wave 2 tests → verify (ratchet ≤371, integration, @core e2e, local walkthrough) → single PR → release/2.15.0.

**NEXT after wave 1**: my review pass + tsc → wave-2 tests agent → Phase 3 verify → PR + runbook (jo_aval_legal_rep_id + tenant_one_to_many manual on prod AFTER deploy) → handoffs → prod smoke → 13:00 demo.

### Update — 2026-07-08 03:20 — S5b BUILT + GREEN → PR #204 OPEN (awaiting merge → prod → migrate → demo)

**S5b #169 multi-tenant COMPLETE on `feat/169-s5b-multitenant`. PR #204 → release/2.15.0. Follow-ups filed as #205.**

**Verification (all green)**: integration **430 pass / 0 fail** (serial, +25 vs 405 baseline); unit+domain **375 / 0**; `bun run build` exit 0; **ratchet 354 (LOWERED from 371 baseline, committed** — RHF 3-generic typing + documentService annotations burned 17). 12 commits by concern (db · domain · services · payments · actors · wizard · ui · docx/pdf · domain-test · doc-fix · tests · ratchet).

**How it was built (ultracode)**: Phase-1 core flip inline (schema tenants[] + drop @unique + migration 20260708130000_tenant_one_to_many + adapter inversion → 634 tsc = 371 baseline + 263 flip). Wave-1 = 7 file-partitioned impl agents (0 errors, 21m); I fixed the cross-file seams myself (renewalSelection tenants[]+tenantSelectionFor fallback, stats.ts select, preload mock). Wave-2 = 3 test agents (430/0). Adversarial review = 4 finders → 2-verifier refute: **confirmed:[] but all 4 finders converged on documentService.validatePolicyDocuments stale `Policy.tenant` include** — verifiers wrongly refuted "not on demo path"; I checked directly, it's a REAL Prisma runtime throw, fixed (iterate all tenants). Receipt.router `tenant:` was a FALSE alarm (TenantReceipt.tenant = valid uploader FK, not renamed). **Lesson reaffirmed: converging finders override adversarial refutal — verify yourself.**

**Product deltas shipped**: no primary tenant (createdAt-asc display only); ALL-tenants gate + per-tenant investigation; per-tenant portal links; admin add/remove pre-ACTIVE (≥1 by count, archive+activity, receipts re-stamped to survivor before cascade delete); wizard 1..N (no cap); "Enviar a inquilinos" on TENANT-paid only (user's catch); Stripe prefill dropped N>1; receipts policy-scoped (getMonthStatus tenantId filter REMOVED); carátula/PDF all co-arrendatarios+signatures; renewal clones ALL. Bonus fix: reminder emails had a DEAD `/actors/<id>` link → now real token portal URL (all actor types).

**HANDOFF — user on standby (runbook: scratchpad/prod-runbook-snippet.md)**:
1. Merge PR #204 → release/2.15.0 (CI green).
2. Merge release/2.15.0 → main (**= prod deploy**).
3. **Manual prod migrations AFTER deploy**: `bunx prisma migrate deploy` → applies jo_aval_legal_rep_id + tenant_one_to_many (DROP INDEX Tenant_policyId_key; CREATE Tenant_policyId_idx). Deploy-before-migrate SAFE (old client reads fine pre-drop). Verify queries in runbook.
4. Joint prod smoke: 2-tenant protección end-to-end (wizard→2 links→gate→payment fan-out→carátula), then cancel throwaway.
**Fallback**: local demo on this branch if prod not green by ~11:30 CST (needs local `prisma migrate deploy` first). Demo 13:00+ CST.

**#205 post-demo**: e2e 09f/E2E-13, renewal exclusion UI, remove legacy singular `tenant` key, createBatch tenants[], landlord-delete archive parity, TenantReceipt attribution.
