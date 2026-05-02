# Hestia - Rent Insurance Policy Management System

A comprehensive rent insurance policy management system designed for the Mexican market. Manages the complete lifecycle of rental insurance policies from creation through investigation to activation.

## Quick Start

```bash
# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Run database migrations
bunx prisma migrate deploy

# Seed database
bunx prisma db seed

# Start development server
bun run dev

# Run build
bun run build

# Open Prisma Studio
bunx prisma studio

# Run integration tests (boot the test DB once, then run the suite)
bun run test:db:up
bun run test:integration

# Fast iteration on a single file or test (skips docker / DB push):
bun run test:integration:filter tests/integration/routers/policy.test.ts
bun run test:integration:filter -t "happy path"

# Without docker (local Postgres) — see docs/TESTING.md
```

## Architecture

### User Roles
- **ADMIN** - Full system access, user management
- **STAFF** - Policy management, investigations, incidents
- **BROKER** - Create/manage own policies only

### Policy Actors
All actors support both Individual and Company modes:
- **Landlord** (Arrendador) - Property owner
- **Tenant** (Inquilino) - Renter
- **Joint Obligor** (Obligado Solidario) - Shares liability
- **Aval** - Property guarantee provider

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **API**: tRPC + REST endpoints
- **Auth**: NextAuth.js
- **Storage**: AWS S3 / Firebase / Local
- **Email**: SMTP / Resend / Mailgun
- **Runtime**: Bun

## Documentation

### Getting Started
- [Developer Onboarding](docs/DEVELOPER_ONBOARDING.md) - Setup, common tasks, debugging
- [Testing Guide](docs/TESTING.md) - Integration & contract tests, output schemas, running locally, CI

### Architecture
- [Actor System Architecture](docs/ACTOR_SYSTEM_ARCHITECTURE.md) - Actor types, data flow, auth
- [Policy Status Model](docs/POLICY_STATUS.md) - Status transitions, validation gates, cron
- [Code Quality Plan](docs/CODE_QUALITY_PLAN.md) - Type safety, refactoring progress

### API & Services
- [tRPC Routers](src/server/routers/README.md) - Type-safe API endpoints
- [API Routes](src/app/api/README.md) - REST endpoints
- [Services Layer](src/lib/services/README.md) - Business logic, Result pattern

### Components & Utilities
- [Actor Components](src/components/actor/README.md) - Wizard pattern, forms
- [Schemas](src/lib/schemas/README.md) - Zod validation
- [Constants](src/lib/constants/README.md) - Configuration, field mappings
- [Utilities](src/lib/utils/README.md) - Data transforms, helpers

### Infrastructure
- [Storage](src/lib/storage/README.md) - Multi-provider file storage
- [Email Templates](src/templates/email/README.md) - React email system

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes
│   ├── dashboard/         # Internal dashboard pages
│   └── actor/             # Actor self-service portals
├── components/            # React components
├── lib/
│   ├── services/          # Business logic layer
│   ├── schemas/           # Zod validation schemas
│   ├── constants/         # Configuration constants
│   ├── utils/             # Utility functions
│   └── storage/           # File storage abstraction
├── server/
│   └── routers/           # tRPC routers
├── prisma/                # Generated Prisma client
└── templates/             # Email templates

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Seed data

docs/                      # Extended documentation
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
JWT_SECRET="..."

# Email (choose one provider)
EMAIL_PROVIDER="smtp|resend|mailgun"
EMAIL_FROM="noreply@domain.com"

# Storage (choose one provider)
STORAGE_PROVIDER="s3|firebase|local"

# Google Maps
GOOGLE_MAPS_API_KEY="..."
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

See [STORAGE_SETUP.md](STORAGE_SETUP.md) for detailed storage configuration.

## Key Patterns

### Response Format
```typescript
// API routes
{ success: true, data: {...} }
{ success: false, error: "message" }

// Services use Result pattern
Result<T, ServiceError>
```

### Status Transitions
Use `transitionPolicyStatus()` from `policyWorkflowService.ts` - never update status directly. See [Policy Status Model](docs/POLICY_STATUS.md) for the full transition diagram and validation gates.

### Key Services
- `policyService` / `policyWorkflowService` - Policy lifecycle and status transitions
- `paymentService` - Payment processing
- `receiptService` - Receipt generation
- `notificationService` - Notifications
- `ActorAuthService` - Actor portal authentication via access tokens
- `documentService`, `emailService`, `progressService` - Supporting services

### Activity Logging
Log significant actions with `logPolicyActivity()` from `policyService.ts`.

### Output schemas (contract-locked APIs)
Every tRPC procedure declares `.output(<schema>)` against a Zod schema in `src/lib/schemas/<domain>/output.ts`. The frontend imports the same schemas, so dropping or renaming a field that the frontend uses breaks the integration test for that procedure before it ever lands. See [docs/TESTING.md](docs/TESTING.md) for the full recipe when adding a new procedure or REST endpoint.

## Reporting fields not yet modeled

The dashboard CSV report (`/api/reports/policies/csv`) ships several columns that map directly to existing data, plus a few documented gaps. These need product input before they can be added:

1. **% de comisión** — no business definition; not stored anywhere. Open question: per-broker default rate, per-package, per-policy negotiated, or a hybrid? Column is omitted from the CSV today.
2. **Descuento** — no semantic definition (package discount? broker margin? promotional?). Column is omitted from the CSV today. The pricing service has an `isManualOverride` flag but no separate discount field.
3. **Vendedor picker UI** — `Policy.managedById` exists and is read by the report (falling back to literal `"CS"` when null), but no UI sets it. Follow-up: add a Hestia-user picker on the policy edit form so ops can attribute the deal to a specific Customer Success rep.
4. **"En proceso" multi-status URL filter** — `usePoliciesState` (`src/hooks/usePoliciesState.ts`) accepts a single `?status=` value. The dashboard "En proceso" KPI tile points at `?status=COLLECTING_INFO` only. If new intermediate statuses are added between `COLLECTING_INFO` and `PENDING_APPROVAL`, extend the hook to support a multi-value filter (e.g. `?status=in:COLLECTING_INFO,FOO`) and update `KpiTiles.tsx`.

## Backlog

See [docs/BACKLOG.md](docs/BACKLOG.md) for current work items and priorities.

