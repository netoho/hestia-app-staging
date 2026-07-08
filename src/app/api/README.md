# API Routes

Next.js App Router API routes. Most business logic lives in tRPC routers at `src/server/routers/` — these REST routes handle cases where tRPC is not suitable (file uploads, webhooks, cron jobs, NextAuth).

## Directory Structure

```
api/
├── auth/
│   ├── [...nextauth]/      # NextAuth.js handler
│   ├── login/              # POST — custom JWT login
│   ├── register/           # POST — open BROKER self-registration (being REMOVED — #162)
│   ├── forgot-password/    # POST — send password reset email
│   └── reset-password/
│       └── [token]/        # POST — reset password with token
├── cron/
│   ├── incomplete-actors-reminder/   # GET — daily reminder emails for incomplete actor info
│   ├── policy-expiry/                # GET — daily job to expire ended protecciones
│   ├── policy-expiration-reminder/   # GET — expiring-soon reminders to landlords/tenants
│   ├── policy-quarterly-followup/    # GET — quarterly follow-up emails
│   ├── receipt-reminder/             # GET — monthly receipt reminder to tenants
│   └── test-reminder/                # GET — dev-only manual trigger for reminders
├── payments/
│   └── [paymentId]/
│       └── receipt/        # GET/POST/PUT — S3 presigned URL flow for payment receipts
├── policies/
│   └── [policyId]/
│       ├── pdf/            # GET — generate and download PDF for a protección (staff/admin/broker)
│       └── contract-cover/ # GET — generate the DOCX carátula (cover page)
├── reports/
│   └── policies/
│       └── csv/            # GET — dashboard CSV export
├── trpc/
│   └── [trpc]/             # tRPC fetch adapter — all tRPC calls go through here
├── user/
│   └── avatar/             # POST/DELETE — presigned avatar upload + removal
└── webhooks/
    └── stripe/             # POST — Stripe webhook handler (payment events)
```

18 `route.ts` files, 20 app-authored HTTP method exports (plus the 2 catch-all
adapters) — all 20 exercised by the integration suite.

## Route Groups

### `auth/`
Custom authentication endpoints alongside NextAuth. Handles credential login, registration, and the forgot/reset password flow with rate limiting.

### `cron/`
Vercel Cron Job endpoints. All are GET handlers that verify `Authorization: Bearer $CRON_SECRET` in production. `test-reminder` is blocked in production.

### `payments/`
File upload support for payment receipts. Returns an S3 presigned URL; the client uploads directly to S3 (avoids routing large files through Vercel).

### `policies/`
PDF generation for protecciones. Streams the generated PDF as a response.

### `trpc/`
Single catch-all route that mounts the tRPC app router (`src/server/routers/_app.ts`). All tRPC procedures are served here.

### `user/`
Avatar upload presigned URL. Supports both authenticated sessions and invitation-token-based access (for onboarding).

### `webhooks/`
Stripe webhook receiver. Verifies signature, processes payment events (`payment_intent.succeeded`, etc.), and updates payment/policy state.

## Tests

REST handlers are exercised by the integration suite under `tests/integration/rest/` — one file per area (`cron.test.ts`, `webhooks-stripe.test.ts`, `payments-receipt.test.ts`, `policies-export.test.ts`, `reports-csv.test.ts`, `auth.test.ts`, `user-avatar.test.ts`). Tests invoke the route handlers directly with constructed `NextRequest` objects via `tests/integration/restHelpers.ts` (`buildRequest`, `withSession`, `withHeaders`, `readJson`). External services (Stripe, S3, Google Maps, email, `next/headers`, `next-auth`) are mocked at preload, so no test ever hits the real network.

Full guide: [docs/TESTING.md](../../../docs/TESTING.md).
