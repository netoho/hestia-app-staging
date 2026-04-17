# Contract Cover Page (.docx) Generator

## Context
Need to generate Word documents with the "carátula" (cover page) of rental contracts — everything before "DECLARACIONES". The team currently writes these manually. This feature auto-fills all available policy data, leaves blanks for missing fields, and serves as the foundation for full contract generation.

## Architecture

```
src/lib/docx/
├── index.ts                     # Barrel exports
├── types.ts                     # CoverPageData (subset of PDF types)
├── numberToSpanishWords.ts      # "$50,000 → CINCUENTA MIL PESOS 00/100 M.N."
├── coverPageService.ts          # Orchestrator: fetch → transform → render
├── coverPageTransformer.ts      # PDFPolicyData → CoverPageData
├── coverPageDocxTemplate.ts     # docx tables/formatting
└── downloadDocx.ts              # Client-side blob download

src/app/api/policies/[policyId]/contract-cover/
└── route.ts                     # GET endpoint → .docx buffer
```

**Data flow:** API route → `coverPageService` → reuse `getPolicyForPDF()` + `transformPolicyForPDF()` → `coverPageTransformer` (extract cover fields) → `coverPageDocxTemplate` (render .docx)

## Dependency
```
bun add docx
```
`docx` npm package — TypeScript-first, 2M+ weekly downloads, programmatic tables/formatting, works server-side. Better than `docxtemplater` for dynamic content (variable # of guarantors).

## Cover page structure (from sample contracts)

### Section 1: Title
- "CONTRATO DE ARRENDAMIENTO." (centered, bold, large)
- "CARÁTULA." (centered, bold)

### Section 2: PARTES (tables)
Each actor = 1 table with merged first column for label:

**Arrendador table:** Nombre, Nacionalidad, Domicilio, Identificación+Número, RFC, CURP, Email, Teléfono. If company: add constitution data + legal rep.

**Arrendatario table:** Same structure. If company: "Denominación" instead of "Nombre", + constitution + legal rep.

**Obligado Solidario / Aval tables:** Same personal fields. Then separate **Inmueble del Obligado** table: escritura, notario, registro público, uso, dirección, superficies, linderos.

### Section 3: Condiciones del Arrendamiento
- Inmueble: ubicación, cajones, uso
- Renta: amount + amount in words
- Depósito, Plazo, Fecha inicio/término, Fecha entrega, Mantenimiento
- Método de pago (+ bank details if transfer)

### Section 4: Signature block
2-column table with party names and signature lines.

## Files to create/modify

### New files

| File | Purpose |
|------|---------|
| `src/lib/docx/types.ts` | `CoverActorData`, `CoverGuarantorProperty`, `CoverContractTerms`, `CoverPageData` |
| `src/lib/docx/numberToSpanishWords.ts` | Legal Mexican format: `"CINCUENTA MIL PESOS 00/100 M.N."` |
| `src/lib/docx/coverPageTransformer.ts` | Maps `PDFPolicyData` + raw policy → `CoverPageData`. Defaults nationality to "Mexicana" for landlords (not in schema). Leaves missing fields blank. |
| `src/lib/docx/coverPageDocxTemplate.ts` | Core renderer using `docx` package. Creates tables with merged cells, bold labels, formatted values. |
| `src/lib/docx/coverPageService.ts` | Orchestrator: calls `getPolicyForPDF()`, `transformPolicyForPDF()`, `buildCoverPageData()`, `renderCoverPageDocx()` |
| `src/lib/docx/downloadDocx.ts` | Client-side download (mirrors `src/lib/pdf/downloadPdf.ts`) |
| `src/lib/docx/index.ts` | Barrel exports |
| `src/app/api/policies/[policyId]/contract-cover/route.ts` | GET endpoint. Auth: ADMIN/STAFF/BROKER. Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

### Modified files

| File | Change |
|------|--------|
| `src/components/policies/PolicyDetailsContent/hooks/usePolicyActions.ts` | Add `handleDownloadDocx`, `downloadingDocx` state |
| `src/components/policies/PolicyDetailsContent/components/PolicyHeader.tsx` | Add "Descargar Carátula" dropdown item after existing PDF item |
| `src/components/policies/PolicyDetailsContent/PolicyDetailsContent.tsx` | Pass new props through |

### Reused files (read-only)

| File | What we reuse |
|------|---------------|
| `src/lib/services/policyService/index.ts:getPolicyForPDF()` | Prisma query with all deep includes |
| `src/lib/pdf/policyDataTransformer.ts:transformPolicyForPDF()` | Data transformation pipeline |
| `src/lib/pdf/types.ts` | `PDFPolicyData`, `PDFLandlord`, `PDFTenant`, etc. |
| `src/app/api/policies/[policyId]/pdf/route.ts` | Auth pattern to clone |
| `src/lib/pdf/downloadPdf.ts` | Download pattern to clone |

## Schema gaps (blank in generated doc)
Fields in sample contracts NOT in Prisma schema — will be left blank for manual fill-in:
- Landlord nationality, identification type/number
- Company constitution data (escritura #, notario, registro público) for any actor
- Guarantor property: notary details, use type, surface areas, linderos/colindancias
- Contract start/end as explicit dates (will use `activatedAt`/`expiresAt` if available)

## Implementation order
1. `bun add docx`
2. `numberToSpanishWords.ts` (standalone, testable)
3. `types.ts`
4. `coverPageTransformer.ts`
5. `coverPageDocxTemplate.ts` (biggest file)
6. `coverPageService.ts` + `index.ts`
7. `route.ts` (API endpoint)
8. `downloadDocx.ts` (client helper)
9. UI: `usePolicyActions.ts` → `PolicyHeader.tsx` → `PolicyDetailsContent.tsx`

## Verification
1. `bun run build` — no errors
2. Start dev server, navigate to a policy with data
3. Click "Descargar Carátula" from dropdown
4. Open .docx in Word — verify tables, formatting, data populated, blanks where expected
5. Compare side-by-side with sample contract in `documents/contracts/`

## Unresolved questions
1. Should download be available at ALL policy statuses, or only after COLLECTING_INFO?
2. Font preference for the .docx? (Arial 11pt matches the samples' general style)
3. For company tenants: legal rep identification type — the schema has no `identificationType` field for any actor. Leave blank?
