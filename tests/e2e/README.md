# E2E happy-path suite (#161)

Playwright journeys that walk a protección from creation wizard → actor portals →
investigation → approval → payments → **ACTIVE**, through the real UI against a
real Postgres + MinIO. These are the flows where regressions historically
cluster (contract drift, multi-landlord fan-out, admin ops, state machine).

## Run locally

```bash
bun run test:e2e          # boots docker (postgres+minio), provisions hestia_e2e_test, runs the suite
bun run test:e2e:headed   # watch it
bun run test:e2e:ui       # Playwright UI mode
```

The suite starts its own dev server on :9002 with the e2e env. To iterate
faster, start the server yourself and let Playwright reuse it — **only** via:

```bash
bun run dev:e2e           # dev server wired to hestia_e2e_test + MinIO — NEVER reuse a plain `bun run dev` (it points at your dev DB)
```

## Architecture

| Piece | Choice | Why |
|---|---|---|
| Database | dedicated `hestia_e2e_test` (port 5433) | never collides with the integration suite's `hestia_test`; passes the `*_test` guards |
| Reset | `freshDb()` per scenario, `workers: 1` | one mutable DB shared with the app under test |
| Documents | real presigned PUT → MinIO (`docker-compose.test.yml`, :9100) | exercises the exact "prod 500 on every upload" regression class |
| Stripe | not needed — admin records + verifies manual payments | |
| Google Maps | not needed — manual address entry is the default | |
| Email | not needed — actor tokens are persisted at `policy.create` before any email attempt; specs read them from the DB (`helpers/db.ts`) | |
| Auth | one real `/login` pass (NextAuth credentials) → `storageState` | the login flow itself stays covered |
| CI | `e2e-core.yml`: `@core` specs (E2E-01 + E2E-07) on PR→main/master + push `release/**`/`hotfix/**`; `e2e-nightly.yml`: FULL suite nightly (02:00 CDMX) on the newest `release/**` (fallback main), failure files a "Nightly e2e failing" issue | feature PRs run unit+integration only; both workflows fail on any `"level":"error"` server log line |

## Scenarios (spanning set — see #161 for the full table)

| Spec | Covers |
|---|---|
| `specs/e2e-01-baseline.spec.ts` | IND/MEX tenant + 1 IND landlord + no guarantor + tenant pays 100% → ACTIVE |
| `specs/e2e-02-company-jo-split.spec.ts` | COMPANY tenant + JO INDIVIDUAL_INCOME + 50/50 split → ACTIVE (+ cross-surface parity assert) |
| E2E-03…08 | land incrementally — one PR per 2-3 scenarios |

## Conventions

- Selectors: prefer RHF `name` attributes and accessible labels/roles (the recon
  maps in #161 document them); `data-testid` only where labels are ambiguous.
- Every scenario starts with `freshDb()` and asserts final state in the DB
  (`getPolicyStatus`) as well as in the UI.
- Cross-surface parity: after a portal save, assert the value renders in the
  admin policy view (the "filled in one surface, invisible in the other" class — #171).
- Keep scenarios linear and explicit — helpers hide mechanics (wizard driving,
  tab filling), not intent.
