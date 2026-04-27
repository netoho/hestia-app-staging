# Testing Guide

Integration & contract test suite for the Hestia API surface.

## Why this exists

> "We develop a feature and some data is removed so the frontend breaks."

That regression mode is what this suite prevents. Each tRPC procedure declares its response shape via `.output(<zodSchema>)`. The schemas live in `src/lib/schemas/<domain>/output.ts` and are imported directly by the frontend. If a service ever drops, renames, or changes the type of a field the frontend consumes:

1. The integration test for that procedure fails (Zod parse error pointing at the missing field).
2. The frontend `tsc` check fails on the next compile.

Both are loud, fast feedback. No silent breakage.

## At a glance

- **311 integration tests** across 13 files
- **134 procedures + endpoints** under contract (every tRPC procedure plus the in-scope REST handlers)
- **Real Postgres test DB** — truncated and reseeded between every test
- **tRPC**: invoked via `appRouter.createCaller(ctx)` — no HTTP transport
- **REST**: route handlers invoked directly with constructed `NextRequest`
- **External services mocked at preload** — Stripe, nodemailer, AWS S3 presigner, Google Maps, email/notification services, `next/headers`, `next-auth`
- **Authentication exercised end-to-end** — actor portal tokens are minted via the real `actorTokenService` (never stubbed)

## Running tests

```bash
# 1. Boot the dockerized Postgres (first time + after a reboot)
bun run test:db:up

# 2. Run the suite (auto-provisions hestia_test, runs migrations, executes)
bun run test:integration

# 3. Stop the container when you're done
bun run test:db:down
```

Hard safety net: `tests/integration/preload.ts` refuses to run if `DATABASE_URL` doesn't end in `_test`.

CI runs the same flow on every PR — see `.github/workflows/test.yml`. The CI job uses a `postgres:15` service container in place of docker-compose; the rest is identical.

`.env.test` lives at the repo root and points `DATABASE_URL` at `postgresql://test:test@localhost:5433/hestia_test`. Bun auto-loads it when `NODE_ENV=test`.

## Directory tour

```
tests/integration/
├── preload.ts                  # safety check + reset hook + module mocks
├── callers.ts                  # createPublicCaller, createAdminCaller, ...
├── expectAuthGate.ts           # auth-matrix assertion helper
├── actorTokens.ts              # mint real actor portal tokens
├── restHelpers.ts              # withSession, buildRequest, readJson
├── scenarios.ts                # createPolicyWithActors, createCancelledPolicy, ...
├── factories/                  # fishery factories per Prisma model
│   ├── user.factory.ts
│   ├── package.factory.ts
│   ├── policy.factory.ts
│   ├── landlord.factory.ts
│   ├── tenant.factory.ts
│   ├── jointObligor.factory.ts
│   ├── aval.factory.ts
│   ├── payment.factory.ts
│   ├── tenantReceipt.factory.ts
│   ├── actorInvestigation.factory.ts
│   └── index.ts
├── routers/                    # one file per tRPC router
│   ├── policy.test.ts
│   ├── payment.test.ts
│   ├── actor.test.ts
│   ├── receipt.test.ts
│   ├── auxiliary.test.ts       # contract+address+package+pricing
│   ├── user-staff-onboard-document.test.ts
│   └── investigation.test.ts
└── rest/                       # one file per REST area
    ├── cron.test.ts
    ├── webhooks-stripe.test.ts
    ├── payments-receipt.test.ts
    ├── policies-export.test.ts
    ├── auth.test.ts
    └── user-avatar.test.ts

src/lib/schemas/<domain>/output.ts   # output Zod schema per router
```

## Recipes

### Recipe 1 — Add a new tRPC procedure

You're adding `policy.foo` (made-up name). Five steps:

**1. Author the input schema + handler in the router** (no change vs today)

```ts
// src/server/routers/policy.router.ts
foo: protectedProcedure
  .input(z.object({ policyId: z.string() }))
  // ↓ step 3 adds .output() here
  .query(async ({ input, ctx }) => {
    return await getFooData(input.policyId);
  }),
```

**2. Author the output schema** in `src/lib/schemas/policy/output.ts`

