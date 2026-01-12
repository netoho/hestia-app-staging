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

### Architecture
- [Actor System Architecture](docs/ACTOR_SYSTEM_ARCHITECTURE.md) - Actor types, data flow, auth
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
Use `transitionPolicyStatus()` from `policyWorkflowService.ts` - never update status directly.

### Activity Logging
Log significant actions with `logPolicyActivity()` from `policyService.ts`.

## Backlog

See [docs/BACKLOG.md](docs/BACKLOG.md) for current work items and priorities.

## Session Context

See [SESSION_CONTEXT.md](SESSION_CONTEXT.md) for detailed system context and recent changes.

---

**Last Updated:** 2026-01-07
