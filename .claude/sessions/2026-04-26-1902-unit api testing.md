# unit api testing - 2026-04-26 19:02

## Session Overview
- **Start time:** 2026-04-26 19:02
- **Branch:** release/2.9.0

## Goals
- Build foundation for integration/contract tests at the tRPC procedure boundary, hitting a real Postgres test DB.
- Catch field-removal regressions before they hit the frontend.
- Reference implementation: `policy` router covering 3 procedures.

## Progress
- Decisions resolved via /grill-me — see plan in conversation history.
- Phase 0 foundation complete:
  - `scripts/test-db.ts` — Django-style provisioner (CREATE DB if missing, prisma db push)
  - `.env.test` rewritten so `DATABASE_URL` is the canonical var
  - `tests/utils/database.ts` collapsed onto the singleton from `@/lib/prisma`
  - `tests/integration/preload.ts` — safety check, beforeEach reset+seed, mocks for stripe/nodemailer/S3 presigner/google maps/email/notification/server-only
  - `tests/integration/callers.ts` — public/admin/staff/broker/token caller factories
  - `tests/integration/expectAuthGate.ts` — one-call role-gate compression
  - `tests/integration/factories/{user,package,policy,landlord,tenant}.factory.ts` (fishery)
  - `tests/integration/scenarios.ts` — `createPolicyWithActors`
  - `src/lib/schemas/policy/output.ts` — output schemas; `.output()` wired on `policy.{checkNumber,cancelPolicy,create}`
  - `tests/integration/routers/policy.test.ts` — reference test (11 cases)
  - `package.json` scripts: `test:unit`, `test:integration`, `test:db:setup`
  - `.github/workflows/test.yml` — CI on every PR, postgres:15 service container
- Validation: 11 integration tests + 33 unit tests pass green against local Postgres.
- Pending: Docker environment was unavailable so tests were validated against local Postgres on 5432; canonical 5433 docker path unverified locally but matches CI.
- 2026-04-26 ~20:30 — PR #92 merged into release/2.9.0 (commit 96ed011).

## Phase 1 — high-stakes tRPC

Per-router PR cadence to keep review scope tight.

### 1.1 — Finish `policy` router ✅ MERGED (PR #93, commit b6fb82c)
- 8 procedures covered: list, getById, updateStatus, getShareLinks, sendInvitations, replaceTenant, changeGuarantorType, renew
- 22 new test cases → 33 total policy.* tests passing (62 expects)
- Output schemas extended in src/lib/schemas/policy/output.ts with reusable shapes
- Factories: jointObligor, aval added
- Known follow-ups noted in PR (router error-handling fix; happy paths for replace/change/renew)

### 1.2 — `payment` router ✅ MERGED (PR #94, commit 4187f25)
- 17 procedures covered: list, getPaymentDetails, getBreakdown, getById, recordManualPayment, verifyPayment, updatePaymentReceipt, cancelPayment, generatePaymentLinks, editAmount, createNew, getStripeReceipt, getStripePublicReceipt, getPublicPayment, createCheckoutSession, createSpeiSession, getSpeiDetails
- 44 new test cases → 77 total passing (124 expects)
- Schemas: src/lib/schemas/payment/output.ts (PaymentShape mirrors Prisma column-for-column)
- Factory: payment.factory.ts with 6 traits (pending/completed/cancelled/failed/manual/spei)
- Stripe mock extended with customers.create, paymentIntents.create returning SPEI next_action, paymentIntents.retrieve with latest_charge.receipt_url
- Known follow-up: Stripe-roundtrip happy paths for generatePaymentLinks/editAmount/createNew deferred (need richer Stripe-session fixtures)

### Phase 1 status snapshot (after 1.2 merged)
- Total integration tests passing: **77** across **2 router files** (policy.test.ts, payment.test.ts)
- Output schemas authored: **policy** (11 procedures, including all of 1.1) + **payment** (17 procedures) = 28 procedures locked
- Factories: user, package, policy, landlord, tenant, jointObligor, aval, payment (8)
- External-service mocks: stripe (with SPEI/customers/receipts), nodemailer, AWS S3 presigner, googleMapsService, emailService, notificationService, server-only

