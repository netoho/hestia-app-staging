# Integration tests

311 tests across the tRPC + REST API surface. Real Postgres, mocks at preload, contract-locked via `.output(<zodSchema>)` schemas in `src/lib/schemas/<domain>/output.ts`.

**Full guide: [docs/TESTING.md](../../docs/TESTING.md)** — recipes, conventions, gotchas, follow-ups.

## Run

```bash
bun run test:db:up          # boot Postgres on 5433 (first time)
bun run test:integration    # provision + run
```

## File map

| Path | Purpose |
|---|---|
| `preload.ts` | Safety check + `beforeEach` reset+seed + module mocks |
| `callers.ts` | `createPublicCaller`, `createAdminCaller`, … |
| `expectAuthGate.ts` | One-call auth-matrix assertion |
| `actorTokens.ts` | Mint real actor portal tokens |
| `restHelpers.ts` | `withSession`, `buildRequest`, `readJson` for REST |
| `scenarios.ts` | `createPolicyWithActors`, … |
| `factories/` | fishery factories (1 per Prisma model) |
| `routers/<router>.test.ts` | Tests per tRPC router |
| `rest/<area>.test.ts` | Tests per REST area |

## Adding a test

See [Recipes in TESTING.md](../../docs/TESTING.md#recipes) — every step links to existing helpers and references real files. Floor coverage for every new procedure: happy path + auth gate via `expectAuthGate`.
