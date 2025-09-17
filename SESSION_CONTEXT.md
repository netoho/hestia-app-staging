# Hestia - Rent Insurance Policy Management System
## Session Context & System Overview

**Last Updated:** 2025-09-16
**Current Sprint:** Policy Details Refactoring & Document Downloads

---

## 🏗️ System Architecture Overview

### Core Purpose
Hestia is a comprehensive rent insurance policy management system designed to protect landlords and provide guarantees for rental agreements in Mexico. The system manages the complete lifecycle of rental insurance policies from creation to activation.

### User Roles
1. **ADMIN** - Full system access, can create users, manage all policies
2. **STAFF** - Can manage policies and incidents, handle investigations
3. **BROKER** - Can create and edit only their own policies

### Policy Actors
1. **Landlord** (Arrendador) - Property owner
2. **Tenant** (Inquilino) - Can be individual or company
3. **Joint Obligor** (Obligado Solidario) - Shares liability with tenant
4. **Aval** - Provides property as guarantee, also shares liability

---

## 📁 Key Files & Locations

### Database Schema
- **Schema:** `/prisma/schema.prisma`
- **Seed Data:** `/prisma/seed.ts`

### Core Services
- **Pricing Service:** `/src/lib/services/pricingService.ts` - Handles package pricing, investigation fees, payment splits
- **Actor Token Service:** `/src/lib/services/actorTokenService.ts` - Manages secure tokens for actor self-service
- **Policy Workflow Service:** `/src/lib/services/policyWorkflowService.ts` - State machine for policy status transitions
- **Email Service:** `/src/lib/services/emailService.ts` - Email templates and sending logic
- **Policy Service:** `/src/lib/services/policyService.ts` - Core policy CRUD operations

### API Endpoints

#### Policy Management
- `POST /api/policies` - Create new policy (auto-sends invitations)
- `GET /api/policies` - List policies with filters
- `POST /api/policies/[id]/send-invitations` - Send actor invitation emails
- `POST /api/policies/calculate-price` - Calculate policy pricing
- `POST /api/policies/[id]/actors/[type]/[actorId]/verify` - Approve/reject actors (STAFF/ADMIN)

#### Document Management (Enhanced 2025-09-16)
- `GET /api/documents/[id]/download` - Generate signed S3 URL for document download
  - 30-second expiration on URLs
  - Supports both actor and policy documents
  - Role-based access control

#### Internal Team Document APIs (Added 2025-09-16)
- `POST /api/policies/[id]/tenant/documents` - Upload tenant documents
- `GET /api/policies/[id]/tenant/documents` - List tenant documents
- `DELETE /api/policies/[id]/tenant/documents/[documentId]` - Delete tenant document
- Similar endpoints for joint-obligor and aval actors

#### Actor Portal Document APIs (Enhanced 2025-09-16)
- `GET /api/actor/[type]/[token]/documents` - List actor's documents
- `POST /api/actor/[type]/[token]/documents` - Upload new document
- `DELETE /api/actor/[type]/[token]/documents` - Delete document
- `GET /api/actor/[type]/[token]/documents/[documentId]/download` - Download document

#### Actor Self-Service
- `GET /api/actor/tenant/[token]/validate` - Validate tenant token
- `POST /api/actor/tenant/[token]/submit` - Submit tenant information
- `GET /api/actor/joint-obligor/[token]/validate` - Validate joint obligor token
- `POST /api/actor/joint-obligor/[token]/submit` - Submit joint obligor information
- `GET /api/actor/aval/[token]/validate` - Validate aval token
- `POST /api/actor/aval/[token]/submit` - Submit aval information

### UI Components

#### Policy Creation
- **Form:** `/src/app/dashboard/policies/new/page.tsx`
  - Multi-tab interface (Property, Pricing, Landlord, Tenant, Guarantors, Review)
  - Package selection with dynamic pricing
  - Tenant/Landlord payment split (0-100%)
  - Auto-send invitations checkbox

#### Policy Details (Refactored 2025-09-16)
- **Main Page:** `/src/app/dashboard/policies/[id]/page.tsx` - Container component
- **Actor Components:** `/src/components/policies/details/`
  - `ActorCard.tsx` - Unified component for all actors (tenant, landlord, obligors, avals)
  - `ActorVerificationCard.tsx` - Staff/admin verification interface
  - `PropertyCard.tsx` - Property information display
  - `PricingCard.tsx` - Package and pricing details
  - `TimelineCard.tsx` - Status timeline
  - `DocumentsList.tsx` - Policy documents with download
  - `ActivityTimeline.tsx` - Activity history

