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
