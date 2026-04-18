# Reminder Emails and Policy Renewal
**Started:** 2026-04-18 12:45

## Overview
Session covering two related feature streams: the platform's outbound email
reminders (audit + unification + new pre-expiration and quarterly-followup
crons) and the policy renewal / clone feature that lets staff spin up a new
protección from an existing one.

## Context at start
Two feature branches were just shipped as a chain of commits on the current
branch `remainers-mails`:

1. **Email audit + unification + 2 new reminder flows** (6 commits, ending at `81542dc`)
   - Shared email template components under `src/templates/email/components/`
   - Refactored all 18 existing React Email templates to use them (~2750 LOC removed)
   - Migrated 4 inline-HTML notifications to proper templates
   - Added `Policy.renewedToId` self-relation (schema + migration — user runs `bunx prisma migrate deploy`)
   - New 5-tier policy expiration reminder cron (60/45/30/14/1 days before `expiresAt`)
   - New quarterly follow-up cron for ACTIVE policies (90-day cooldown)

2. **Policy renewal / clone feature** (7 commits, ending at `fd3805f`)
   - Storage: `StorageProvider.copyObject` + S3 (`CopyObjectCommand`) + local impl
   - Schema: `PolicyRenewalSelectionSchema` + `PolicyRenewInputSchema`
   - Service: `clonePolicyForRenewal` in `src/lib/services/policyService/renewal.ts`
   - tRPC: `policy.renew` mutation (ADMIN/STAFF only)
   - Reminder filter widened to resume when `renewedTo.status = CANCELLED`
   - i18n: `policyRenewal.ts`
   - UI: two-step flow at `/dashboard/policies/[id]/renew` — selector with opt-in section checkboxes + per-instance JO/Aval cards + guarantor-type `<Select>` driving dynamic visibility; preview with copied/blank diff
   - CTA: "Renovar" `DropdownMenuItem` in `PolicyHeader.tsx` right after "Descargar Carátula"

`bun run build` passes. Plans preserved at `/Users/neto/.claude/plans/let-s-do-an-audit-purring-hopcroft.md` and `/Users/neto/.claude/plans/policy-renewal-clone-feature.md`.

## Goals
_(to be defined — please share what you want to tackle in this session)_

## Progress

### Update - 2026-04-18 12:48

**Summary**: Comprehensive record of the two feature streams shipped in this
session — the outbound-email reminder overhaul and the policy renewal/clone
feature. Both delivered as clean chains of Conventional Commits, build passes,
and the renewal feature is integrated into the policy detail UI behind a
role-gated dropdown CTA.

**Git state**:
- Branch: `remainers-mails`
- Working tree clean (except `CLAUDE.md` and session tracking files)
- Renewal commits present locally:
  - `34b8e32 feat(policy): add Renovar CTA to policy header dropdown`
  - `f8ccfb4 feat(policy): add renewal clone UI (/renew route)`
  - `94bc3b6 feat(policy): add i18n strings for renewal flow`
  - `6a647de feat(email): resume reminders when renewal target is cancelled`
  - `dff32ff feat(policy): add renew tRPC procedure`
  - `2fb7c01 feat(policy): add clone-for-renewal service + selection schema`
  - `7f753af feat(storage): add copyObject to StorageProvider`
- Email reminder overhaul commits reached master via `release/2.9.0` merge (`e8fc564`).

**Todo progress**: tasks 11–20 all completed during the session (storage
copyObject, renewal schema, renewal service, tRPC procedure, reminder cron
filters, i18n strings, RenewalFlow UI, /renew page, Renovar CTA, build +
type-error pass). Task list cleared at end.

---

### Stream 1 — Email reminder audit + unification + 2 new crons (6 commits)

**Context & discovery** (exploration agents surfaced):
- 18 React Email templates under `src/templates/email/react-email/` + 4 inline-HTML
  notifications via `sendSimpleNotificationEmail` → 22 emails total.
- `emailService.ts` already provider-abstracted (Resend/Mailgun/SMTP).
- Three existing Vercel crons (`incomplete-actors-reminder`, `receipt-reminder`,
  `policy-expiry`). `ReminderLog` table already present for idempotency.
- Gaps: header/footer/button JSX duplicated 18×; no advance warning before
  policy expiration (only same-day); no periodic check-in with active policies.

