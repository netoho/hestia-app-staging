# scripts/

Load-bearing repo scripts (run with `bun run scripts/<name>.ts` or via the
package.json aliases).

| Script | Alias | Purpose |
|---|---|---|
| `test-db.ts` | `test:db:setup` / `test:db:provision` | Django-style test-DB provisioner: creates `hestia_test` if missing, runs `prisma db push`. Refuses non-`*_test` URLs; falls back to `.env.test`'s URL when `.env.test.local` points at a dev DB. |
| `tsc-ratchet.ts` | `typecheck:ratchet` | CI type gate: counts tsc errors in **git-tracked** files against `tsc-baseline.json` — fails only on growth. Uses `tsconfig.ratchet.json` (excludes `.next`, dead e2e scaffold, incremental cache) so local and CI agree. Lower the baseline with `--update` after a burn-down. |
| `generate-enums.ts` | `generate-enums` | Regenerates enum helpers from the Prisma schema. |
| `generateCoverFixture.ts` | `cover:fixture` | Renders the DOCX carátula fixtures for the snapshot tests (`src/lib/docx/__tests__/`). |

Conventions: scripts must be safe to run twice (idempotent), must guard anything
destructive behind a `*_test` DB check, and get a row in this table when added.