#### Actor Portal
- **Layout:** `/src/app/actor/layout.tsx`
- **Shared Form Component:** `/src/components/actor/ActorInformationForm.tsx`
- **Portal Pages:**
  - `/src/app/actor/tenant/[token]/page.tsx`
  - `/src/app/actor/joint-obligor/[token]/page.tsx`
  - `/src/app/actor/aval/[token]/page.tsx`

---

## 🔄 Policy Workflow & Status Transitions

### Valid Status Flow
```
DRAFT → COLLECTING_INFO → UNDER_INVESTIGATION → PENDING_APPROVAL → APPROVED
→ CONTRACT_PENDING → CONTRACT_SIGNED → ACTIVE → EXPIRED

Any status can transition to → CANCELLED
INVESTIGATION_REJECTED can go back to → UNDER_INVESTIGATION
```

### Automatic Transitions
- **COLLECTING_INFO → UNDER_INVESTIGATION**: When all actors complete their information
- **ACTIVE → EXPIRED**: When policy expiration date is reached

---

## 💰 Pricing System

### Components
1. **Package Price**: Can be percentage-based (with minimum) or flat fee
2. **Investigation Fee**: Configurable in SystemConfig (default: 200 MXN)
3. **Payment Split**: Configurable 0-100% between tenant and landlord

### Packages (from seed data)
- **Protección Libertad**: $3,800 flat fee
- **Protección Esencial**: 40% of rent (min $4,100)
- **Protección Premium**: 50% of rent (min $5,500)

---

## 📧 Email System

### Implemented Templates
1. **Actor Invitations** - Sent to tenant, joint obligors, and avals with secure access links
2. **Policy Submission Confirmation** - Acknowledgment when actors complete their info
3. **Status Updates** - Approval/rejection notifications

### Email Providers (fallback system)
- Primary: Resend
- Secondary: Mailgun
- Tertiary: SMTP

---

## 🐛 Known Issues & TODOs

### COMPLETED TODAY (2025-09-16)
✅ **Component Refactoring** - Split large policy details page into smaller components
✅ **Unified Actor Cards** - All actors now use same ActorCard component
✅ **Document Downloads** - Implemented signed S3 URLs with 30-second expiration
✅ **Actor Verification UI** - Staff/Admin can approve/reject actors with reasons
✅ **Internal Team Document Management** - ADMIN/STAFF can now manage all actor documents
✅ **Actor Portal Enhanced Documents** - Actors can upload/download/delete multiple documents per category

### URGENT FIXES NEEDED

#### 1. Personal References UI Issue - ✅ FIXED
**Status:** References now support add/remove functionality (min 3, max 5)
**Location:** All actor edit pages have dynamic reference management

#### 2. File Upload - ✅ IMPLEMENTED
**Status:** Full document management system implemented
**Features Added:**
- Multiple document uploads per category
- Download functionality with signed S3 URLs
- Delete documents capability
- Real-time document list updates
- Progress indicators and error handling

### IMPROVEMENTS NEEDED

#### 1. Authorization Middleware
**Priority:** HIGH
**Issue:** Brokers can potentially access other brokers' policies
**Solution:** Create middleware to enforce ownership checks
```typescript
// Needed in all policy-related endpoints
if (user.role === 'BROKER' && policy.createdById !== user.id) {
  return unauthorized();
}
```

#### 2. Investigation Module
**Priority:** MEDIUM
**Status:** Structure exists but no implementation
**Needed:**
- Investigation assignment system
- Document verification workflow
- Approval/rejection interface
- Risk scoring system

#### 3. Contract Generation
**Priority:** MEDIUM
**Current:** Placeholder implementation
**Needed:**
- PDF generation with actual contract template
- Digital signature integration
- Contract versioning

#### 4. Payment Processing
**Priority:** LOW
**Status:** Structure exists, no payment gateway
**Needed:**
- Stripe integration
- Payment tracking
- Invoice generation
- Refund handling

---

## 📊 Current Development Status

### 📋 New Components & Hooks (2025-09-16)

#### Document Management Components
1. **`InternalDocumentsTab`** (`/src/components/dashboard/InternalDocumentsTab.tsx`)
   - For ADMIN/STAFF to manage actor documents
   - Upload, view, download, delete functionality
   - Used in tenant/joint-obligor/aval edit pages