**Shared component library** (`src/templates/email/components/`):
`EmailLayout`, `EmailHeader`, `EmailFooter`, `EmailButton` (variants
`primary | accent | whatsapp | danger`), `EmailInfoBox`, `EmailWarningBox`,
`EmailParagraph`, `EmailSection`, plus `buildWhatsAppUrl()` helper that reads
`NEXT_PUBLIC_WHATSAPP_NUMBER` (falls back to `null` so callers can skip CTAs).

**Existing template refactor**: all 18 templates migrated to use the
primitives. Props/export names unchanged → zero caller changes. Net diff
~-2750 lines.

**Inline-HTML migration**: three `sendSimpleNotificationEmail` call sites
replaced with proper templates:
- `PasswordResetConfirmationEmail` (reset-password/[token] callback)
- `TenantReplacementEmail` (notificationService.sendTenantReplacementNotification)
- `PolicyPendingApprovalEmail` (notificationService.sendPolicyPendingApprovalNotification)

Fourth call — `sendPolicyExpiryNotification` in `policyWorkflowService.expireActivePolicies` — **deleted entirely**. Replaced by the new 1-day-before reminder (tier 1 below). `expireActivePolicies` still flips status ACTIVE → EXPIRED.

**Schema change**: added `Policy.renewedToId String? @unique` self-relation
(`renewedTo`/`renewedFrom`). Migration at
`prisma/migrations/20260417000000_add_policy_renewed_to_id/migration.sql` — **user applies manually** via `bunx prisma migrate deploy` (per CLAUDE.md no-automatic-migrations rule).

**5-tier policy expiration reminder cron** (`src/services/policyExpirationReminderService.ts`, `src/app/api/cron/policy-expiration-reminder/route.ts`):
- Tiers: 60, 45, 30, 14, 1 days before `expiresAt` (each with its own reminder-log type).
- Tiers 60–14: primary landlord only. Tier 1 (urgent): primary landlord + broker (`managedBy`) + all active admins.
- Copy per tier varies (informational → warning) via `PolicyExpirationReminderEmail` with a `tier` prop.
- Mailto + WhatsApp CTAs built from brand config + `buildWhatsAppUrl`.
- Idempotency via `ReminderLog` (type `policy_expiration_tier_{n}`). ±1-day query window absorbs cron drift.
- Skip filter: `status=ACTIVE, renewedToId=null`.
- Cron schedule: `0 13 * * *` UTC (07:00 CDMX).

**Quarterly follow-up cron** (`policyQuarterlyFollowupService.ts`,
`/api/cron/policy-quarterly-followup/route.ts`):
- Verbatim client-provided body, signature uses `brandInfo.name / tagline /
  supportPhone / supportEmail`.
- COMPANY landlords addressed as "como representante legal de {companyName}" using legal-rep name fields.
- Mailto + WhatsApp CTAs.
- 90-day cooldown via `ReminderLog` type `policy_quarterly_followup`. `take: 200` per run.
- Schedule: `30 13 * * *` UTC (07:30 CDMX, staggered from expiration cron).

**6 commits** (delivered before the renewal stream, since merged to master via release/2.9.0):
1. `feat(email): add shared template components`
2. `refactor(email): adopt shared components in existing templates`
3. `feat(email): migrate inline-HTML notifications to templates`
4. `feat(db): add Policy.renewedToId self-relation`
5. `feat(email): add 5-tier policy expiration reminder cron`
6. `feat(email): add quarterly follow-up cron for active policies`

---

### Stream 2 — Policy renewal / clone feature (7 commits)

**Interview-driven design** — 11 questions resolved one branch at a time via
`AskUserQuestion`; plan written to
`/Users/neto/.claude/plans/policy-renewal-clone-feature.md`. Key decisions:
- Hybrid UX: admin/staff clicks "Renovar" → dedicated `/renew` page with
  opt-in section checkboxes → draft created → redirects to existing edit UI.
- Two-level granularity: entity cards on top, sub-group checkboxes inside.
- Documents: **S3 `CopyObject`** to new key + fresh `ActorDocument` row;
  `verifiedAt/verifiedBy/rejectionReason` all reset.
- Investigations: always archive old as `SUPERSEDED`, create fresh `PENDING`.
- Lifecycle: `old.renewedToId` set at clone time; old + new run in parallel;
  existing daily cron still flips old to EXPIRED on its natural `expiresAt`.