### 1.3 — `actor` router (PR #96, awaiting merge)
- 17 procedures covered (shared 11 + landlord 6) → 33 new test cases / 110 total passing
- Schemas: src/lib/schemas/actor/output.ts (ActorBaseShape + per-type extensions)
- New helper: tests/integration/actorTokens.ts (mints real tokens via actorTokenService; expireActorToken for token-expired branch)
- PRD also opened (issue #95) summarising the entire initiative
- Known follow-ups noted in PR: updateSelf per-type happy paths, update (dualAuth) session/token happy paths (ActorAuthService re-resolves session via next/headers — needs refactor or mock), createBatch happy (LandlordService transaction needs richer fixtures)

### 1.4 — `receipt` router (PR #97, awaiting merge)
- 12 procedures covered: requestMagicLink, getPortalData, getUploadUrl, confirmUpload, markNotApplicable, undoNotApplicable, deleteReceipt, getDownloadUrl, listByPolicy, getConfig, updateConfig, getDownloadUrlAdmin
- 32 new test cases → 142 total passing (224 expects)
- Schemas: src/lib/schemas/receipt/output.ts (TenantReceiptShape + ReceiptConfigShape mirror Prisma column-for-column)
- Factory: tenantReceipt.factory.ts with 3 traits (uploaded / not-applicable / pending-upload)
- documentService mocked at preload (S3 boundary) — receipt and document tests now AWS-free

## Phase 1 complete after #97 merges

| Phase | Router | Procedures | Tests |
|---|---|---|---|
| 1.1 | policy | 11 | 33 |
| 1.2 | payment | 17 | 44 |
| 1.3 | actor | 17 | 33 |
| 1.4 | receipt | 12 | 32 |
| **Total** | 4 routers | 57 procedures | 142 |

## Phase 2 — remaining tRPC + critical REST

### 2.1 — contract + address + package + pricing (PR #98, awaiting merge)
- 13 procedures covered → 35 new test cases / 177 total passing
- Schemas: src/lib/schemas/{contract,address,package,pricing}/output.ts
- Surfaced one real drift: pricing.calculateWithOverride manual branch omits ivaRate vs the fallback branch
- Phase 2.1 done. Next: 2.2 = user + staff + onboard + document.

### 2.2 — user + staff + onboard + document ✅ (PR #99 merged)
- 20 procedures → 43 new tests / 220 total / 4 new schema files
### 2.3 — investigation (PR #100, awaiting merge)
- 15 procedures → 43 new tests / 263 total
- Largest router in the codebase (~1100 lines)
- Locks the contract on the public approval flow (sanitized payload via getByToken)
- Atomic-transaction CONFLICT invariant verified for approve
- Known follow-ups: submit happy path + getDocumentDownloadUrlByToken happy path need investigation-document fixtures

### 2.4 — REST endpoints (PR #101, awaiting merge)
- 6 cron handlers + stripe webhook + payments/receipt (GET/POST/PUT) + policies/{cover,pdf} → 28 new tests / 291 total
- New test infrastructure: tests/integration/restHelpers.ts (withSession + withHeaders + buildRequest + readJson)
- preload widened with next/headers, next-auth, next-auth/next, 4 reminder services, @/lib/docx, @/lib/pdf
- Atomic idempotency invariant verified on stripe webhook (second checkout.session.completed for same payment returns skipped: true)

## Phase 2 complete after #101 merges
**117 procedures + endpoints under contract. 291 integration tests passing.**

## Phase 3 — auth REST + user/avatar ✅ FINAL (PR #102, awaiting merge)
- 5 endpoints: login, register, forgot-password, reset-password GET+POST, user/avatar POST+DELETE
- 20 new tests / 311 total
- Anti-enumeration envelope on forgot-password verified
- Session-invalidation invariant on reset-password verified

## INITIATIVE COMPLETE after #102 merges
- 11 PRs (#92 through #102) over the session
- 311 integration tests across 13 files
- 134 procedures + endpoints under contract
- Real drifts surfaced + fixed: pricing.calculateWithOverride shape (PR #98), UserPublicShape emailVerified (PR #99); atomic-transaction CONFLICTs verified for investigation.approve and stripe webhook (PRs #100, #101)
- Out-of-scope per PRD #95: perf, concurrency, E2E, per-test tx, coverage gates

## Docs sweep ✅ MERGED (PR #103, commit 0069ee5)

- New canonical guide: `docs/TESTING.md` — recipes, conventions, gotchas, follow-ups, real drift caught, links to all 11 PRs
- New in-place pointer: `tests/integration/README.md`
- Updated: main `README.md`, `src/server/routers/README.md`, `src/lib/schemas/README.md`, `src/app/api/README.md`, `docs/DEVELOPER_ONBOARDING.md` (incl. Steps 5b + 5c in "Adding a New Actor Type")
- PRD issue **#95** closed with full closeout summary

### Update — 2026-04-27 ~07:00 — fix(test): cron coverage + log noise + landlord ReferenceError ✅ MERGED (PR #104, commit 1cde198)

**Summary**: Three fixes triggered by audit of test logs.

**Git Changes**:
- Modified: `src/lib/services/actors/LandlordService.ts`, `tests/integration/preload.ts`, `tests/integration/rest/cron.test.ts`, `tests/utils/database.ts`
- Branch: release/2.9.0 (commit 1cde198)

**Test status**: 316 pass / 0 fail (was 311 — the new "nothing to process" branch tests for each cron added 5)

**Details**:

1. **Cron tests now exercise real work, not just shape.** Removed the four reminder-service mocks at preload (`@/services/reminderService`, `policyExpirationReminderService`, `policyQuarterlyFollowupService`, `receiptReminderService`). Each cron now has TWO tests:
   - Happy-path with seeded data → asserts `policiesProcessed > 0`, `remindersSent > 0`, and persisted side effects (e.g. `Policy.status` flipped to `EXPIRED`, `ReminderLog` row written for the right reminderType)
   - Empty-DB → graceful "nothing to process" envelope still returns 200

2. **Service-log noise eliminated.** `BaseService.prototype.log` patched to a no-op in `NODE_ENV=test`, gated by `VERBOSE_TEST_LOGS=1`. Verified: 0 noise lines in `actor.test.ts` (was 14+ from the original logs). Production code untouched.

3. **Real `ReferenceError` fix in `LandlordService.createLandlord`.** The transaction body referenced `landlordData` which was never declared in scope (the parameter is `data`). One-line `const landlordData = data;` alias added. Bug had been silently masked because `actor.createBatch`'s auth-gate test only verified PUBLIC + BROKER blocks, never that ADMIN/STAFF reach a successful create.

4. **Bun `toMatchObject` quirk documented.** Bun mutates the asserted object to replace primitives with asymmetric-matcher tokens (`expect.any(Number)` → `Any<Number>`) when nested deep. Subsequent `toBeGreaterThanOrEqual` then sees `Any<Number>` instead of the actual number. Workaround: read the envelope into a typed local and assert fields directly. Not using `toMatchObject` for primitive paths going forward.

5. **Truncation list extended**: `ReminderLog`, `TenantReceipt`, `ReceiptConfig`, `ActorInvestigationDocument`, `PaymentTransfer` added.

## Final stats after PR #104

- **316 integration tests passing** (was 311)
- **134 procedures + endpoints under .output() contracts**
- **Initiative status**: complete ✅

---

## Next tasks to review — "shape-only" audit

PR #104 demonstrated the pattern: a test that returns 200 with the right envelope but never proves the service did its job. The cron tests had this exact regression mode for weeks. Audit of the rest of the suite for the same class:

### 🔴 Category A — Auth-gate-only tests where the service is reached but never asserted to do its work

These tests pass with PUBLIC blocked, but for ADMIN/STAFF the procedure runs against missing fixtures and fails downstream. We treat the failure as "gate passed", but we never assert the persisted side effect. Same risk as crons: a service silently doing nothing would still pass.

| Procedure | Why deferred | Effort to add happy path |
|---|---|---|
| `actor.createBatch` | Just fixed `landlordData` ReferenceError; still no happy assertion | Low — bug fix unblocks it |
| `actor.updateSelf` | Per-type strict schema needs fully-valid actor fixture | Medium |
| `actor.update` (dualAuth) admin/token | `ActorAuthService.handleAdminAuth` re-resolves session via `next/headers` | High — needs service refactor or richer next/headers mock |
| `actor.submitActor` (dualAuth) | Same `ActorAuthService` constraint | High |
| `actor.adminSubmitActor` | Needs `IDENTIFICATION`/`PROPERTY_DEED`/`PROPERTY_TAX_STATEMENT` documents on the landlord | Medium — needs `ActorDocument` factory |
| `actor.saveMultipleLandlords` | Strict landlord input fixture | Medium |
| `actor.deleteCoOwner` | Multi-landlord scenario fixture | Low |
| `policy.replaceTenant` | Heavy archiving (TenantHistory writes) | Medium |
| `policy.changeGuarantorType` | Same | Medium |
| `policy.renew` | Transactional cloning + S3 document copy | High — needs richer document fixtures |
| `payment.generatePaymentLinks` | Stripe checkout roundtrip | Medium — extend Stripe mock |
| `payment.editAmount` | Stripe session expire+create | Medium |
| `payment.createNew` | Stripe session create | Medium |
| `investigation.submit` | Needs investigation-document fixtures (the "must have at least one document" precondition) | Low — add `ActorInvestigationDocument` factory |
| `investigation.removeDocument` happy | Needs the same factory | Low |
| `investigation.getDocumentDownloadUrl` happy | Same | Low |
| `investigation.getDocumentDownloadUrlByToken` happy | Same | Low |
| `document.{getUploadUrl,confirmUpload,listDocuments,deleteDocument,getDownloadUrl}` (dualAuth) | `ActorAuthService` constraint | High |
| `user.uploadAvatar` happy | Multipart form-data + storage mock | Medium |
| `onboard.uploadAvatar` happy | Same | Medium |

**Recommendation**: tackle the *Low* effort items first (they're blocked only by missing factories). Add `ActorInvestigationDocument` factory + `ActorDocument` factory, unlocks 5+ happy paths in one go.

### 🟡 Category B — Stripe webhook event ladder

`/api/webhooks/stripe` handles many event types, but only `checkout.session.completed` has a happy-path test. Money flows through the rest:

- `checkout.session.expired` — verify activity log without state change
- `charge.refunded` — verify status transitions to `REFUNDED` + `refundedAt`/`refundAmount` persist + atomic idempotent skip
- `payment_intent.partially_funded` — SPEI partial funding; creates `PaymentTransfer` rows + updates `speiFundedAmount`
- `payment_intent.succeeded` (SPEI completion) — payment marked `COMPLETED`
- `payment_intent.payment_failed` — payment marked `FAILED`

Each adds a single happy-path test against the real router (just like checkout.session.completed). Effort: low per event, ~5 events.

### 🟡 Category C — Output schemas with `.passthrough()` aren't fully locked

Where deeper nests use `passthrough()`, removing a field on those nests does NOT fail tests:

- `actor/output.ts` `PolymorphicActorOutput` — used by `getById`, `update`, `markComplete`, `submitActor`, `adminSubmitActor`, `listByPolicy`, `createBatch`. Removing a per-type field (e.g. `tenantType`, `jointObligorType`) silently passes.
- `policy/output.ts` `PolicyGetByIdLandlord/Tenant/JointObligor/Aval` use passthrough on nested `documents`, `personalReferences`, `commercialReferences`, address objects — removing fields on those would not fail.
- `landlord.savePropertyDetails` and `savePolicyFinancial` return `passthrough()` — minimal lock.

**Recommendation**: convert top-N most-consumed nests to strict shapes. Frontend likely uses `tenantType`/`avalType`/`jointObligorType` (the type discriminator) — that's the highest-priority field to lock per actor type.

### 🟡 Category D — REST endpoints that test the wrapper, not the work

- `/api/policies/[policyId]/contract-cover` and `/pdf` — `generateCoverPageDocx` / `generatePolicyPDF` are mocked at preload returning `Buffer.from('fake-...-buffer')`. The route's response shape is verified, but a regression in the real generator (broken docx schema, missing field in PDF) wouldn't fail any test. These are NOT in the integration suite's scope (the generators have their own pure-unit tests under `src/lib/docx/__tests__/`), but the gap is worth flagging.
- `/api/payments/[paymentId]/receipt` PUT — uses mocked `documentService.fileExists` (returns true). If the route stops checking file existence, the test still passes.

**Recommendation**: low-prio. The DOCX/PDF generators have unit tests; the receipt route isn't likely to drift. Document the gap, move on.

### 🟢 Category E — `policy.sendInvitations` BROKER auth gate

Listed as a known follow-up. The router catches its FORBIDDEN ownership check and re-throws as `INTERNAL_SERVER_ERROR`, masking the real auth failure. The auth gate test currently excludes BROKER. **Fix the router error mapping**, then re-enable the BROKER scope. Effort: low.

### 🟢 Category F — Frontend schema imports not audited

PRD #95 promised the frontend imports `src/lib/schemas/<domain>/output.ts` directly for runtime validation. We haven't audited whether it actually does this anywhere — the schemas are server-side `.output()` only today. Worth a one-time grep + decision: do we want runtime validation client-side, or is the inferred-type contract enough?

### Suggested order

1. Add `ActorInvestigationDocument` + `ActorDocument` factories → unlocks 5+ Category A happy paths
2. Fix `policy.sendInvitations` error mapping → re-enable BROKER auth gate (Category E)
3. Add Stripe webhook event ladder tests (Category B) — money-critical
4. Tighten the most-consumed actor `passthrough()` nests (Category C) — start with the type discriminators
5. Audit `policy.replaceTenant` / `changeGuarantorType` happy paths (Category A — medium effort)
6. Decide on frontend schema imports (Category F — strategy call, not implementation)

Categories **A1 (low-effort) + B + E** would close ~10 procedures' coverage gaps for relatively little work.

### Update — 2026-04-27 ~19:50 — chore(test): filter + dockerless test:integration variants ✅ MERGED (PR #105, commit b70380f)

**Summary**: Tooling/docs PR addressing two ergonomic gaps surfaced after PR #104. Out of three candidate areas (filter, prisma→zod codegen, dockerless), the user kept scope to filter + dockerless and explicitly rejected codegen ("almost finished project").

**Git Changes**:
- Modified: `package.json`, `docs/TESTING.md`, `README.md`
- Branch: chore/test-filter-and-dockerless → release/2.9.0 (merge commit b70380f)
- Two commits: 9ec10c8 (scripts) + 30435f7 (docs)

**Tasks**: 5 completed (package.json, .gitignore [no-op, glob already covers], TESTING.md, README.md, verification)

**Details**:

1. **`test:integration:filter`** — accepts positional path + bun flags (`-t <regex>`, `--watch`). No `pretest:integration` hook (npm/bun auto-hooks are exact-name only), so inner-loop iteration doesn't re-spin docker.

2. **`test:integration:no-docker`** — full suite without docker. Companion to a new `test:db:provision` (dockerless schema setup).

3. **`.env.test.local` layering** — all test scripts now load `dotenv -e .env.test -e .env.test.local -o`. The `-o` flag is non-obvious-but-required: `dotenv-cli@11` loops `dotenv.config()` per file with the override flag forwarded; without `-o`, dotenv defaults to `override: false` and the *first* file wins. Verified by reading `node_modules/dotenv-cli/cli.js:33,87-89` plus runtime tests printing `process.env.DATABASE_URL` through several flag combinations.

4. **`test:integration:watch` removed** — `test:integration:filter <path> --watch` covers it; one less script to maintain.

5. **`.gitignore` was already correct** — `.env*.local` glob covers `.env.test.local`; no edit needed.

6. **Footgun caught during verification**: a pre-existing `.env.test.local` in repo root was a byte-identical copy of `.env` (dev DATABASE_URL pointing at `localhost:5432/hestia`, no `_test` suffix). Pre-PR it was inert; post-PR the new dotenv chain would load it and the preload's `_test` guard would refuse every test run. User confirmed the file was intentional (`cp .env .env.test.local`); they'll either retire it or replace contents with proper test overrides.

7. **CI unchanged** — `.github/workflows/test.yml` invokes `scripts/test-db.ts setup` and `bun test --preload ...` directly, never goes through `test:integration` script, so it ignores all `pretest` hooks and the new dotenv chain.

**Decision log (from /grill-me session)**:

| # | Topic | Resolution |
|---|---|---|
| Filter granularity | File path + `-t <regex>` (no per-router shortcut scripts — they rot) |
| Filter pretest | Skip — assume warm DB, document |
| Prisma → Zod codegen | **Rejected** — almost-finished project, contract tests already catch drift, generators don't know about service `select`s |
| Dockerless mechanism | `.env.test.local` (gitignored, dotenv-chained) + `test:integration:no-docker` script |

**Verification path used**:
- `bunx dotenv -e .env.test -p DATABASE_URL` — sanity baseline
- Dotenv chain matrix: with/without `-o`, with/without missing file
- Diagnostic `print-env.ts` script (parent process.env vs spawned bun child) — confirmed `-o` is required and missing files are silent
- `bun run test:integration:filter -t "<nonexistent>" tests/integration/routers/policy.test.ts` — confirms args pass-through; bun reports "matched 0 tests" cleanly
- `_test` guard rejection path with deliberately bad URL in `.env.test.local`

## Final stats after PR #105

- **316 integration tests** (unchanged — this PR was tooling/docs only)
- **134 procedures + endpoints under .output() contracts** (unchanged)
- **Initiative status**: complete ✅ + ergonomics improved

---

# Session End — 2026-04-27 ~20:00

## Duration
**~25h wall-clock** (2026-04-26 19:02 → 2026-04-27 ~20:00). Active development split across two days; PRs landed in two clusters: #92–#102 on 2026-04-27 03:57–06:03, #103 at 06:27, #104 at 06:51, #105 at 19:49.

## Git summary

**Branch**: `release/2.9.0` (final state, all work merged here).

**13 PRs merged** during the session — listed by phase:

| PR | Phase | Merged | Title |
|---|---|---|---|
| #92 | 0 | 2026-04-27 03:57 | bootstrap integration test infra |
| #93 | 1.1 | 2026-04-27 04:12 | finish policy router |
| #94 | 1.2 | 2026-04-27 04:23 | payment router |
| #96 | 1.3 | 2026-04-27 04:47 | actor router |
| #97 | 1.4 | 2026-04-27 04:54 | receipt router |
| #98 | 2.1 | 2026-04-27 05:05 | contract + address + package + pricing |
| #99 | 2.2 | 2026-04-27 05:14 | user + staff + onboard + document |
| #100 | 2.3 | 2026-04-27 05:21 | investigation |
| #101 | 2.4 | 2026-04-27 05:47 | REST endpoints (cron + webhooks + payments + policies) |
| #102 | 3 | 2026-04-27 06:03 | auth + avatar REST (final phase) |
| #103 | docs | 2026-04-27 06:27 | testing-guide anchor for new contributors |
| #104 | fix | 2026-04-27 06:51 | cron coverage + log noise + landlord ReferenceError |
| #105 | chore | 2026-04-27 19:49 | filter + dockerless test:integration variants |

(PRD issue #95 was opened mid-session as the umbrella for #92–#102 and closed after #103.)

**~40 commits across the session** (excluding merges). The bulk landed under `feat(test)`, `feat(<domain>)` (output schemas), `chore(test)` (factories + mocks), and `test(<domain>)` (integration tests). PR #104 added a real bug fix (`fix(landlord)`) plus test-infra polish. PR #105 added tooling-only changes (`chore(test)` + `docs(test)`).

**Lines added** (rough order of magnitude): ~6500+ insertions across schemas, tests, factories, helpers, and docs. Largest individual deltas: investigation tests (759), policies-export REST tests + cron tests (735 across REST suite), receipt tests (492), docs/TESTING.md (487 across the docs sweep).

**Final git status** (only pre-existing local diffs, unrelated to the work that shipped):
- `M .claude/sessions/.current-session` (session pointer, will be cleared)
- `M CLAUDE.md` (pre-existing local edit, predates this session)
- `?? .claude/plans/` (plan file from this session, gitignored area)
- `?? ".claude/sessions/2026-04-26-1902-unit api testing.md"` (this session's log)

## Todo summary

All tracked tasks completed. Final task list (PR #105 cycle): 5/5 completed.
- ✓ Update package.json scripts block
- ✓ Add .env.test.local to .gitignore (no-op — `.env*.local` glob already covered it)
- ✓ Add filter + dockerless sections to docs/TESTING.md
- ✓ Update README.md Quick Start with filter examples
- ✓ Verify scripts: filter + dockerless paths

(Earlier phases of the session predate the task tool rollout; their progress is captured in the per-phase Update sections above.)

## Key accomplishments

1. **Built the integration test foundation from scratch** (PR #92): Django-style test DB provisioner, bun preload safety + reset/seed hooks, callers, factories, scenarios, expectAuthGate, output schemas, CI workflow.

2. **Locked the contract on 134 procedures + REST endpoints** across 13 routers/areas with `.output(<zodSchema>)` mirrored against service `select`s or Prisma models. Frontend can now `import` these schemas directly.

3. **316 integration tests passing** at session end (started at 0).

4. **Real drift caught in flight**: pricing.calculateWithOverride manual branch missing `ivaRate` (#98); `UserPublicShape` had `emailVerified` but `userService.userSelect` doesn't return it (#99); cron tests were "shape-only" without exercising real reminder services (#104, found a `ReferenceError` in `LandlordService.createLandlord` that was silently masked by an auth-only test).

5. **Atomic-transaction CONFLICT invariants verified** for `investigation.approve` (#100) and `/api/webhooks/stripe` checkout.session.completed idempotency (#101).

6. **Docs anchored** for new contributors: `docs/TESTING.md` (canonical), `tests/integration/README.md` (in-place pointer), updates to `src/server/routers/README.md`, `src/lib/schemas/README.md`, `src/app/api/README.md`, `docs/DEVELOPER_ONBOARDING.md`, plus the main `README.md`.

7. **Tooling ergonomics** (PR #105): file/`-t` filter mode + dockerless local-Postgres workflow via `.env.test.local` + `dotenv-cli -o`, no impact on CI.

## Features implemented

- **Output schemas** in `src/lib/schemas/<domain>/output.ts` for: policy (11), payment (17), actor (17), receipt (12), investigation (15), pricing (6), package (4), address (2), contract (placeholder), user (5), staff (5), onboard (3), document (7).

- **Test infrastructure** (`tests/integration/`): `preload.ts` (safety + reset + 13 module mocks), `callers.ts` (5 caller helpers), `expectAuthGate.ts` (one-call auth-matrix assertion), `actorTokens.ts` (mint real tokens), `restHelpers.ts` (`withSession`/`withHeaders`/`buildRequest`/`readJson`), `scenarios.ts` (`createPolicyWithActors` + variants).

- **Factories** under `tests/integration/factories/`: user, package, policy, landlord, tenant, jointObligor, aval, payment, tenantReceipt, actorInvestigation (10 fishery factories).

- **Test runner ergonomics** (PR #105): `test:integration:filter`, `test:integration:no-docker`, `test:db:provision`. `.env.test.local` layering via `dotenv-cli -o`. Removed `test:integration:watch` (covered by `filter --watch`).

- **CI**: `.github/workflows/test.yml` runs the full suite on every PR with a Postgres 15 service container.

## Problems encountered + solutions

| Problem | Solution |
|---|---|
| Docker unavailable during PR #92 dev | Fell back to local Postgres on 5432 with manual `.env.test` edit. Eventually fixed for everyone in PR #105 via `.env.test.local`. |
| `ActorAuthService.handleAdminAuth` re-resolves session via `next/headers`, throwing outside a request scope | Mocked `next/headers` and `next-auth` at preload; admin-session happy paths for actor/document procedures still deferred (need refactor to read `ctx.session`). |
| Rate-limited routes (`/api/auth/login`, `/forgot-password`) read `x-forwarded-for` | Tests use a unique IP per request — pattern in `tests/integration/rest/auth.test.ts`. |
| `bun:test`'s `toMatchObject` mutates the asserted object so subsequent assertions see asymmetric-matcher tokens (`expect.any(Number)` → `Any<Number>`) | Read envelope into typed local first; assert primitive fields directly. Documented in PR #104. |
| Service logs spammed test output | Patched `BaseService.prototype.log` to no-op in `NODE_ENV=test`, gated by `VERBOSE_TEST_LOGS=1` (PR #104). |
| `dotenv-cli@11` chains files with `override:false` by default — second file can't override first | `-o` flag required. Verified by reading `node_modules/dotenv-cli/cli.js:33,87-89` and runtime tests. Documented in TESTING.md. |
| Pre-existing `.env.test.local` byte-identical to `.env` (dev DATABASE_URL) | Caught during PR #105 verification. Pre-PR inert; post-PR would silently route tests at dev DB until `_test` guard rejected. User confirmed intentional `cp`; left as-is. |
| `LandlordService.createLandlord` referenced undeclared `landlordData` | Fixed by adding `const landlordData = data;` alias inside `createLandlord` (PR #104). The bug had been masked because `actor.createBatch`'s auth-gate test only checked PUBLIC + BROKER blocked, never proved ADMIN/STAFF reach a successful create. |

## Breaking changes / important findings

- **None for production code.** Output schemas are server-side `.output()` only; not yet imported by the frontend (audit deferred — Category F follow-up).
- `PaymentShape` mirrors the Prisma `Payment` model column-for-column. New columns added to Prisma will not auto-appear; the schema must be updated. Same for every `<domain>/output.ts`.
- `actor/output.ts` `PolymorphicActorOutput` and several nested includes (`policy/output.ts` for documents/references) use `.passthrough()` — fields removed inside those nests will NOT fail tests. Tightening these is Category C follow-up.
- `bun test` does NOT support `-t` (test-name regex) without explicit invocation — only file paths via positional args. PR #105's `test:integration:filter` exposes `-t` cleanly.
- **Bun env loading is not as documented**: `NODE_ENV=test bun -e ...` does NOT load `.env.test` on its own; `dotenv-cli` is required. Explains why all `test:integration*` scripts must go through `dotenv-cli`.

## Dependencies / configuration changes

- **No runtime dependencies added.** `dotenv-cli@11` and `fishery@2.4` were already present.
- **CI workflow added**: `.github/workflows/test.yml` — postgres:15 service container, runs unit + integration on every PR/push to release branches.
- **`.env.test`** committed at repo root (test-only values; all secrets are placeholders mocked at preload).
- **`docker-compose.test.yml`** committed at repo root (postgres:15-alpine on host port 5433).
- **`scripts/test-db.ts`** added — Django-style provisioner with `_test`-suffix guard.
- **`package.json` test scripts** rewritten over the session, latest set in PR #105:
  - `test:integration` — full suite, with pretest hook (docker)
  - `test:integration:filter` — filtered subset, no pretest
  - `test:integration:no-docker` — full suite, no pretest
  - `test:db:up` / `test:db:down` / `test:db:reset` — docker lifecycle
  - `test:db:setup` — docker + provision
  - `test:db:provision` — provision only (dockerless)

## Deployment steps taken

None. All changes target `release/2.9.0`. No production deploys triggered by this work.

## Lessons learned

1. **"Shape-only" tests are a regression vector.** A test that asserts a 200 envelope but never proves the service did its job will silently pass when the service does nothing. PR #104 caught the cron crons doing this for weeks. Writing a happy-path that asserts a persisted side effect (status flip, log row written) is non-negotiable for high-stakes flows.

2. **Lock the contract to the actual `select`, not your guess of what the frontend wants.** PR #99 caught `UserPublicShape` declaring `emailVerified` when `userService.userSelect` doesn't return it. The schema is a mirror of what the service actually emits — never of what callers might want.

3. **Ship one router per PR.** Per-router PR cadence kept reviews tight. Bundling all 13 routers into one PR would have been unreadable; the per-domain split also surfaced real drifts at the right moment in review.

4. **`-o` discipline matters in `dotenv-cli`.** dotenv defaults to `override: false`; chained files won't override each other without it. This is non-obvious and bit us during PR #105 verification.

5. **`toMatchObject` in `bun:test` is footgun-shaped for primitives in nested envelopes.** Mutates the asserted object — assert fields directly into typed locals instead.

6. **The `_test` suffix guard is load-bearing.** Two independent checks (`scripts/test-db.ts` + `tests/integration/preload.ts`) refuse anything else. Don't remove either; they caught real footguns during PR #105 verification.

7. **Auth-gate-only tests can mask real bugs.** PR #104's `LandlordService.createLandlord` `ReferenceError` was hidden because `actor.createBatch`'s auth gate verified PUBLIC + BROKER blocked but never proved ADMIN/STAFF reach a successful create. Floor coverage = happy path + auth gate, not just the gate.

## What wasn't completed (deferred follow-ups)

These were carried forward in PR descriptions and `docs/TESTING.md` "Known follow-ups". Roughly ordered by ROI:

**Low effort, blocked only by missing factories:**
- `actor.createBatch` happy path (now unblocked by PR #104 fix; needs richer landlord input fixture)
- `actor.deleteCoOwner` happy (needs multi-landlord scenario)
- `investigation.{submit, removeDocument, getDocumentDownloadUrl, getDocumentDownloadUrlByToken}` happy paths (need `ActorInvestigationDocument` factory)
- `policy.sendInvitations` BROKER auth gate (router catches FORBIDDEN ownership check and re-throws as INTERNAL_SERVER_ERROR — fix the error mapping in the router, then re-enable the BROKER scope)

**Medium effort:**
- `actor.{updateSelf, adminSubmitActor, saveMultipleLandlords}` happy paths (need richer fixtures)
- `policy.{replaceTenant, changeGuarantorType}` (heavy archiving)
- `payment.{generatePaymentLinks, editAmount, createNew}` (Stripe-roundtrip flows; extend Stripe mock with idempotency keys + expired sessions)
- `user.uploadAvatar` / `onboard.uploadAvatar` (multipart form-data + storage mock)
- Stripe webhook event ladder: `checkout.session.expired`, `charge.refunded`, `payment_intent.partially_funded`, `payment_intent.succeeded` (SPEI), `payment_intent.payment_failed` — currently only `checkout.session.completed` has a happy path

**High effort:**
- `actor.{update, submitActor}` (dualAuth) admin-session happy paths — `ActorAuthService.handleAdminAuth` re-resolves session via `next/headers`; needs refactor to read `ctx.session`
- `document.{getUploadUrl, confirmUpload, listDocuments, deleteDocument, getDownloadUrl}` happy — same dualAuth constraint
- `policy.renew` happy path — transactional cloning + S3 document copy
- Tighten the most-consumed `passthrough()` nests (Category C). Highest-priority field to lock per actor type: the type discriminator (`tenantType`, `landlordType`, `avalType`, `jointObligorType`)
- Frontend audit: are output schemas actually imported anywhere in `src/app/` or `src/components/`? PRD promised this; never verified

**Out of scope per PRD #95** (won't address from this initiative):
- Performance / load testing
- Concurrency-race tests
- Exhaustive Zod input-validation matrices (Zod is upstream-tested)
- E2E browser tests (separate Playwright suite)
- Per-test transactions / per-worker schema isolation
- Coverage-percentage gates in CI

## Tips for future developers

1. **Read `docs/TESTING.md` first.** It has the recipes for adding a new procedure, REST endpoint, factory, mock, caller, and token helper. Don't reinvent — every helper exists.

2. **Floor coverage = happy path + auth gate via `expectAuthGate`.** That's the minimum for any new procedure. Skipping the happy path is what created the audit-able backlog of "shape-only" tests.

3. **For high-stakes flows (policy, payment, actor, receipt, investigation, webhooks/stripe), add business invariants + 1 validation-failure smoke** beyond the floor.

4. **Output schemas mirror the service `select` (or the Prisma model when no select).** Don't guess what the frontend wants. The integration test will catch you if you drift.

5. **Inner-loop iteration**: `bun run test:db:up` once per session, then `bun run test:integration:filter <path-or--t-flag>`. Do NOT use `bun run test:integration` for every iteration — its `pretest` hook re-runs docker + `prisma db push` every time.

6. **Local Postgres workflow**: `echo 'DATABASE_URL="postgresql://test:test@localhost:5432/hestia_test"' > .env.test.local`, then `bun run test:db:provision && bun run test:integration:no-docker`. The `_test` suffix guard refuses anything else.

7. **External services are mocked at preload only**, never per-test. Add new mocks to `tests/integration/preload.ts` so tests can never accidentally hit the real network.

8. **`tests/` is gitignored.** New test files need `git add -f`. (Tracked — fix promised in a future cleanup PR.)

9. **Token authentication is exercised end-to-end.** Mint real tokens via `actorTokenService` — never stub the validation pipeline. See `tests/integration/actorTokens.ts`.

10. **CI runs the same flow on every PR** via `.github/workflows/test.yml`. CI uses a postgres:15 service container in place of docker-compose; the rest is identical. CI bypasses the `pretest:integration` hook by invoking `scripts/test-db.ts setup` and `bun test --preload ...` directly — your changes to `test:integration*` scripts won't affect CI.