```ts
export const PolicyFooOutput = z.object({
  policyId: z.string(),
  someField: z.number(),
  // ... mirror what the service actually returns
});
export type PolicyFooOutput = z.infer<typeof PolicyFooOutput>;
```

Mirror the **service `select`** or the **Prisma model**, not your guess at what the frontend wants. Phase 2.2 caught a real bug because `UserPublicShape` declared `emailVerified` but `userService.userSelect` doesn't return it — locking the contract to the actual select is the rule.

**3. Wire `.output(...)` on the procedure**

```ts
import { PolicyFooOutput } from '@/lib/schemas/policy/output';

foo: protectedProcedure
  .input(z.object({ policyId: z.string() }))
  .output(PolicyFooOutput)
  .query(async ({ input, ctx }) => {
    return await getFooData(input.policyId);
  }),
```

**4. Add a test** in `tests/integration/routers/policy.test.ts`

```ts
import { createAdminCaller } from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import { UserRole } from '@/prisma/generated/prisma-client/enums';

describe('policy.foo', () => {
  test('returns the foo data for a valid policy', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();
    const result = await caller.policy.foo({ policyId: policy.id });

    expect(result.policyId).toBe(policy.id);
    expect(typeof result.someField).toBe('number');
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.foo({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.policy.foo({ policyId: policy.id }),
    });
  });
});
```

**5. Run the suite**

```bash
bun run test:integration
```