- Financial terms: own visually-prominent sub-group.
- Permissions: ADMIN + STAFF only (BROKER forbidden).
- Eligibility: ACTIVE or EXPIRED policies with `renewedToId IS NULL`.
- Multi-actor: per-instance named cards for each JO and each Aval.
- Cancelled renewal: no auto-unlink of `renewedToId`. Reminder crons widened
  to include `renewedTo.status = CANCELLED` so drafts that were cancelled
  no longer orphan the old policy from notifications.
- Dedicated `/renew` page → creates draft → redirects to edit flow.
- Old's receipts keep running during overlap.
- New investigation fee charged (consistent with fresh investigations).
- Landlord: 7 sub-checkboxes (basic / contact / address / banking / deed / CFDI / docs).
- Guarantor-type mismatch: dropdown at top of Policy Terms card drives dynamic
  JO/Aval section visibility; placeholder card rendered when new type requires
  actors absent on source.

**Storage layer** (`src/lib/storage/`):
- Added `copyObject(sourceKey, destinationKey, isPrivate)` to `StorageProvider` interface.
- S3 impl via `CopyObjectCommand` from `@aws-sdk/client-s3` (already installed).
  `CopySource` is path-segment-encoded (`src.split('/').map(encodeURIComponent).join('/')`) to handle spaces/UTF-8 in uploaded filenames. `MetadataDirective: 'COPY'`.
- Local impl duplicates the in-memory buffer.

**Schema** (`src/lib/schemas/policy/renewalSelection.ts`):
- `PolicyRenewalSelectionSchema` — nested Zod object mirroring the UI taxonomy:
  property (4 subs), policyTerms (`guarantorType` + 3 subs), landlord (include + 7 subs), tenant (include + 8 subs), jointObligors[] (per-instance with sourceId), avals[] (same).
- `PolicyRenewInputSchema` — wraps selection + sourcePolicyId + startDate + endDate.

**Renewal service** (`src/lib/services/policyService/renewal.ts`, ~640 lines):

Flow:
1. Load source policy with all nested data (primary landlord + tenant + JOs +
   avals, each with addressDetails, documents, references; + propertyDetails +
   actorInvestigations).
2. Validate status ∈ {ACTIVE, EXPIRED} (overwrites existing `renewedToId` if present — per product decision).
3. `prisma.$transaction` ({ maxWait: 10000, timeout: 60000 }):
   - `duplicateAddress()` helper for every referenced `PropertyAddress` FK
     (all such FKs are `@unique`, so rows cannot be shared).
   - Create `Policy` row with nested primary landlord + tenant using
     sub-checkbox-filtered field picks. `verificationStatus=PENDING`,
     `informationComplete=false` on every actor.
   - Create JO and Aval rows individually (needed for per-instance IDs).
     Track source→new ID maps for subsequent reference/document/investigation
     creation.
   - Create `PropertyDetails` with new address FKs + service/feature flags
     filtered by sub-checkboxes.
   - Duplicate `PersonalReference` + `CommercialReference` rows for each
     actor whose references sub-group is on.
   - `tx.actorInvestigation.updateMany` to archive prior investigations with
     `status=ARCHIVED, archiveReason=SUPERSEDED, archiveComment='Replaced by renewal {policyNumber}'`, clearing broker/landlord tokens.
   - Create fresh `PENDING` investigations for tenant, each JO, each aval.
   - `tx.policy.update` to set `source.renewedToId = newPolicy.id`.
4. Post-commit:
   - S3 `copyObject` per document (new key via
     `documentService.generateActorS3Key`), then create `ActorDocument` row
     with reset verification fields. Failures counted, not fatal.
   - `generatePolicyActorTokens(newPolicy.id)` — rotates tokens for all new
     actors.
   - Two `PolicyActivity` log entries: `created` on new (with
     `renewedFromId/renewedFromNumber/documentsCopied/documentsFailed`) and
     `renewed` on old.
5. Returns `{ newPolicyId, newPolicyNumber, documentsCopied, documentsFailed }`.

**tRPC** (`src/server/routers/policy.router.ts`):
- `policy.renew` mutation. Role gate: throws `FORBIDDEN` for BROKER. Calls
  `clonePolicyForRenewal` with `initiatedById = ctx.userId`.

**Reminder filter widening**:
- `policyExpirationReminderService.ts` and `policyQuarterlyFollowupService.ts`
  where clauses changed from `renewedToId: null` to
  `{ OR: [{ renewedToId: null }, { renewedTo: { status: CANCELLED } }] }`.
  Cancelled drafts no longer orphan their source policy.

