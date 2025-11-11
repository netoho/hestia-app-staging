# Hestia Developer Guide

**Last Updated**: November 10, 2024 (commit: fix/actor-system)
**Status**: ✅ Reflects Production Codebase
**Purpose**: Main entrypoint for all development documentation

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Core Systems](#core-systems)
4. [Common Workflows](#common-workflows)
5. [Deployment](#deployment)
6. [Known Issues](#known-issues)
7. [Deep-Dive Documentation](#deep-dive-documentation)

---

## Quick Start

### Setup
```bash
# Install dependencies
bun install

# Setup database (we treat all the environments the same way)
bun prisma generate
bun prisma migrate deploy

# Run development server
bun run dev
```

### Build Verification
```bash
# Type check (may show ~205 TS errors - mostly in API routes - see Known Issues)
bunx tsc --noEmit

# Production build (should succeed)
bun run build
```

### Key Commands
```bash
# After schema changes (ALWAYS run this first!)
bun prisma generate    # This also auto-generates src/lib/enums.ts

# Enum generation (runs automatically with prisma generate)
bun run generate-enums # Manual enum generation from Prisma schema

# Database operations
bun prisma migrate dev --create-only --skip-seed --skip-generate --name init      # Create migration
bun prisma migrate deploy                                                         # Deploy to production
bun prisma studio                                                                 # Visual database browser
bun prisma db seed                                                                # Seed database (if applicable)

# Testing
bun run test
bun run test:api
```

---

## Architecture Overview

### Tech Stack

**Framework**: Next.js 15 (App Router)
**Database**: PostgreSQL + Prisma ORM
**Language**: TypeScript
**Validation**: Zod schemas
**Data Fetching**: SWR (React Hooks)
**Authentication**: NextAuth.js
**File Storage**: AWS S3
**Email**: Resend / Mailgun / SMTP
**Deployment**: Vercel

### Project Structure

```
hestia-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── actors/       # Unified actor endpoints ⭐
│   │   │   ├── auth/         # Authentication
│   │   │   ├── cron/         # Vercel cron jobs
│   │   │   └── policies/     # Policy management
│   │   ├── admin/            # Admin dashboard
│   │   ├── broker/           # Broker portal
│   │   └── portal/           # Actor self-service portals
│   │
│   ├── components/           # React components
│   │   ├── forms/           # Form wizards & shared inputs
│   │   ├── shared/          # Reusable UI components
│   │   └── ui/              # Base UI primitives
│   │
│   ├── lib/                 # Core utilities & services
│   │   ├── services/        # Business logic layer ⭐
│   │   │   └── actors/      # Actor service implementations
│   │   ├── validations/     # Zod validation schemas
│   │   ├── auth/           # Authentication utilities
│   │   └── utils/          # Helper functions
│   │
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
│
├── prisma/
│   └── schema.prisma       # Database schema (source of truth)
│
└── docs/                   # Documentation
    ├── DEVELOPER_GUIDE.md          # ← You are here
    ├── ACTOR_SYSTEM.md             # Actor system deep-dive
    ├── FORM_VALIDATION_PATTERNS.md # Validation best practices
    ├── REACT_STATE_PATTERNS.md     # State management patterns
    ├── API_ROUTE_PATTERNS.md       # API architecture
    └── archive/                    # Historical documentation
```

### Core Design Patterns

**1. Result Pattern** - Error handling without try/catch everywhere
```typescript
type Result<T> = { success: true, data: T } | { success: false, error: ServiceError };
```

**2. Service Layer Abstraction** - Business logic separated from API routes
```typescript
BaseActorService → LandlordService, TenantService, AvalService, JointObligorService
```

**3. Dual Authentication** - One endpoint serves both admin and actor access
```typescript
ActorAuthService.resolveActorAuth() → token-based OR session-based
```

**4. Three-Layer Validation** - Frontend (Zod) → API (Services) → Database (Prisma)

**5. Single Source of Truth for Enums** - Auto-generated from Prisma schema
```typescript
// Server-side: Import from @prisma/client
import { UserRole } from '@prisma/client';

// Client-side: Import from generated file
import { UserRole } from '@/lib/enums';
```

---

## Core Systems

### Actor System ⭐

**Current Implementation**: 4-field Mexican naming system

All actors (Landlords, Tenants, Avals, JointObligors) use standardized structure:

**Person Actors**:
- `firstName` (required)
- `middleName` (optional)
- `paternalLastName` (required)
- `maternalLastName` (required)

**Company Actors**:
- `companyName` (required)
- `rfc` (required)
- Legal representative with same 4-field structure

**Key Components**:
- `PersonNameFields.tsx` - Reusable name input component
- `BaseActorService.ts` - Abstract service (511 lines)
- 4 concrete services: Landlord (594), Tenant (384), Aval (707), JointObligor (711)
- Unified API route: `/api/actors/[type]/[identifier]`

**📚 Deep Dive**: See [ACTOR_SYSTEM.md](./ACTOR_SYSTEM.md)

### Authentication & Authorization

**User Roles**:
- `ADMIN` - Full access, can skip validation
- `STAFF` - Full access, can skip validation
- `BROKER` - Limited to assigned policies
- Actor self-service - Token-based, own data only

**Dual Auth Pattern**:
- UUID identifier → Session-based (admin/staff/broker)
- Token identifier → Token validation (actor self-service)
- One unified route handles both: `/api/actors/[type]/[identifier]`

**📚 Deep Dive**: See [API_ROUTE_PATTERNS.md](./API_ROUTE_PATTERNS.md)

### Form & Validation

**The Three-Layer Stack**:
1. **Frontend** - Zod schemas for immediate user feedback
2. **API** - Service layer validation for security
3. **Database** - Prisma constraints for data integrity

**Form Wizards**:
- Multi-step forms with tab navigation
- Save progress at each step
- Admin can skip between tabs, actors must complete in order
- Uses `useFormWizardTabs` hook for state management

**📚 Deep Dive**: See [FORM_VALIDATION_PATTERNS.md](./FORM_VALIDATION_PATTERNS.md)

### Data Fetching (SWR)

**Pattern**: Server as source of truth + optimistic updates

```typescript
const { data, mutate } = useSWR('/api/policies', fetcher);

// Optimistic update
await mutate(async () => {
  await updatePolicy(id, changes);
  return updatedData;
}, { optimisticData: updatedData });
```

**Configuration**:
- Deduping: 5000ms
- Revalidate on focus: disabled
- Refresh interval: 30s (policies list)
- Cache time: 24 hours

### Enum System

**Implementation**: Build-time extraction from Prisma schema

**Key Features**:
- **Single Source of Truth**: Prisma schema defines all enums
- **Auto-generation**: Runs automatically after `prisma generate`
- **Type-safe**: Full TypeScript support for both client and server
- **Zero bundle overhead**: Client gets lightweight enum file, not full Prisma client

**Generated File**: `src/lib/enums.ts` (auto-generated, do not edit)
- Contains all 18 enums from Prisma schema
- Exports const objects and TypeScript types
- Includes utility function for getting enum values as arrays

**Usage Pattern**:
```typescript
// Server-side (API routes, services, middleware)
import { UserRole, PolicyStatus } from '@prisma/client';

// Client-side (components, pages)
import { UserRole, PolicyStatus } from '@/lib/enums';
```

### Cron Jobs

**Implementation**: Vercel Cron Jobs

**Active Jobs**:
- `incomplete-actors-reminder` - Daily at 11:30 AM Mexico City time
  - Sends reminders to actors with incomplete information
  - Sends summary to policy creators
  - Only targets policies in COLLECTING_INFO status
  - Only sends to PRIMARY landlord (uses `isPrimary` flag)

**📚 Deep Dive**: See [CRON_JOBS_IMPLEMENTATION.md](./CRON_JOBS_IMPLEMENTATION.md)

---

## Common Workflows

### Adding a New Actor Type

1. **Update Database Schema**
```bash
# Edit prisma/schema.prisma
model NewActorType {
  id        String   @id @default(uuid())
  policyId  String
  policy    Policy   @relation(fields: [policyId], references: [id])

  # Name fields
  firstName         String?
  middleName        String?
  paternalLastName  String?
  maternalLastName  String?

  # ... other fields
}

# Generate Prisma client
bun prisma generate

# Create migration
bun prisma migrate dev --name add_new_actor_type
```

2. **Create Service**
```typescript
// src/lib/services/actors/NewActorTypeService.ts
export class NewActorTypeService extends BaseActorService<NewActorType> {
  protected validatePersonData(data: PersonActorData, isPartial = false): Result<PersonActorData> {
    // Implement validation
  }
}
```

3. **Add API Route** - Unified route already handles all types!
   - Just add type to `ActorType` enum if needed

4. **Create Form Wizard**
```typescript
// src/components/forms/NewActorTypeFormWizard.tsx
// Use PersonNameFields component
// Use useFormWizardTabs hook
```

**📚 Complete Checklist**: See [ACTOR_SYSTEM.md](./ACTOR_SYSTEM.md#implementation-checklist)

### Schema Change Process

**CRITICAL**: Always follow this exact order!

```bash
# 1. Update schema.prisma
vim prisma/schema.prisma

# 2. Regenerate Prisma client (MUST DO THIS FIRST!)
bun prisma generate  # This also auto-generates src/lib/enums.ts

# 3. Create migration
bun prisma migrate dev --name descriptive_name

# 4. Verify enum generation (if enums were changed)
cat src/lib/enums.ts  # Check that new/updated enums are present

# 5. Update Zod validation schemas
# Edit files in src/lib/validations/

# 6. Update TypeScript types
# Usually auto-updated by Prisma generate

# 7. Fix service layer
# Update any methods that use changed fields

# 8. Fix UI components
# Update forms and displays

# 9. Test with edge cases
# Test null, undefined, empty string for optional fields

# 10. Type check
bunx tsc --noEmit

# 11. Build verification
bun run build
```

**Why this order matters**: Prisma generates TypeScript types and enums. If you update types/validation before running `bun prisma generate`, you'll get cascading type errors.

### Creating a New Policy

**User Flow**:
1. User creates policy shell (basic info)
2. System generates unique access tokens for each actor
3. System sends info request emails with tokens
4. Actors fill out their information via token-authenticated portals
5. Admin reviews when all actors complete
6. Policy moves to ACTIVE status

**Status Flow**:
```
DRAFT → COLLECTING_INFO → UNDER_REVIEW → ACTIVE → EXPIRED/CANCELLED
```

### Debugging TypeScript Errors

```bash
# Type check only (faster than build)
bunx tsc --noEmit

# Type check with verbose output
bunx tsc --noEmit --pretty

# Build (includes type checking)
bun run build
```

**Common Issues**:
- After schema changes: Run `bun prisma generate` (also regenerates enums)
- Enum errors: ✅ FIXED - Now using auto-generated enums
  - Server imports from `@prisma/client`
  - Client imports from `@/lib/enums`
- Optional field errors: Check validation logic for `?? ''` coercion

**📚 Deep Dive**: See [REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md#typescript-troubleshooting)

---

## Deployment

### Environment Variables

**Critical Variables**:
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."  # Generate: openssl rand -hex 32
NEXTAUTH_URL="https://your-domain.com"

# Cron Jobs
CRON_SECRET="..."      # Generate: openssl rand -hex 32
                       # Vercel adds to Authorization header automatically

# AWS S3 (Document Storage)
AWS_S3_REGION="us-east-1"
AWS_S3_BUCKET_NAME="..."
AWS_S3_ACCESS_KEY_ID="..."
AWS_S3_SECRET_ACCESS_KEY="..."

# Email Provider (choose one)
EMAIL_PROVIDER="resend"  # or "mailgun" or "smtp"
RESEND_API_KEY="..."     # if using Resend
```

### First Deployment Checklist

- [ ] Set all environment variables in Vercel dashboard
- [ ] Run migrations: `bun prisma migrate deploy`
- [ ] Verify database connection
- [ ] Test authentication (login/logout)
- [ ] Test file upload (S3 connection)
- [ ] Verify email sending works
- [ ] Check cron job execution in Vercel logs (wait for scheduled time)
- [ ] Monitor error rates

### Monitoring

**Vercel Logs**:
- Check cron job execution daily
- Monitor API route response times
- Track error rates

**Database**:
- Monitor connection pool usage
- Check query performance
- Review slow query logs

**S3**:
- Track storage usage
- Monitor upload/download bandwidth

---

## Known Issues

### TypeScript Errors (~205 total)

**Status**: Build succeeds ✅, but type-check shows errors ⚠️

**Update November 10, 2024**: Fixed UserRole enum errors by implementing build-time enum extraction from Prisma schema

**Category 1: UserRole Enum (FIXED ✅)**
- **Previous Issue**: 20 errors from using wrong import source
- **Solution Implemented**: Created build-time enum extraction system
  - Server uses `@prisma/client` directly
  - Client uses auto-generated `@/lib/enums`
  - Single source of truth maintained in Prisma schema
- **Result**: All UserRole/PolicyStatus enum errors resolved

**Category 2: Missing .save() and .delete() Methods (FIXED ✅)**
- **Previous Issue**: BaseActorService missing methods
- **Solution Implemented** (Nov 9, 2024 session):
  - Added public `.save()` and `.delete()` methods to all actor services
  - Services now have complete CRUD operations
- **Result**: No more missing method errors in actor routes

**Category 3: API Route Type Mismatches (~195 errors)**
- **Location**: Various API routes (investigation, contracts, etc.)
- **Issues**:
  - Property name mismatches (e.g., `landlord` vs `landlords`)
  - Missing properties on Prisma models
  - Incorrect type assignments
- **Priority**: Low (doesn't affect runtime due to build configuration)

**Action Items**:
- [x] ✅ Fix UserRole enum imports (Completed Nov 10)
- [x] ✅ Implement .save() and .delete() methods (Completed Nov 9)
- [ ] Fix remaining API route type mismatches
- [ ] Investigate Prisma model property issues

---

## Deep-Dive Documentation

For detailed information on specific topics, see:

### Core Architecture
- **[ACTOR_SYSTEM.md](./ACTOR_SYSTEM.md)** - Complete actor system guide
  - BaseActorService pattern
  - 4-field Mexican naming implementation
  - Service implementations (2,948 lines total)
  - Unified routes architecture
  - Complete implementation checklist

### Development Patterns
- **[FORM_VALIDATION_PATTERNS.md](./FORM_VALIDATION_PATTERNS.md)** - Validation best practices
  - Three-layer validation stack with real examples
  - Common validation mistakes and fixes
  - Schema synchronization process
  - Testing strategies
  - Real code from production

- **[REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md)** - State management guide
  - Stale closure bug explained with real examples
  - Form wizard state management
  - useFormWizardTabs hook deep-dive
  - useCallback/useEffect best practices
  - TypeScript troubleshooting

- **[API_ROUTE_PATTERNS.md](./API_ROUTE_PATTERNS.md)** - API architecture
  - Unified actor routes structure
  - Dual authentication pattern
  - ActorAuthService deep-dive
  - Role-based access control
  - Error handling patterns

### Feature Documentation
- **[CRON_JOBS_IMPLEMENTATION.md](./CRON_JOBS_IMPLEMENTATION.md)** - Vercel cron jobs
  - Daily reminder system
  - Email templates
  - Production setup guide

### Historical Documentation
- **[archive/](./archive/)** - Archived documentation
  - Old handoff files from development sessions
  - Original architecture docs (now superseded)
  - Historical reference only

---

## Contributing

### Documentation Standards

When updating documentation:

1. **Add "Last Updated" date** at the top
2. **Include real code examples** from actual files with line references
3. **Add file path references** - e.g., `src/lib/services/BaseActorService.ts:42-57`
4. **Document both ✅ RIGHT and ❌ WRONG** patterns
5. **Include troubleshooting sections** for common issues
6. **Cross-reference related docs** with links

### Code Standards

- Use TypeScript strictly (no `any` unless absolutely necessary)
- Follow Prisma schema as source of truth
- Always run `bun prisma generate` after schema changes
- Use Result pattern for error handling
- Extend BaseService/BaseActorService for new services
- Use Zod for all validation schemas

---

## Resources

### Commands Reference
```bash
# Development
bun run dev                    # Start dev server
bun run build                  # Production build
bunx tsc --noEmit             # Type check

# Database
bun prisma generate           # Regenerate Prisma client
bun prisma migrate dev        # Create & apply migration
bun prisma studio            # Visual DB browser

# Testing
bun run test                  # Run all tests
bun run test:api             # API tests only
```

### Useful Files
- `prisma/schema.prisma` - Database schema (source of truth for all enums)
- `scripts/generate-enums.ts` - Enum extraction script
- `src/lib/enums.ts` - Auto-generated client-safe enums
- `src/lib/services/actors/BaseActorService.ts` - Service pattern
- `src/components/forms/shared/PersonNameFields.tsx` - Reusable component
- `src/hooks/useFormWizardTabs.ts` - Wizard state management
- `.claude/sessions/` - Development session history

### External Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Zod Docs](https://zod.dev)
- [SWR Docs](https://swr.vercel.app)

---

**Last Verified**: November 10, 2024 (commit: fix/actor-system)
**Codebase Version**: Production (fix/actor-system branch)
**Maintained By**: Development team
**Documentation Accuracy**: ✅ Core systems verified against actual implementation

**Recent Updates**:
- Nov 10, 2024: Added enum extraction system documentation
- Nov 10, 2024: Updated Known Issues section (fixed UserRole/enum errors)
- Nov 9, 2024: Actor services now have complete CRUD operations

For questions or clarifications, review session files in `.claude/sessions/`