If your output schema is too strict (declares fields the service doesn't return), the happy-path test fails with a Zod parse error pointing at the offending field. Fix the schema or the service — whichever is the actual contract.

### Recipe 2 — Add a new REST endpoint

Same three layers: schema lock + tests, plus the REST helpers.

```ts
// tests/integration/rest/<area>.test.ts
import { GET } from '@/app/api/foo/route';
import { withSession, buildRequest, readJson } from '../restHelpers';
import { userFactory } from '../factories';
import { UserRole } from '@/prisma/generated/prisma-client/enums';

test('returns 200 with foo data for ADMIN', async () => {
  const admin = await userFactory.create({ role: UserRole.ADMIN });
  const result = await withSession(admin, async () => {
    const res = await GET(buildRequest('GET', 'http://localhost/api/foo'));
    return await readJson(res);
  });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ /* … */ });
});

test('returns 401 without session', async () => {
  const res = await GET(buildRequest('GET', 'http://localhost/api/foo'));
  expect(res.status).toBe(401);
});
```

For routes that read `next/headers` directly (cron handlers), the preload mock returns whatever `globalThis.__testHeaders` is set to — wrap the call in `withHeaders(...)` if you need specific headers visible to the route.

### Recipe 3 — Add a new factory

When you introduce a new Prisma model, add a fishery factory under `tests/integration/factories/`:

```ts
// tests/integration/factories/foo.factory.ts
import { Factory } from 'fishery';
import type { Foo } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type FooTransient = { policyId: string };

export const fooFactory = Factory.define<Foo, FooTransient>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(async (foo) => prisma.foo.create({ data: foo }));

    return {
      id: undefined as unknown as string,
      policyId: transientParams.policyId,
      // … mirror the Prisma model defaults
    } as Foo;
  },
);

export const completedFoo = fooFactory.params({ status: 'COMPLETED' });
```

Then export it from `tests/integration/factories/index.ts`.

Existing factories in this style: `user`, `package`, `policy`, `landlord`, `tenant`, `jointObligor`, `aval`, `payment`, `tenantReceipt`, `actorInvestigation`.

### Recipe 4 — Mock a new external service

If the new service makes outbound network calls (HTTP, S3, Stripe, etc.), mock it at preload — never per-test, so a test can never accidentally hit the real network.

```ts
// tests/integration/preload.ts
mock.module('@/lib/services/myNewService', () => ({
  myNewService: {
    sendThing: mock(async () => ({ id: 'fake-id' })),
    // … one mock per method the consumer calls
  },
}));
```

Tests that need to assert call arguments use `spyOn` from `bun:test`.

### Recipe 5 — Add a new caller or token helper

If you introduce a new auth scope (e.g. a new role, or a new actor type with its own portal), extend `callers.ts` (for session-based) or `actorTokens.ts` (for token-based). Follow the existing pattern — return `{ caller, user }` (or `{ caller, token, expiresAt }`) so tests stay uniform.

## Reference catalogue

### Callers (`tests/integration/callers.ts`)

| Helper | Returns | Use for |
|---|---|---|
| `createPublicCaller()` | `{ caller }` | Anonymous calls + UNAUTHORIZED gating |
| `createAdminCaller()` | `{ caller, user }` | ADMIN role |
| `createStaffCaller()` | `{ caller, user }` | STAFF role |
| `createBrokerCaller()` | `{ caller, user }` | BROKER role |
| `createAuthedCaller(role)` | `{ caller, user }` | Generic role |
| `createTokenCaller(token)` | `{ caller }` | dualAuthProcedure via token |

### Factories (`tests/integration/factories/`)

`userFactory`, `packageFactory`, `policyFactory`, `landlordFactory`, `tenantFactory`, `jointObligorFactory`, `avalFactory`, `paymentFactory`, `tenantReceiptFactory`, `actorInvestigationFactory`. Each ships with `.params({...})` traits for common variants — see the source for the full set.

### Scenarios (`tests/integration/scenarios.ts`)

| Helper | Builds |
|---|---|
| `createPolicyWithActors(opts?)` | Policy + creator + package + primary landlord + tenant |
| `createCancelledPolicy()` | Above with `status: CANCELLED` |
| `createCollectingInfoPolicy()` | Above with `status: COLLECTING_INFO` |

### Token helpers (`tests/integration/actorTokens.ts`)

| Helper | Purpose |
|---|---|
| `mintTenantToken(id)` | Mint a real tenant token via `actorTokenService` |
| `mintLandlordToken(id)` | Real landlord token |
| `mintJointObligorToken(id)` | Real joint obligor token |
| `mintAvalToken(id)` | Real aval token |
| `expireActorToken(type, id)` | Force `tokenExpiry` into the past |

### Auth helper (`tests/integration/expectAuthGate.ts`)

`expectAuthGate({ allowed, invoke, scopes? })` — iterates PUBLIC + every UserRole, asserts UNAUTHORIZED/FORBIDDEN for disallowed and pass-through for allowed. One call replaces ~5 boilerplate auth tests per procedure.

### REST helpers (`tests/integration/restHelpers.ts`)

| Helper | Purpose |
|---|---|
| `withSession(user, fn)` | Set the next-auth session for the duration of `fn` |
| `withHeaders(headers, fn)` | Set the next/headers map for the duration of `fn` |
| `buildRequest(method, url, body?, headers?)` | Construct a `NextRequest` |
| `readJson(res)` | `{ status, body }` for assertion convenience |

## Conventions

- **Output schemas mirror the service `select` (or the Prisma model when no select).** Don't guess what the frontend wants — declare what the service actually returns. Phase 2.2 caught a real drift exactly because `userService.userSelect` doesn't include `emailVerified` and the schema initially declared it.
- **Default Zod object mode.** Extra fields are stripped, missing required fields fail. That's what catches deletions.
- **`passthrough()` for nested includes you haven't yet locked.** Polymorphic actor returns use this to avoid duplicating shapes that already live elsewhere.
- **Coverage tiers:**
  - **Floor (every procedure)**: happy path + auth gate via `expectAuthGate`
  - **Target (high-stakes)**: + business invariants + 1 validation-failure smoke
  - High-stakes = `policy`, `payment`, `actor`, `receipt`, `investigation`, `webhooks/stripe`
- **Token authentication is exercised end-to-end.** Mint real tokens via `actorTokenService` — never stub the validation pipeline.
- **External services are mocked at preload only**, never per-test. A test can't accidentally hit the real network.
- **Factories own model defaults.** Hand-roll `prisma.create({ data: { … } })` only when you need a one-off shape that no factory captures.

## Gotchas

- **`tests/` is gitignored.** New test files need `git add -f`. (A future cleanup PR will tidy `.gitignore`.)
- **`ActorAuthService.handleAdminAuth` re-resolves the session via `next/headers`.** The preload mocks both `next/headers` and `next-auth`, but several happy paths that depend on the admin re-resolve are still deferred (see *Known follow-ups* below).
- **Rate-limited routes** (`/api/auth/login`, `/api/auth/forgot-password`) read `x-forwarded-for` for the rate-limit key. Tests use a unique IP per request — see `tests/integration/rest/auth.test.ts` for the pattern.
- **`tests/` directory has docker-compose, .env.test, etc. mostly gitignored.** Force-add only what's needed for the suite.

## Known follow-ups

These were carried forward from PRs and are tracked here so they don't get lost:

| Item | Why deferred | Where it'd live |
|---|---|---|
| `actor.update` / `actor.submitActor` admin-session happy paths | `ActorAuthService.handleAdminAuth` calls `getServerSession` → `next/headers` which throws outside a request scope. Either refactor the service to read `ctx.session` or tighten the preload mock. | `tests/integration/routers/actor.test.ts` |
| `document.{getUploadUrl,confirmUpload,listDocuments,deleteDocument,getDownloadUrl}` happy paths | Same constraint as above (dual-auth via `ActorAuthService`). | `tests/integration/routers/user-staff-onboard-document.test.ts` |
| `policy.{replaceTenant,changeGuarantorType,renew}` happy paths | Heavy archiving + transactional cloning needs richer actor-history factories and document-copy stubs. | `tests/integration/routers/policy.test.ts` |
| `payment.{generatePaymentLinks,editAmount,createNew}` happy paths | Stripe-roundtrip flows need richer Stripe-session fixtures (idempotency keys, expired sessions). | `tests/integration/routers/payment.test.ts` |
| `investigation.submit` happy path | Requires investigation-document fixtures to satisfy the "must have at least one document" precondition. | `tests/integration/routers/investigation.test.ts` |
| `policy.sendInvitations` BROKER auth gate | Router catches the FORBIDDEN ownership check and re-throws as INTERNAL_SERVER_ERROR — masks the real auth failure. Fix the router error mapping, then re-enable the BROKER scope in the auth gate. | `src/server/routers/policy.router.ts` + the existing test |

## Out of scope

Per [PRD #95](https://github.com/netoho/hestia-app/issues/95):

- Performance / load testing
- Concurrency-race tests (need a separate harness)
- Exhaustive Zod input-validation matrices (Zod is upstream-tested)
- E2E browser tests — see the separate Playwright suite under `tests/e2e/`
- Per-test database transactions or per-worker schema isolation (deferred until wall-clock pain demands them)
- Coverage-percentage gates in CI (deferred until the suite stabilizes)

## Real drift caught during the rollout

| PR | Drift |
|---|---|
| #98 | `pricing.calculateWithOverride` manual branch was returning a different shape than the calculate fallback (omitted `ivaRate`). Router fixed in-flight. |
| #99 | `UserPublicShape` initially declared `emailVerified` but `userService.userSelect` doesn't return it. Schema tightened to mirror the service. |
| #100 | `investigation.approve` / `reject` atomic-transaction CONFLICT path is now invariant-asserted. |
| #101 | `/api/webhooks/stripe` idempotent-skip path is now invariant-asserted. |

## Where the work happened

The suite landed in 11 PRs against `release/2.9.0`:

- [PR #92](https://github.com/netoho/hestia-app/pull/92) — Phase 0: foundation + reference test
- [PR #93](https://github.com/netoho/hestia-app/pull/93) — Phase 1.1: finish policy router
- [PR #94](https://github.com/netoho/hestia-app/pull/94) — Phase 1.2: payment router
- [PR #96](https://github.com/netoho/hestia-app/pull/96) — Phase 1.3: actor router
- [PR #97](https://github.com/netoho/hestia-app/pull/97) — Phase 1.4: receipt router
- [PR #98](https://github.com/netoho/hestia-app/pull/98) — Phase 2.1: contract + address + package + pricing
- [PR #99](https://github.com/netoho/hestia-app/pull/99) — Phase 2.2: user + staff + onboard + document
- [PR #100](https://github.com/netoho/hestia-app/pull/100) — Phase 2.3: investigation
- [PR #101](https://github.com/netoho/hestia-app/pull/101) — Phase 2.4: cron + webhooks + REST routes
- [PR #102](https://github.com/netoho/hestia-app/pull/102) — Phase 3: auth + avatar (final)

The original requirements live in [PRD issue #95](https://github.com/netoho/hestia-app/issues/95).