**i18n** (`src/lib/i18n/pages/policyRenewal.ts`):
- ~70 keys covering CTA, page title/subtitle, step labels, intro,
  confirm-requirement callout, date labels, policy-terms warning, guarantor
  options, every sub-group label across all six entity types, placeholder
  cards, card controls (include/select all/clear), preview badges, buttons
  ("Siguiente", "Volver a editar", "Confirmar y crear renovación"), toast
  messages, validation errors. Registered in `pages/index.ts`.

**UI** (`src/components/policies/renewal/`):
- `SectionCard.tsx` — reusable generic: card shell + optional top-level
  include toggle + `selectAll/clearAll` controls + 2-column grid of
  sub-checkboxes. Disables sub-checkboxes when the top include is off.
- `PolicyTermsCard.tsx` — special prominent variant (border-2 + accent color +
  shadow-md). Contains the `Select` for `guarantorType` with helper-text
  explaining that it toggles JO/Aval visibility. Three financial sub-checkboxes.
- `RenewalSelector.tsx` — step 1. Renders the intro, confirmRequirement
  callout, date inputs (start/end, validated: endDate > startDate), the
  Policy Terms card, Property card, Landlord card, Tenant card (if source has
  one), JO cards (per instance, only when guarantorType ∈ {JOINT_OBLIGOR,
  BOTH}), Aval cards (per instance, only when ∈ {AVAL, BOTH}). Placeholder
  card shown when the selected guarantorType requires an actor type but the
  source has none.
- `RenewalPreview.tsx` — step 2. Read-only diff grouped by card; each sub-group
  renders a row with label + `Se copia`/`No copiado` Badge. Dates rendered via
  `formatDateLong`. Document counts annotated on the row label.
- `RenewalFlow.tsx` — wraps the two steps + state management. Owns selection
  state (defaulted to "all on" from source summary), startDate (today),
  endDate (today + 1 year), step index. Validates dates before advancing.
  Uses `trpc.policy.renew.useMutation()`; on success toast + redirect to
  `/dashboard/policies/{newId}`. Uses project's `useToast` hook (not sonner).
- `types.ts` — `RenewalSourceSummary` shape (minimal server-fetched summary
  passed down from the page).

**Page route** (`src/app/dashboard/policies/[id]/renew/page.tsx`):
- Client component using `trpc.policy.getById` + `useSession`.
- Client-side guards: redirect to policy detail if not ADMIN/STAFF, if not
  ACTIVE/EXPIRED, or if already `renewedToId`.
- Builds `RenewalSourceSummary` from the fetched policy (landlord display name,
  tenant display name, per-JO/Aval name, document + reference counts) and
  passes to `<RenewalFlow>`.

**CTA** (`src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx`):
- New `DropdownMenuItem` with `RefreshCw` icon, placed immediately after the
  "Descargar Carátula" item.
- Guard: `isStaffOrAdmin && (status === 'ACTIVE' || status === 'EXPIRED') && !renewedToId`.
- Navigates to `/dashboard/policies/{policyId}/renew`.
- `PolicyDetailsContent.tsx` threads `policy.renewedToId` through to the header.

**7 commits** (ordered by dependency):
1. `feat(storage): add copyObject to StorageProvider`
2. `feat(policy): add clone-for-renewal service + selection schema`
3. `feat(policy): add renew tRPC procedure`
4. `feat(email): resume reminders when renewal target is cancelled`
5. `feat(policy): add i18n strings for renewal flow`
6. `feat(policy): add renewal clone UI (/renew route)`
7. `feat(policy): add Renovar CTA to policy header dropdown`

---

### Issues encountered & solutions

1. **Deferred-tool schema mismatch**: initial `AskUserQuestion` /
   `ExitPlanMode` / `TaskCreate` tools had no visible schema and failed on
   first call. Resolved via `ToolSearch` with `select:<names>` to load the
   schemas before invocation.
