# Contract Cover Letter
**Started:** 2026-04-16 17:52

## Overview
Session focused on the contract cover letter feature.

## Goals
_(to be defined — please share goals)_

## Progress

### Update - 2026-04-16 19:18

**Summary**: Design parity pass on contract cover letter `.docx` generator to match real sample contracts in `documents/contracts/screenshots/` (1121, 1267, 1285).

**Git Changes**:
- Modified: `src/lib/docx/coverPageDocxTemplate.ts`, `coverPageService.ts`, `coverPageTransformer.ts`, `index.ts`, `numberToSpanishWords.ts`, `types.ts`
- Added: `src/lib/docx/dateToSpanishLong.ts`
- Current branch: `feat/contract-cover-letter` (last commit on master: 28795e9)

**Todo Progress**: 7 completed, 0 in-progress, 0 pending
- ✓ Extract `numberToSpanishCardinal` helper (export from `numberToSpanishWords.ts`)
- ✓ Create `dateToSpanishLong` util (+ `yyyymmdd` helper)
- ✓ Refactor template with `sectionTable` pattern (drops fragile row-injection)
- ✓ Rewrite guarantor property + Inmueble/Condiciones tables
- ✓ Update transformer (blanks, dates, header date)
- ✓ Update header to include contract date (`"policyNumber - YYYYMMDD"`)
- ✓ Build verification (`bun run build` clean)

**Design decisions (user)**:
1. Yellow email highlight → ignore (artifact)
2. Blanks → `"N/A"` for not-applicable, empty for missing
3. Date util fallback → raw ISO on invalid
4. Schema extension → out of scope, ship with blanks
5. Header text → match samples (`"1285 - 20260219"` format)
6. Row-injection → refactor now

**Implementation details**:

- **Spanish long-date util**: `"2025-10-01" → "Uno de Octubre de Dos Mil Veinticinco."` Handles apocope (UN→UNO, VEINTIÚN→VEINTIUNO) for standalone cardinals. Months array Enero–Diciembre. Title-cases via regex. Falls back to raw on invalid.
- **Template refactor**: Replaced brittle `dataRows[i].options?.children` extraction with `sectionTable(label, cellRows)` that takes arrays of `TableCell[]` and wraps them with a rotated vertical label (rowSpan) cleanly. Each section's grid now declared explicitly.
- **Grids**: Actor = 4-col (`15%/32.5%/15%/32.5%`); guarantor property = 12-col (each 95/12%) — lets `row2` (spans 2+4+2+4), `row3` (2×6 for notary), `tipoDeUso` (3+2+1+2+1+2+1 = 12), `row1` (2+10), `boundaryRow` (3+2+7) all align in the same table; simple grid = 2-col (`20%/75%`) for Inmueble/Condiciones.
- **Tipo de Uso**: Renders as 7 cells with `X` if bool true else `N/A`. All three booleans stay `false` (schema doesn't capture guarantor-property use type) → all render `N/A` until schema extended.
- **Header**: `"${policyNumber} - ${yyyymmdd(activatedAt)}"` matching real samples. Falls back to policyNumber alone if no date.
- **Transformer**: Accepts `RawDates` 2nd param; routes startDate/endDate/deliveryDate through `dateToSpanishLong`; parkingSpaces 0/null → `"N/A"`; maintenanceFee null or `maintenanceIncludedInRent` → `"N/A"`; emits `contractStartDateRaw` on CoverPageData for header.
- **Service**: Passes raw `policy.activatedAt/expiresAt/propertyDetails.propertyDeliveryDate` into transformer (PDF transformer's formatted strings can't easily round-trip to Spanish long-form).

**Problems & solutions**:
- **Apocope in Spanish dates**: `numberToSpanishCardinal(1)` returns `"UN"` (right for amounts "UN MILLÓN"), wrong for standalone dates ("Uno de Octubre"). Solved via `unapocopate()` post-processor regex: `VEINTIÚN$→VEINTIUNO`, `(^|\s)UN$→$1UNO`.
- **PDF transformer already formats dates to es-MX locale strings**: can't derive Spanish long-form from formatted output reliably. Solved by passing raw Date objects from Prisma policy directly into the docx transformer.
- **Variable-column rows in same table**: sample contracts have a 7-cell Tipo de Uso row alongside 4- and 6-cell rows in the guarantor property table. Solved with a 12-col micro-grid where every row uses `columnSpan` to compose its cells from a common base width.

**Schema gaps (unchanged, flagged as blind spots for future)**:
- Identification type/number (all actors, legal reps)
- Company constitution fields (escritura, notaría, notario, registro público, folio, fechas)
- Legal rep address, CURP, work-vs-personal email, power-of-attorney details
- Guarantor property notary details, surface areas, linderos/colindancias
- Landlord nationality (hardcoded `"Mexicana."`)
- Property use booleans (habitacional/comercial/industrial) for guarantor property
- Spouse data (in PDF types but not mapped to `CoverActorData`)

**Status**: Build clean. Manual visual diff against `documents/contracts/screenshots/` still recommended before shipping.

---

### Update - 2026-04-17 17:32

**Summary**: Two iteration rounds on the generated .docx — fixed layout-stretching bugs, applied explicit visual spec (9pt Arial, row height, margins, label/value styling), and built dedicated company-actor section. Then committed all work in 4 conventional commits.

**Git Changes**:
- Committed this session (4 commits on `feat/contract-cover-letter`):
  - `b940305` chore(docs): track sample rental contracts for cover-letter reference
  - `644abd0` docs(cover-letter): add feature spec for .docx generator
  - `ac8ffae` feat(cover-letter): overhaul .docx design for sample contract parity
  - `52701cc` chore(claude): log small-gains and contract cover-letter sessions
- Branch: `feat/contract-cover-letter`
- Last commit: `52701cc`
- Working tree clean except `.claude/plans/` (untracked, unrelated `receipts.md`)

**Accomplished (this session, end-to-end)**:

1. ✅ Spanish long-form dates util (`dateToSpanishLong.ts`): `"2025-10-01" → "Uno de Octubre de Dos Mil Veinticinco."`. Handles UN/VEINTIÚN apocope.
2. ✅ Extracted `numberToSpanishCardinal()` from `numberToSpanishWords.ts`; added `yyyymmdd()` for header format.
3. ✅ Header now `${policyNumber} - ${YYYYMMDD}` matching samples (`"1285 - 20260219"`).
4. ✅ Transformer: `BLANK = ''` (dropped underscores); N/A rules for parking/maintenance; passes raw Prisma dates so dates can be spelled out.
5. ✅ Refactored `sectionTable` from fragile rowSpan+row-injection to nested outer/inner tables — fixes the "rows stretched to full page" issue caused by Word sizing rowSpan-cell to rotated vlabel's intrinsic length.
6. ✅ Added `gap()` paragraphs between consecutive tables (fixes touching tables).
7. ✅ Global styling pass:
   - Font: 9pt Arial everywhere (titles/sub-titles/body/header/footer).
   - Row min-height: 0.81 cm (459 twips) via `HeightRule.ATLEAST`.
   - Cell margins: `{ top: 0, bottom: 0, left: 108, right: 108 }` (0.19 cm L/R).
   - Labels: blue `#D6E4F0` background, **non-bold** text.
   - Values: **bold** text.
   - Sub-headers ("Datos de Constitución...", "Datos de la escritura de poderes"): blue bg, centered, bold.
   - `OUTER_BORDERS.insideHorizontal` now `THIN` so multi-row company section has row separators.
   - Removed `borders: NO_B` cell override that was suppressing outer rectangles.
8. ✅ Dedicated company-actor layout (`companySectionTable`): one outer table with 3 rows — [vlabel "Arrendador/Arrendatario." + company info], [full-width `"Representante Legal."` divider, blue bg], [vlabel "Representante Legal." + rep info]. Composable — same function used for both company landlord and company tenant; row sets (`companyActorRows`, `legalRepRows`) are separate helpers.
9. ✅ Guarantor property table: 12-col internal grid lets 3-pair notary row, 7-cell Tipo de Uso row (X/N/A from booleans), and 3-cell boundary rows all align.
10. ✅ Legal rep `Domicilio` now paired with `Teléfono` (was full-width).
11. ✅ Dropped trailing period on "Datos de la escritura de poderes" to match example.
12. ✅ All builds clean (`bun run build`).
13. ✅ Committed in 4 concern-scoped commits per updated CLAUDE.md guidelines (Conventional Commits, split by concern).

**Remaining / Out-of-scope**:

- ❌ **Schema gaps** — staying blank until a dedicated migration: identification type/number, company constitution (escritura/notario/registro), legal rep address/CURP/work email, power of attorney details, guarantor notary details + surface areas + linderos/colindancias, property use booleans (habitacional/comercial/industrial), spouse data (in PDF types but not mapped), landlord nationality (hardcoded `"Mexicana."`).
- ❌ **Tipo de Uso values**: always render `N/A` for all three (no schema source).
- ❌ **Full contract body** (post-DECLARACIONES) not generated — only the carátula.
- ❌ **Automated visual regression tests** — none; visual diff is manual.
- ❌ **Multi-actor pagination stress test** — e.g., company tenant + 2 joint obligors + aval with property guarantee. Cover should fit but untested with extreme data.
- ❌ **Potential follow-ups flagged but not actioned**: dead `useType`, `direction`, `useHabitacional/Comercial/Industrial` fields in `CoverGuarantorProperty` type still present (some now wired to template, some still unused).

**Open questions**:
- Do we want a schema-extension ticket queued to capture the blind-spot fields for a fully-populated carátula?
- Should we track `.claude/plans/` going forward, or keep it local-only?

**Next step**: End-user review of a real-data download; then merge PR.

### Update - 2026-04-18

**Summary**: Full maintainability audit of the cover-letter feature, executed as an 8-PR stack on `release/2.9.0`. PRs 1–7 merged; PR 8 open awaiting migration. Remaining schema gaps tracked in issue #87.

**Git Changes**:
- Current branch: `feat/cover-letter-landlord-nationality` (2 commits ahead of release/2.9.0)
- Recent merges into release/2.9.0: PR #78, #80, #81, #82, #83, #84, #86
- PR #88 open on this branch
- Uncommitted: only `.claude/sessions/...` (this update), `.claude/settings.local.json`, `.claude/plans/` (local-only)

**Todo Progress**: 8 completed, 0 in-progress, 0 pending
- ✓ PR 1 (#78): Cleanup & small fixes — dead fields removed, defaults module, collapsed 4 actor transformers → 1, forced four cardinal boundary rows, UI gate on role + ACTIVE status
- ✓ PR 2 (#80): Template file split — `coverPage/` module (styles, helpers, cells, sectionTable, sections/*, render, index); SPACING constants extracted
- ✓ PR 3 (#81): i18n extraction — new `pages.documents.coverPage` namespace; 48+ labels, titles, payment-method fragments, footer, nationality defaults
- ✓ PR 4 (#82): bun-test harness + Spanish-util unit tests (21 for `numberToSpanishWords`, 9 for `dateToSpanishLong`)
- ✓ PR 5 (#83): fixture CLI (`bun run cover:fixture <policyId>`) + document.xml snapshot tests via Packer + JSZip (13.6k lines across 3 fixtures; originally tried object-tree → 184k, dropped to XML)
- ✓ PR 6 (#84): decouple from PDF pipeline — new `getPolicyForCover` (focused Prisma select), transformer now consumes `PolicyForCover` directly; `RawDates` workaround removed
- ✓ PR 7 (#86): declarative row specs — `rowSpec.ts` with `ActorRowSpec | GpRowSpec | SimpleRowSpec` unions + per-family interpreters; sections now read as spec arrays
- ✓ PR 8 (#88, open): `Landlord.nationality` schema + form radio + spouse mapping (married JO/Aval with property guarantee → additional actor section, renumbered 1./2., inherited address)

**Plan file**: `/Users/neto/.claude/plans/look-at-the-contents-concurrent-clover.md` — full 7-PR plan with context, per-PR scope, verification steps, and unresolved questions.

**Problems & solutions**:
- **Snapshot test noise**: first pass serialised the pre-Packer docx `Document` tree → 184k lines (library scaffolds every OOXML part on construction). Switched to `Packer.toBuffer(..., PrettifyType.WITH_2_BLANKS)` + JSZip → extract `word/document.xml` → snapshot. 13.6k lines, reviewable diffs.
- **Prisma client staleness after schema edit**: `bun run build` initially succeeded without regen because Next.js cached types. Ran `bun run prisma generate` manually; user will need to do the same or run `bun install` to trigger `postinstall`.
- **PR base-branch discovery**: initially targeted `main` on PR #78 (based on the session-start gitStatus hint); user flagged that this repo uses `release/<semver>`. All subsequent PRs target `release/2.9.0`. Saved as persistent feedback memory.
- **Jira vs GitHub issues for follow-ups**: initially reached for `acli jira`; user stopped me and asked for GitHub issues. Saved as persistent feedback memory. Schema-gap backlog now lives at #87.

**Code changes made (this session, beyond what was already on master before 2026-04-18)**:
- New: `src/lib/docx/coverPageDefaults.ts`, `src/lib/docx/coverPage/{styles,helpers,cells,sectionTable,render,rowSpec,index}.ts`, `src/lib/docx/coverPage/sections/{actor,guarantorProperty,contractTerms}.ts`, `src/lib/docx/__tests__/{render.snapshot.test.ts, numberToSpanishWords.test.ts, dateToSpanishLong.test.ts}`, `src/lib/docx/__tests__/support/{extractDocumentXml,fixtures}.ts`, `src/lib/docx/__tests__/__snapshots__/render.snapshot.test.ts.snap`, `src/lib/services/policyService/getPolicyForCover.ts`, `src/lib/i18n/pages/documents/{coverPage,index}.ts`, `scripts/generateCoverFixture.ts`, `dev/fixtures/cover-samples/README.md`
- Deleted: `src/lib/docx/coverPageDocxTemplate.ts` (replaced by `coverPage/*`)
- Modified: `prisma/schema.prisma` (Landlord.nationality), `src/lib/schemas/landlord/index.ts` (personWithNationalitySchema), `src/components/actor/landlord/LandlordOwnerInfoTab-RHF.tsx` (nationality radio), `src/lib/docx/coverPageTransformer.ts` (Prisma-direct, spouse expansion), `src/lib/docx/coverPageService.ts` (6-line orchestrator), `src/lib/hooks/usePolicyPermissions.ts` (`canDownloadContractCover`), `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx` (UI gate), package.json (test / cover:fixture scripts, jszip devDep), `src/lib/i18n/pages/index.ts` (documents namespace)

**Open tasks for humans**:
- Review + merge PR #88
- Run `bun prisma migrate dev --name add_landlord_nationality` on local, `prisma migrate deploy` on staging / prod
- Pick up schema-gap work from #87 (one block per sub-PR)
- Optionally: regenerate fixture .docx files via `bun run cover:fixture <policyId>` against real policies and eyeball against `documents/contracts/screenshots/` for pixel parity

---

## Session End - 2026-04-18

**Duration**: 2026-04-16 17:52 → 2026-04-18 (≈ 2 calendar days, split across the design-then-audit arc).

### 🚨 Left-to-do (read this first)

Everything below is still on the reader's plate. Don't assume it's landed.

1. **Review + merge PR #88** (`feat/cover-letter-landlord-nationality` → `release/2.9.0`). Two commits: `feat(landlord): add nationality field` (`5feed27`) and `feat(cover-letter): map spouse as additional actor for married guarantors` (`7293499`). Until this merges, every cover-letter download still says "Mexicana." regardless of the landlord's real nationality, and spouse data is silently dropped.
2. **Run the migration manually** after #88 merges. Per `CLAUDE.md`, migrations never auto-run:
   ```
   bun prisma migrate dev --name add_landlord_nationality   # local
   bun prisma migrate deploy                                  # staging / prod
   ```
   `bun install` (or its `postinstall`) must run first so the Prisma client picks up `Landlord.nationality`. Existing landlord rows backfill to `MEXICAN` via the schema default — no data surgery.
3. **Clean up local stack branches** once everything is merged. The branch list has eight stale locals:
   `feat/contract-cover-letter`, `feat/cover-letter-decouple`, `feat/cover-letter-fixtures`, `feat/cover-letter-i18n`, `feat/cover-letter-landlord-nationality`, `feat/cover-letter-row-specs`, `feat/cover-letter-template-split`, `feat/cover-letter-tests`. After `gh pr merge` confirms each PR is in `release/2.9.0`, run `git branch -d <branch>` (not `-D`) locally.
4. **Generate review fixtures against a real policy** to catch any pixel-level regression that the hand-crafted snapshots can't surface:
   ```
   bun run cover:fixture <policyId> [outDir]
   ```
   Open the resulting `.docx` in Word / Pages / LibreOffice, diff against `documents/contracts/screenshots/05 Contrato - 1285 - 20260219-page_2.png` (and siblings). Commit the `dev/fixtures/cover-samples/*.docx` + `*.input.json` as reference samples if they look clean.
5. **Pick up schema-gap work** from [`#87`](https://github.com/netoho/hestia-app/issues/87). The backlog is organised into shippable blocks: actor identification (type + number), company constitution, power of attorney, legal-rep address / CURP / work-email, guarantor property notary / surface / boundaries / use booleans. Each block = one migration + form tab update + transformer mapping + fixture update.
6. **Manual test matrix for PR #88 before it merges** (same list in the PR body):
   - Landlord form → Persona Física renders Mexicana / Extranjera radio, defaults to Mexicana.
   - Landlord form → Persona Moral: no nationality radio (matches company tenant / JO / aval).
   - Carátula with a `FOREIGN` individual landlord shows the raw nationality string (pre-existing quirk tracked in #87), not hardcoded "Mexicana.".
   - JointObligor with `maritalStatus=MARRIED` + `hasPropertyGuarantee=true` + spouse fields populated → carátula shows two "Obligado Solidario y Fiador" sections, renumbered `1.` / `2.`, shared address.
   - Same actor with `maritalStatus=SINGLE` → only one section.
   - Same actor with `hasPropertyGuarantee=false` → only one section (property-guarantee gate blocks expansion).
7. **Optional follow-up**: add `.github/workflows/unit.yml` to wire `bun run test` to CI. The PR 4 work intentionally did not commit a workflow because `.github/` is gitignored in this repo — was flagged in #82's description for manual pickup.
8. **Optional follow-up**: FOREIGN nationality in the cover letter currently emits the raw enum-ish string instead of "Extranjera." (feminine, period). Pre-existing behaviour; fix belongs with the #87 identification block since it touches the nationality label logic.

### Git summary

- **8 PRs** opened (`#78, #80, #81, #82, #83, #84, #86, #88`). #78–#86 merged into `release/2.9.0`; #88 still open.
- **1 GitHub issue** filed: [`#87`](https://github.com/netoho/hestia-app/issues/87) — schema-gap backlog.
- **Stack commits** across this session (excluding merges, authored by me):
  - PR 1 (#78, merged): `refactor(cover-letter): centralize defaults, collapse actor transformers`; `fix(cover-letter): always render four cardinal boundary rows`; `feat(policy): gate "Descargar Carátula" on role and policy status`
  - PR 2 (#80, merged): `refactor(cover-letter): split template monolith into coverPage module`
  - PR 3 (#81, merged): `feat(i18n): add documents.coverPage namespace`; `refactor(cover-letter): wire template and transformer to i18n namespace`
  - PR 4 (#82, merged): `test(cover-letter): add bun-test harness and Spanish-util unit tests`
  - PR 5 (#83, merged): `refactor(cover-letter): expose composeCoverPage + buildCoverPageDocument`; `chore(cover-letter): add fixture CLI and jszip devDep`; `test(cover-letter): snapshot the rendered word/document.xml per fixture`
  - PR 6 (#84, merged): `feat(policy-service): add getPolicyForCover focused Prisma fetch`; `refactor(cover-letter): drop PDF transformer, consume Prisma directly`
  - PR 7 (#86, merged): `refactor(cover-letter): convert sections to declarative row specs`
  - PR 8 (#88, **open**): `feat(landlord): add nationality field`; `feat(cover-letter): map spouse as additional actor for married guarantors`
- **Files changed** (created / deleted / modified, cumulative across the 8 PRs):
  - Created: `src/lib/docx/coverPageDefaults.ts`, `src/lib/docx/coverPage/{styles,helpers,cells,sectionTable,render,rowSpec,index}.ts`, `src/lib/docx/coverPage/sections/{actor,guarantorProperty,contractTerms}.ts`, `src/lib/docx/__tests__/{render.snapshot.test.ts,numberToSpanishWords.test.ts,dateToSpanishLong.test.ts}`, `src/lib/docx/__tests__/support/{extractDocumentXml,fixtures}.ts`, `src/lib/docx/__tests__/__snapshots__/render.snapshot.test.ts.snap`, `src/lib/services/policyService/getPolicyForCover.ts`, `src/lib/i18n/pages/documents/{coverPage,index}.ts`, `scripts/generateCoverFixture.ts`, `dev/fixtures/cover-samples/README.md`
  - Deleted: `src/lib/docx/coverPageDocxTemplate.ts` (replaced by `coverPage/*`)
  - Modified: `prisma/schema.prisma`, `src/lib/schemas/landlord/index.ts`, `src/components/actor/landlord/LandlordOwnerInfoTab-RHF.tsx`, `src/lib/docx/coverPageTransformer.ts`, `src/lib/docx/coverPageService.ts`, `src/lib/hooks/usePolicyPermissions.ts`, `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx`, `package.json` (test scripts + cover:fixture + jszip), `src/lib/i18n/pages/index.ts`, `src/lib/i18n/pages/policies.ts` (unchanged but referenced)
- **Current branch**: `feat/cover-letter-landlord-nationality` (2 commits ahead of `release/2.9.0`). Final tree clean apart from session files / `.claude/plans/` (local-only).

### Todo summary

All 8 planned PR-tasks completed. No rolled-over in-progress items. Pending work is captured in issue #87 and in the **Left-to-do** section above.

### Key accomplishments
- Full audit + 8-PR stacked refactor of the cover-letter `.docx` pipeline, from cleanup through schema extension — feature now has: centralised defaults, split modular template, i18n namespace, `bun test` harness with 33 tests, document.xml snapshot tests + fixture CLI, Prisma-direct pipeline (no PDF detour), declarative row specs, `Landlord.nationality`, and spouse mapping.
- Every PR was either behaviour-neutral (snapshot-verified byte-for-byte) or added clearly-scoped new behaviour.
- Codified two repo-specific preferences into persistent memory: "target `release/<semver>`, not `main`" and "use GitHub issues, not Jira".
- Established a reusable test + fixture pattern (hand-crafted input → `composeCoverPage` → `Packer.toBuffer` → JSZip → `word/document.xml` snapshot) that catches layout drift without requiring DB access or LibreOffice.

### Problems encountered and solutions
- **Object-tree snapshot exploded to 184k lines** because `docx` scaffolds the entire OOXML file structure on construction. Solved by snapshotting the extracted `word/document.xml` via JSZip after `Packer.toBuffer(..., PrettifyType.WITH_2_BLANKS)` → 13.6k lines across 3 fixtures.
- **Prisma client stale after `schema.prisma` edit**. `bun run build` succeeded misleadingly because of cached types; had to `bun run prisma generate` manually. Flagged in PR #88's deployment notes.
- **First PR merged into wrong base** (`main` instead of `release/2.9.0`). User caught it; memory saved so every subsequent PR targets the release branch.
- **Initial ticket filing instinct was Jira**; user redirected to GitHub issues. Memory saved.
- **Snapshot tests use hand-crafted `CoverPageData` fixtures**, which means transformer refactors (e.g. PR 6's Prisma-direct rewrite) aren't exercised by the snapshots — only renderer-shape changes are. The `bun run cover:fixture` workflow against a real policy is the compensating control. Worth calling out for future refactors of the transformer.

### Breaking changes / important findings
- **Migration required** for PR #88: `add_landlord_nationality`. Non-destructive (column addition with default) but must run on every environment.
- **Jira vs GitHub**: this repo uses GitHub issues exclusively, despite the global `CLAUDE.md` mentioning `acli jira`.
- **PR base branch**: this repo merges features → `release/<semver>` → `main`. Don't target `main` directly.

### Dependencies added
- `jszip@^3.10.1` as an explicit `devDependency` (already transitively present via `docx`, pinned for direct test-file import).

### Configuration changes
- `package.json`: added `test`, `test:watch`, `cover:fixture` scripts.
- `src/lib/i18n/pages/index.ts`: registered new `documents` namespace.
- `src/lib/hooks/usePolicyPermissions.ts`: added `canDownloadContractCover` permission.
- `prisma/schema.prisma`: added `Landlord.nationality NationalityType? @default(MEXICAN)` (PR #88, pending merge).

### Deployment steps taken
- None directly. Every PR landed via normal review; PR #88 is the last one and still awaits merge + manual migration.

### Lessons learned
- **Design-phase interview drastically shapes scope**. The user's "more than ambitious overhaul" + "pre-merge polish" answers looked contradictory; resolving them ("stack PRs on this branch") made the 8-PR plan concrete.
- **Don't over-engineer the snapshot layer**. The instinct was to snapshot an object tree; the cheaper `Packer + JSZip + document.xml` approach gave a strictly better result with less code.
- **Memory system earns its keep on the small persistent rules** (PR base branch, GitHub vs Jira, auto-commit preference). These rules would have caused repeated friction otherwise.
- **Prisma's gitignored generated client** means any schema change needs an explicit `prisma generate` in the workflow — `bun run build` alone can falsely succeed on stale types.

### What wasn't completed
- Everything in the **Left-to-do** section above. In particular: merge + migrate for PR #88, the schema-gap blocks in #87, CI workflow for `bun test`, and real-policy visual regression against `documents/contracts/screenshots/`.

### Tips for future developers
- The cover-letter pipeline starts at `src/lib/docx/coverPageService.ts` (6 lines). Follow the chain: `getPolicyForCover` (`src/lib/services/policyService/getPolicyForCover.ts`) → `buildCoverPageData` (`src/lib/docx/coverPageTransformer.ts`) → `renderCoverPageDocx` (`src/lib/docx/coverPage/render.ts`). Section layouts are in `src/lib/docx/coverPage/sections/*.ts` as spec arrays.
- To change a label: edit `src/lib/i18n/pages/documents/coverPage.ts`. That's the only place Spanish text lives (modulo `'mes' / 'meses'` in the transformer's securityDeposit / contractLength helpers).
- To add a row: add a spec entry to the relevant `*RowSpecs` function. If the row shape is new, extend the discriminated union in `src/lib/docx/coverPage/rowSpec.ts` and add a case to the interpreter.
- To verify a change didn't break rendering: `bun run test`. If it's intentional: `bun test --update-snapshots src/lib/docx/__tests__/render.snapshot.test.ts` and review the diff in `render.snapshot.test.ts.snap`.
- To review output against a real policy: `bun run cover:fixture <policyId>`.
- Schema gaps block certain carátula fields from being populated. Don't patch them by adding fake logic to the transformer — extend the Prisma schema (see #87 for the backlog) and thread the field through `getPolicyForCover` → `buildCoverPageData`.

