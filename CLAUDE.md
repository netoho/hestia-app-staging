# Hestia App - Project Context

## Overview
Hestia is a Next.js 15 rental guarantee platform for the Mexican market with complete property management features.

## Current Status
🟢 **PRODUCTION READY** - Core features complete including payment processing, comprehensive API testing with Vitest

## Recent Session Summary (July 24, 2025) - Persona Moral Implementation Complete

### ✅ **Major Achievement: Persona Moral (Company) Support**
- **Complete company tenant support** - Full workflow from policy creation to data capture
- **Structured database design** - Proper relational models for company data
- **Production-ready implementation** - All tests passing with comprehensive coverage
- **Fixed form validation** - Employment step schema now matches actual form values

### **New Features Implemented**
1. **Policy Initiation Page** (`/dashboard/policies/new`) - Tenant type selection as first step
2. **Company Profile Form** - Legal representative data with nationality-based ID validation
3. **Database Models** - CompanyProfile, LegalRepresentative, CompanyFinancial, CompanyReferences
4. **API Integration** - Dynamic validation schemas based on tenant type
5. **Document Requirements** - Different document lists for individuals vs companies

### **Testing Infrastructure** (Maintained from July 23)
- **Framework**: Vitest with native TypeScript support
- **Database**: Django-style drop/recreate pattern before each test run  
- **Coverage**: Real PostgreSQL database testing (not mocked)
- **New Tests**: 49 total tests (45 passed, 4 skipped) including company workflow tests
- **Commands**: `bun run test:api`, `bun run test:watch`, `bun run test:coverage`

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Supabase) + Demo mode
- **Testing**: Vitest + @testing-library/react + Django-style DB reset
- **Auth**: NextAuth.js with JWT
- **UI**: Tailwind CSS + Radix UI
- **Forms**: React Hook Form + Zod
- **Storage**: Firebase Storage
- **Payments**: Stripe
- **Email**: Resend/Mailgun
- **PDF**: HTML generation
- **i18n**: Spanish localization

## Architecture

### Database
```env
DATABASE_URL=postgresql://[connection-string]
DEMO_MODE=true  # Enables in-memory database
```

### Key API Endpoints
- Auth: `/api/auth/login`, `/api/auth/register`
- Users: `/api/staff/users` (CRUD)
- Policies: `/api/policies` (CRUD)
- Tenant: `/api/tenant/[token]/*` (wizard, payments, uploads)
- Webhooks: `/api/webhooks/stripe`

### Core Components
- `PolicyWizard`: 6-step tenant application
- `PolicyTable`: Staff management interface
- `DashboardSidebar`: Role-based navigation
- `PaymentService`: Stripe integration
- `DemoDatabase`: In-memory ORM for demo mode

## Demo Mode
When `DEMO_MODE=true`:
- Uses in-memory database (no external deps)
- Auto-login: `admin@hestiaplp.com.mx / password123`
- Mock payments, emails, and file uploads
- Full CRUD functionality

## Business Workflow
1. Staff creates policy with package/pricing
2. System sends invitation email to tenant
3. Tenant completes 6-step wizard:
   - Profile → Employment → References → Documents → Payment → Review
4. Payment processed via Stripe
5. Staff reviews and approves/denies
6. PDF generation for approved applications

## Development Commands
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run typecheck  # Type checking
npm run lint       # Linting

# Testing (Vitest - NEW!)
bun run test:api                    # Run all API tests
bun run test:api policies-initiate  # Run specific test file
bun run test:watch                  # Watch mode with hot reload
bun run test:coverage              # Coverage report
bun run test:components            # Component tests only

# Database
npx prisma generate
npx prisma db push
npx prisma studio
```

## Testing Infrastructure (NEW!)
- **Framework**: Vitest with native TypeScript support
- **Database**: Django-style drop/recreate pattern before each test run
- **Coverage**: Real PostgreSQL database testing (not mocked)
- **Performance**: Faster startup, better error messages, hot reload
- **Tests**: 15 comprehensive API tests covering:
  - Staff policy initiation workflow (6 tests)
  - Tenant multi-step wizard completion (9 tests)
  - Authentication and authorization
  - Input validation and error handling
  - Payment processing integration

## Key Conventions
- Use `verifyAuth()` for API authentication
- Use `isDemoMode()` to check demo status
- All tenant-facing content in Spanish
- Use existing components/patterns
- Test in both demo and live modes

## Recent Context
- Payment system fully integrated with Stripe
- 6-step wizard with payment validation
- PDF generation for rental applications
- Complete Spanish localization
- Demo mode for easy development/testing

## TODO / Next Steps

### High Priority (Version 1.1)
- [ ] Invoice Generation - PDF receipts for payments
- [ ] Company forms enhancement - Update Employment/References/Documents for company mode
- [ ] Company document uploads - Different requirements for Persona Moral applications

### Medium Priority (Version 2.0)
- [ ] Refund Management - Staff refund interface
- [ ] Analytics Dashboard - KPIs and metrics
- [ ] Multiple Payment Methods - Add MercadoPago
- [ ] Subscription Plans - Recurring billing
- [ ] Persona Moral PDF - Company rental applications with legal representative data

### Low Priority (Future Versions)
- [ ] English language toggle for international users
- [ ] Date/time localization for Mexican format
- [ ] Enhanced file upload UI (drag & drop)
- [ ] Email template editor for staff
- [ ] Performance optimization (caching)
- [ ] Background job processing
- [ ] Two-factor authentication
- [ ] API rate limiting

## Important Notes
- Always check DEVELOPMENT_HISTORY.md for detailed past sessions
- Run lint/typecheck before committing
- Test payment flows with Stripe test cards
- Ensure Spanish translations for new features
- Document new API endpoints

## Support
- Issues: https://github.com/anthropics/claude-code/issues
- Help: `/help` command