2. **LocalStorageProvider.upload signature drift**: pre-existing mismatch
   (interface takes `isPrivate` param, local impl doesn't). Left alone; out of
   scope. `copyObject` added cleanly to both providers.
3. **`GuarantorType` import path**: Prisma client is generated to
   `src/prisma/generated/prisma-client/`, enums as `const`-objects (not TS
   enums). `z.nativeEnum` handles both, so schema works.
4. **`emailService.ts` split across multiple commits**: the service file
   accumulates a section per new send-function. To keep commits cleanly
   scoped ("migrate inline HTML" vs "add expiration" vs "add quarterly"), the
   affected sections were temporarily removed, committed, and then re-added
   in subsequent commits — ended up as the final intended state with each
   commit carrying only its own section diff.
5. **Stray plan file**: `Write` to `/Users/neto/.claude/plans/` wrote the
   renewal plan inside the repo root at `policy-renewal-clone-feature.md`
   instead (likely working-dir interaction). Moved to the canonical
   `~/.claude/plans/` location after detection; repo root left clean.
6. **Document carryover strategy**: considered running S3 `CopyObject` inside
   the DB transaction for atomicity vs outside for performance. Chose
   post-commit with per-document best-effort + counters (failures don't roll
   back the renewal; admin can retry uploads in the actor portal). Tokens
   and activity logs also post-commit.
7. **Toast library**: project uses `@/hooks/use-toast` (shadcn toast), not
   `sonner`. Fixed `RenewalFlow.tsx` import on first build pass.

### Verification
- `bun run build` — clean at every commit boundary. Final route table
  includes `/dashboard/policies/[id]/renew` (5.07 kB), new cron routes for
  `policy-expiration-reminder` and `policy-quarterly-followup`, and all 34
  static pages generate.
- Plans archived at:
  - `/Users/neto/.claude/plans/let-s-do-an-audit-purring-hopcroft.md`
  - `/Users/neto/.claude/plans/policy-renewal-clone-feature.md`

### Follow-ups for the user
- Run `bunx prisma migrate deploy` to apply the `renewedToId` migration on the
  target database.
- Confirm `NEXT_PUBLIC_WHATSAPP_NUMBER` is set in prod env so the mailto +
  WhatsApp CTA combo renders correctly.
- Optional: cost-preview on the renewal step 2 (investigation fee + package ×
  percentages) — flagged as nice-to-have in the plan.
- Optional: wire the `ActorRejectionEmail` template (currently defined but not
  called anywhere).

---

## Session End - 2026-04-18 13:03

**Duration:** ~18 minutes of in-session record-keeping, capturing ~multiple hours of prior implementation delivered across two feature streams (both committed before the session file was created; session documented retroactively).

### Git summary

**Commits made during the span documented by this session:** 13 total
- **Stream 1 — Email (6 commits)** — already merged to master via `release/2.9.0` (merge `e8fc564`):
  1. `feat(email): add shared template components`
  2. `refactor(email): adopt shared components in existing templates`
  3. `feat(email): migrate inline-HTML notifications to templates`
  4. `feat(db): add Policy.renewedToId self-relation`
  5. `feat(email): add 5-tier policy expiration reminder cron`
  6. `feat(email): add quarterly follow-up cron for active policies`
- **Stream 2 — Policy renewal/clone (7 commits)** — on current branch `remainers-mails`:
  1. `7f753af feat(storage): add copyObject to StorageProvider`
  2. `2fb7c01 feat(policy): add clone-for-renewal service + selection schema`
  3. `dff32ff feat(policy): add renew tRPC procedure`
  4. `6a647de feat(email): resume reminders when renewal target is cancelled`
  5. `94bc3b6 feat(policy): add i18n strings for renewal flow`
  6. `f8ccfb4 feat(policy): add renewal clone UI (/renew route)`
  7. `34b8e32 feat(policy): add Renovar CTA to policy header dropdown`

**Renewal stream diffstat** (19 files, +2267/-2, `7f753af^..34b8e32`):

| Path | Change | Lines |
|---|---|---|
| `src/lib/storage/types.ts` | modified | +7 |
| `src/lib/storage/providers/s3.ts` | modified | +17 |
| `src/lib/storage/providers/local.ts` | modified | +18 |
| `src/lib/schemas/policy/renewalSelection.ts` | added | +102 |
| `src/lib/services/policyService/renewal.ts` | added | +874 |
| `src/server/routers/policy.router.ts` | modified | +29 |
| `src/services/policyExpirationReminderService.ts` | modified | +7/-1 |
| `src/services/policyQuarterlyFollowupService.ts` | modified | +6/-1 |
| `src/lib/i18n/pages/policyRenewal.ts` | added | +131 |
| `src/lib/i18n/pages/index.ts` | modified | +2 |
| `src/app/dashboard/policies/[id]/renew/page.tsx` | added | +123 |
| `src/components/policies/renewal/SectionCard.tsx` | added | +126 |
| `src/components/policies/renewal/PolicyTermsCard.tsx` | added | +88 |
| `src/components/policies/renewal/RenewalSelector.tsx` | added | +258 |
| `src/components/policies/renewal/RenewalPreview.tsx` | added | +183 |
| `src/components/policies/renewal/RenewalFlow.tsx` | added | +253 |
| `src/components/policies/renewal/types.ts` | added | +30 |
| `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx` | modified | +14 |
| `src/components/policies/PolicyDetailsContent/PolicyDetailsContent.tsx` | modified | +1 |

**Final git status** (clean aside from session-tracking files):
```
 M .claude/sessions/.current-session
 M CLAUDE.md                                          (user-edited outside this session)
?? .claude/sessions/2026-04-18-1245-reminder-emails-and-policy-renewal.md
```

Branch tip: `e8fc564` (merge of release/2.9.0 into remainers-mails).

### Todo summary
- Tasks created for the renewal implementation: 10 (`#11`–`#20`).
- Completed: **10 / 10**. Final list cleared.
- Completed tasks:
  1. Add copyObject to storage layer
  2. Create renewal selection Zod schema
  3. Build policy renewal service
  4. Add renew tRPC procedure
  5. Widen reminder cron filters
  6. Add i18n strings for renewal
  7. Build RenewalFlow UI components
  8. Add /renew page route
  9. Add Renovar CTA to policy header dropdown
  10. Build + fix type errors
- No incomplete tasks.

### Key accomplishments

**Reminder-email side:**
1. Full audit of all 22 outbound emails produced an inventory organized by
   trigger type, recipient, template, and delivery path.
2. Shared `src/templates/email/components/` library eliminated ~2750 lines of
   duplicated header/footer/button/alert JSX across all 18 pre-existing
   templates; props interfaces kept intact so no caller changes required.
3. All four inline-HTML notifications migrated to proper React Email
   templates; the one exception (`sendPolicyExpiryNotification`) was deleted
   because its behavior is now covered by the new 1-day-before reminder.
4. New `Policy.renewedToId` self-relation unlocks renewal-aware filtering for
   reminder crons and tracks lineage between original and renewed policies.
5. Two new Vercel crons added: pre-expiration reminder (5 tiers: 60/45/30/14/1
   days, copy varies per tier, tier 1 urgent and broadcast to broker+admins)
   and quarterly service follow-up (90-day cooldown, COMPANY-aware greeting,
   legal-rep-addressed).

**Policy-renewal side:**
1. Interview-driven design — 11 `AskUserQuestion` rounds resolved every
   branch of the decision tree (recipient policy, UX shape, granularity,
   docs, investigations, lifecycle, permissions, multi-actor, cancellation,
   UX flow, banking/fiscal split, reminder filter behavior) before a single
   line of code was written.
2. Storage layer now supports server-side object copy — S3 uses
   `CopyObjectCommand` (no download/re-upload), local does an in-memory
   buffer clone.
3. `clonePolicyForRenewal` service does everything atomically: duplicates
   `PropertyAddress` rows (required by schema's `@unique` FKs), creates new
   actors with sub-checkbox-filtered fields, copies references, archives old
   investigations as `SUPERSEDED`, creates fresh `PENDING` ones, and sets
   `renewedToId` inside a transaction. Post-commit handles S3 copies,
   token rotation, and activity logs.
4. Dedicated `/renew` page with a two-step flow (selector → preview) plus a
   dropdown CTA in the policy header. Dynamic `guarantorType` select drives
   JO/Aval card visibility.
5. Reminder crons now resume notifications automatically if a renewal draft
   was cancelled, so admins don't have to babysit.

### Features implemented

| Area | Feature | Status |
|---|---|---|
| Email | Shared component library for templates | ✅ shipped |
| Email | 18 existing templates refactored onto shared components | ✅ shipped |
| Email | 4 inline-HTML notifications migrated (3 new templates + 1 deleted) | ✅ shipped |
| Schema | `Policy.renewedToId` self-relation + migration file | ✅ shipped (migration **pending manual apply**) |
| Cron | 5-tier pre-expiration reminder | ✅ shipped |
| Cron | Quarterly follow-up for active policies | ✅ shipped |
| Storage | `copyObject` on StorageProvider interface + S3 + local impl | ✅ shipped |
| Backend | `clonePolicyForRenewal` service | ✅ shipped |
| Backend | `policy.renew` tRPC mutation (ADMIN/STAFF only) | ✅ shipped |
| Crons | Widen filter to resume when renewal is CANCELLED | ✅ shipped |
| i18n | `policyRenewal.ts` pack | ✅ shipped |
| UI | `/renew` two-step flow (selector + preview) | ✅ shipped |
| UI | "Renovar" dropdown item in policy header | ✅ shipped |

### Problems encountered and solutions

1. **Deferred tool schemas not loaded** — `AskUserQuestion`, `ExitPlanMode`,
   `TaskCreate`, etc. arrived without visible schemas; direct calls returned
   `InputValidationError`. **Fix:** `ToolSearch` with `select:<tool names>`
   fetched the JSONSchema blocks on demand.
2. **Prisma client path / TransactionClient typing** — client is generated to
   a custom `src/prisma/generated/prisma-client/` path; `Prisma.TransactionClient`
   isn't re-exported. **Fix:** inferred the tx type from
   `Parameters<Parameters<typeof prisma.$transaction>[0]>[0]` rather than
   importing a type.
3. **`GuarantorType` is a `const`-object, not a TS enum** — `z.nativeEnum`
   works with both, so no code change needed; confirmed the import path
   `@/prisma/generated/prisma-client/enums` resolves correctly.
4. **LocalStorageProvider signature drift** — its `upload()` signature was
   already out of sync with the interface. Left alone; out of scope.
   `copyObject` added cleanly to both providers.
5. **Commit-splitting discipline for `emailService.ts`** — the service
   accumulates a section per send-function. To keep commits scoped
   (inline-HTML migration vs expiration reminder vs quarterly follow-up),
   temporarily removed later sections, committed, and re-added them in the
   next commit. End state correct; intermediate commits only carry their
   own diff.
6. **Stray plan file written to repo root** — `Write` to
   `/Users/neto/.claude/plans/policy-renewal-clone-feature.md` landed in the
   repo root (likely working-dir interaction). **Fix:** moved to the
   canonical `~/.claude/plans/` location post-implementation.
7. **S3 copy inside or outside the DB transaction** — chose post-commit
   best-effort with `documentsCopied` / `documentsFailed` counters. Keeps
   transaction tight; S3 failures are logged but don't roll back the
   renewal. Admin or actor can re-upload via normal flow.
8. **Toast library mismatch** — initial UI imported `sonner`; project uses
   `@/hooks/use-toast` (shadcn toast). **Fix:** swapped import and adjusted
   `toast({...})` call shape.

### Breaking changes / important findings
- **`sendPolicyExpiryNotification` deleted** — callers who depended on the
  post-expiration broadcast need to be aware the new 1-day-before tier now
  covers that use case (and is sent to landlord + broker + admins). The
  status flip itself still happens in `expireActivePolicies`.
- **Migration pending** — `prisma/migrations/20260417000000_add_policy_renewed_to_id/migration.sql` **must be applied manually** with `bunx prisma migrate deploy`. Nothing else in the feature works until the column exists.
- **Schema FK uniqueness matters for renewal** — every actor address FK is
  `@unique`, so the renewal service duplicates `PropertyAddress` rows rather
  than sharing. Same for `ActorDocument.s3Key @unique` — the feature
  intentionally copies S3 objects to new keys.

### Dependencies added/removed
- **None.** All new code uses libs already in `package.json`:
  `@aws-sdk/client-s3` (for `CopyObjectCommand`), `@react-email/*`, `zod`,
  `date-fns`, existing shadcn/Radix UI primitives.

### Configuration changes
- `vercel.json` — 2 new cron entries:
  - `/api/cron/policy-expiration-reminder` — `0 13 * * *`
  - `/api/cron/policy-quarterly-followup` — `30 13 * * *`
- `src/templates/email/README.md` — updated to document components + new templates + cron table.
- `src/lib/i18n/pages/index.ts` — registers the new `policyRenewal` pack.

### Deployment steps taken
- None yet. Code committed on `remainers-mails` branch; waiting on the user to:
  1. Apply migration (`bunx prisma migrate deploy`).
  2. Ensure `NEXT_PUBLIC_WHATSAPP_NUMBER` is set in production.
  3. Merge branch → release → deploy.

### Lessons learned
- **Interview-driven plans before code pay off.** For the renewal feature,
  11 structured `AskUserQuestion` rounds up front meant the implementation
  had zero re-work. Each question was chosen to unblock the next dependent
  decision (UX model → granularity → documents → investigations →
  lifecycle → permissions → multi-actor → draft fate → flow integration →
  receipts/fees → sub-group taxonomy → reminder filter).
- **Explore before ask.** Anything the codebase could answer (e.g., "does
  `copyObject` exist? where does the cover-letter item live in the
  dropdown?") got an Explore agent instead of a user question.
- **Commit by concern works well for large features.** The 13 commits
  across the two streams each stay reviewable (7 files max), preserve
  dependency order, and stack cleanly. Temporarily reverting shared-file
  sections between commits (`emailService.ts`) is a small cost for much
  cleaner history.
- **Parallel Explore agents save serial latency.** Initial scoping of the
  email audit fired 3 agents in one message to cover trigger/service/template
  layers at once.
- **Post-commit side-effects (S3, tokens, logs) > inside-transaction ones.**
  Keeps DB locks short and side-effects idempotent at the cost of explicit
  failure counters and retry paths. Works well here because the recovery
  story is "admin re-uploads" or "ask actor via portal".
- **Filenames matter.** The project's `.claude/sessions/` convention names
  files after the actual work — a mid-session rename from a generic filename
  to `reminder-emails-and-policy-renewal` made the artifact much easier to
  find later.

### What wasn't completed
- **Cost preview on step 2** (investigation fee + package × percentages) —
  flagged in the plan as a nice-to-have, not shipped.
- **`ActorRejectionEmail` wiring** — template exists, still no caller. Left
  as-is per user direction ("leave as it is for now") with a note in
  `src/templates/email/README.md`.
- **Migration apply** — schema change landed in the repo; running
  `prisma migrate deploy` is the user's call.
- **End-to-end test** — no browser-based verification of the renewal flow
  yet. `bun run build` passes; route compiles; type-checks pass. Manual UI
  testing pending.

### Tips for future developers

- **To extend the clone selector with new sub-groups**: add the field to
  `PolicyRenewalSelectionSchema` (Zod), the UI sub checkbox list in
  `RenewalSelector.tsx`, the matching "Se copia / No copiado" row in
  `RenewalPreview.tsx`, an i18n key in `policyRenewal.ts`, and the gating
  condition inside `clonePolicyForRenewal`. The five places are wired
  consistently — grep for an existing sub-group key (e.g. `banking`) and
  mirror it.
- **To add a new actor type to the renewal flow**: mirror the JO/Aval
  shape in `RenewalFlow.defaultSelection`, the card rendering in
  `RenewalSelector.tsx` (with show/hide gating), and the inner
  `tx.${model}.create({...})` + document/reference copy loops inside
  `clonePolicyForRenewal`.
- **Rent-bump auto-computation**: the plan considered auto-applying
  `rentIncreasePercentage` at clone time but landed on "admin adjusts in
  the wizard after redirect". To change that, update the Financial section
  of `clonePolicyForRenewal` to multiply `rentAmount` by
  `(1 + rentIncreasePercentage/100)` when the `financial` checkbox is on,
  and add an i18n hint on the Policy Terms card.
- **S3 copy key convention**: uses `documentService.generateActorS3Key`
  with the NEW policyNumber and NEW actor id, producing
  `policies/{policyNumber}/{actorType}/{actorId}/{uuid}-{filename}`. Easy
  to audit an actor's document lineage by listing that prefix.
- **Reminder-filter pattern**: the `OR: [{ renewedToId: null }, { renewedTo: { status: 'CANCELLED' } }]` idiom should be reused by any future cron that should skip renewed policies but recover on cancellation. Consider extracting into a shared helper if a third such cron appears.
- **Renewal activity log keys**: `action: 'renewed'` on the old policy and
  `action: 'created'` on the new one, with `details.renewedFromId` /
  `renewedToId`. Any analytics or audit dashboards should pick these up.
- **Investigation archival reason** is `SUPERSEDED` — consistent with
  `tenantReplacement.ts`; filter on that to distinguish renewal-archived
  vs other archives.

---

_Session documented. Tip: to re-open this session's context in a future
conversation, read this file directly; it is self-contained._