2. **`EnhancedDocumentsTab`** (`/src/components/actor/EnhancedDocumentsTab.tsx`)
   - For actors to manage their own documents
   - Multiple uploads per category support
   - Self-service document management

3. **`useDocumentManagement`** (`/src/hooks/useDocumentManagement.ts`)
   - Hook for actor portal document operations
   - Handles upload, download, delete, and state management

### ✅ Completed Features
1. **Policy Creation Flow** - Full form with all required fields
2. **Pricing Calculation** - Dynamic pricing with package selection
3. **Actor Token System** - Secure token generation and validation
4. **Email Invitations** - Automated sending with templates
5. **Actor Self-Service Portal** - Complete UI for data collection
6. **Workflow State Machine** - Status transitions with validation
7. **Activity Logging** - Audit trail for all actions
8. **Package Management** - Seed data and API endpoints
9. **Policy Details Refactoring** - Component-based architecture (2025-09-16)
10. **Document Downloads** - Signed S3 URLs with security (2025-09-16)
11. **Actor Verification** - Approve/reject workflow for STAFF/ADMIN (2025-09-16)
12. **Document Management System** - Complete upload/download/delete for all actors (2025-09-16)
13. **Multiple Documents per Category** - Actors can upload multiple IDs, proofs, etc. (2025-09-16)

### 🔄 In Progress
None - All major document features completed!

### 📋 Pending
1. **Authorization Middleware** - Role-based access control
2. **Investigation Module** - Complete workflow implementation
3. **Contract Generation** - PDF generation and signing
4. **Payment Integration** - Stripe or other gateway
5. **Admin Dashboard** - Analytics and reporting
6. **Incident Management** - Handle claims and disputes

---

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Run database migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

---

## 🔑 Environment Variables Needed

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
JWT_SECRET="..."

# Email (at least one provider)
RESEND_API_KEY="..."
MAILGUN_API_KEY="..."
MAILGUN_DOMAIN="..."
EMAIL_FROM="..."

# Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="..."
S3_BUCKET_NAME="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📝 Testing Scenarios

### 1. Create Policy with Auto-Invitations
1. Login as STAFF or ADMIN
2. Go to `/dashboard/policies/new`
3. Fill all tabs (select package, add actors)
4. Check "Send invitations automatically"
5. Submit → Invitations should be sent

### 2. Actor Portal Flow
1. Click link from invitation email (or use token from database)
2. Access `/actor/tenant/[token]`
3. Fill all information tabs
4. Submit → Status should auto-transition when all actors complete

### 3. Price Calculation
1. In policy creation, go to Pricing tab
2. Select different packages
3. Adjust tenant/landlord split slider
4. Verify calculation updates correctly


## 📚 Code Patterns & Conventions

### API Response Format
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Error message" }
```

### Status Transitions
Always use `transitionPolicyStatus()` from `policyWorkflowService.ts` - never update status directly

### Activity Logging
Log all significant actions using `logPolicyActivity()` from `policyService.ts`

### Token Generation
Use services from `actorTokenService.ts` - tokens expire in 7 days

### Email Sending
Use `sendActorInvitation()` from `emailService.ts` - handles fallback providers

---

## 🤝 Team Notes

### Important Decisions Made
1. **Automatic Invitations** - Enabled by default on policy creation
2. **Token Expiry** - 7 days for actor tokens
3. **Minimum References** - 3 required for all actors
4. **Status Progression** - Automatic when all actors complete
5. **Language** - Spanish for actor-facing content, English for internal

### Known Limitations
1. No bulk policy import
2. No policy templates/drafts
3. No multi-language support (Spanish only for actors)
4. No mobile app
5. No real-time notifications (email only)

---

## 💡 Tips for Next Session

1. **Start with:** Read this file, check `IMPLEMENTATION_PLAN.md` for detailed progress
2. **Test tokens:** Use Prisma Studio to find valid tokens for testing actor portal
3. **Check emails:** Email sending might fail in dev without proper config
4. **Database state:** Run seed to ensure packages exist
5. **Hot reload issues:** If changes don't reflect, restart dev server

### New Components Structure (2025-09-16)
- All policy detail components are now in `/src/components/policies/details/`
- `ActorCard` is the unified component for all actor types
- Document download uses `/api/documents/[id]/download` with 30-second signed URLs
- `useDocumentDownload` hook handles all download logic

---

**End of Session Context Document**
