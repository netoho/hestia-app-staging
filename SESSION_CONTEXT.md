# Hestia - Rent Insurance Policy Management System
## Session Context & System Overview

**Last Updated:** 2025-12-31
**Current Sprint:** Code Quality & Documentation Cleanup

---

## 🏗️ System Architecture Overview

### Core Purpose
Hestia is a comprehensive rent insurance policy management system designed to protect landlords and provide guarantees for rental agreements in Mexico. The system manages the complete lifecycle of rental insurance policies from creation to activation.

### User Roles
1. **ADMIN** - Full system access, can create users, manage all policies
2. **STAFF** - Can manage policies and incidents, handle investigations
3. **BROKER** - Can create and edit only their own policies

### Policy Actors (Enhanced with Company Support - Session 3-4)
1. **Landlord** (Arrendador) - Property owner (Individual or Company)
   - Individual: Personal info, RFC, bank details
   - Company: Company name, RFC, legal representative
2. **Tenant** (Inquilino) - Renter (Individual or Company)
   - Individual: Personal references, employment info
   - Company: Commercial references, legal representative
3. **Joint Obligor** (Obligado Solidario) - Shares liability (Individual or Company)
   - Individual: Personal references, financial info
   - Company: Commercial references, company details
4. **Aval** - Property guarantee provider (Individual or Company)
   - Unique: Property guarantee section with full property details
   - Supports both individual and company forms

---

## 📁 Key Files & Locations

### Database Schema
- **Schema:** `/prisma/schema.prisma`
- **Seed Data:** `/prisma/seed.ts`

### Core Services
- **Pricing Service:** `/src/lib/services/pricingService.ts` - Handles package pricing, investigation fees, payment splits
- **Actor Token Service:** `/src/lib/services/actorTokenService.ts` - Manages secure tokens for actor self-service (including landlord)
- **Policy Workflow Service:** `/src/lib/services/policyWorkflowService.ts` - State machine for policy status transitions
- **Email Service:** `/src/lib/services/emailService.ts` - Email templates and sending logic (supports all actors)
- **Policy Service:** `/src/lib/services/policyService.ts` - Core policy CRUD operations
- **Google Maps Service:** `/src/lib/services/googleMapsService.ts` - NEW - Address autocomplete, geocoding, parsing
- **Document Categories:** `/src/lib/constants/documentCategories.ts` - NEW - Dynamic document requirements by actor type

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

#### Actor Self-Service (Enhanced - Sessions 2-4)
- `GET /api/actor/tenant/[token]/validate` - Validate tenant token
- `POST /api/actor/tenant/[token]/submit` - Submit tenant information (supports company)
- `GET /api/actor/joint-obligor/[token]/validate` - Validate joint obligor token
- `POST /api/actor/joint-obligor/[token]/submit` - Submit joint obligor information (supports company)
- `GET /api/actor/aval/[token]/validate` - Validate aval token
- `POST /api/actor/aval/[token]/submit` - Submit aval information (supports company)
- `GET /api/actor/landlord/[token]/validate` - Validate landlord token (NEW)
- `POST /api/actor/landlord/[token]/submit` - Submit landlord information (NEW)
- `POST /api/actor/landlord/[token]/documents` - Upload landlord documents (NEW)

#### Address Services (NEW - Session 2)
- `GET /api/address/autocomplete` - Google Maps address autocomplete
- `GET /api/address/details` - Get full address details from place ID

### UI Components

#### Policy Creation (Enhanced - Session 2)
- **Form:** `/src/app/dashboard/policies/new/page.tsx`
  - Multi-tab interface (Property, Pricing, Landlord, Tenant, Guarantors, Review)
  - Package selection with dynamic pricing
  - Tenant/Landlord payment split (0-100%)
  - Auto-send invitations checkbox (includes landlord)
  - **NEW FIELDS (25+):**
    - Property features: parking spaces, furnished, utilities included
    - Financial: IVA handling, tax receipts, maintenance fee, security deposit
    - Contract dates: delivery date, signing date, location
    - Payment: methods, rent increase percentage
    - Google Maps integration for property address
  - Company/Individual toggle for landlord with conditional fields

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

#### Actor Portal (Enhanced - Sessions 2-4)
- **Layout:** `/src/app/actor/layout.tsx`
- **Portal Pages (ALL WITH CUSTOM IMPLEMENTATIONS):**
  - `/src/app/actor/tenant/[token]/page.tsx` - Individual/Company toggle
  - `/src/app/actor/joint-obligor/[token]/page.tsx` - Individual/Company toggle (Session 3)
  - `/src/app/actor/aval/[token]/page.tsx` - Individual/Company + Property Guarantee (Session 3)
  - `/src/app/actor/landlord/[token]/page.tsx` - NEW - Individual/Company support (Session 2)
- **Components:**
  - `/src/components/forms/AddressAutocomplete.tsx` - NEW - Google Maps integration
  - `/src/components/actor/DocumentsTab.tsx` - UPDATED - Dynamic categories (Session 4)
  - `/src/components/actor/EnhancedDocumentsTab.tsx` - UPDATED - Dynamic categories (Session 4)

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
- Primary: SMTP

---

## 🟢 Build Status

**Status:** ✅ Build passing (as of 2025-12-31)
**TypeScript Errors:** Resolved

### Recent Fixes (December 2024)
- ✅ Seed file schema sync (propertyAddress, propertyType, employmentStatus enums)
- ✅ JointObligor `isCompany` → `jointObligorType` enum
- ✅ Aval `isCompany` → `avalType` enum
- ✅ 11 `any` types fixed in services
- ✅ Email templates migrated to React Email
- ✅ Token service consolidated with `generateActorToken()`
- ✅ Unused dependencies removed (firebase, genkit)

### Remaining Work (See BACKLOG.md)
- [ ] Security: Authorization middleware for BROKER role
- [ ] Security: Rate limiting
- [ ] Data: Database transactions for multi-table updates
- [ ] Performance: Database indexes
- [ ] Quality: Remove console.log statements

## 📅 Recent Development Sessions Summary (October 10-12, 2025)

### Session Overview
**Total Sessions:** 5 major sessions
**Total Development Time:** ~46 hours
**Files Changed:** 70+ files
**Code Reduction:** ~3,900 lines removed (87% reduction in actor flows)
**Components Created:** 24+ modular components
**Hooks Created:** 8+ custom hooks

### Sessions Completed:

1. **Fix Documents List on Landlord Info Request** (Oct 10, ~20 hours)
   - Fixed document upload/display API response formats
   - Added final submit button to complete flow
   - Standardized document field naming (uploadedAt → createdAt)

2. **Document Management & PropertyDetails Refactor** (Oct 10, ~2 hours)
   - Created PropertyDetails model separating 30+ fields from Policy
   - Moved financial fields to correct domain (Policy model)
   - Complete document CRUD system with S3 integration
   - Fixed signed URL expiration (10s → 60s)

3. **Tenant, Aval & Joint Obligor Flows** (Oct 10-11, ~18 hours)
   - Refactored all three actor flows to wizard pattern
   - Tenant: 1274 → 207 lines (84% reduction)
   - Aval: 1339 → 161 lines (88% reduction)
   - Joint Obligor: 1292 → 123 lines (90% reduction)
   - Added auto-save per tab functionality

4. **Request Information Flows - Minor Issues** (Oct 11, ~3.5 hours)
   - Fixed Aval flow document category mapping
   - Fixed Joint Obligor 405 error (added missing PUT handler)
   - Removed invalid schema fields and redirects

5. **Fix Joint-Obligor** (Oct 11-12, ~2 hours)
   - Fixed document upload state tracking
   - Added guarantee documents display
   - Implemented completion feedback pattern

## 📅 Session 5: Actor Data Fixes & Architecture Planning (2025-10-10)

### Issues Fixed
1. **Database Unique Constraint Violations (P2002 Error)**
   - Fixed PropertyAddress ID conflicts when saving addresses
   - Cleaned ID and timestamp fields before upsert operations in BaseActorService.ts
   - Modified LandlordService to fetch existing addressId before saves
   - Files Modified:
     - `/src/lib/services/actors/BaseActorService.ts` - upsertAddress method
     - `/src/lib/services/actors/LandlordService.ts` - saveLandlordInformation method
     - `/src/components/actor/landlord/LandlordFormWizard.tsx` - address cleaning logic

2. **Landlord Form Missing Fields**
   - Added missing contact fields (personalEmail, workEmail, workPhone) to submission
   - Fixed field mapping in LandlordFormWizard.tsx relevantFields arrays
   - Both individual and company modes now properly send all fields

3. **Property Details Not Saving/Displaying**
   - Fixed incorrect data initialization (was using landlord data instead of policy data)
   - Cleaned propertyAddressDetails before submission to prevent ID conflicts
   - Fixed minimal data submission for property-only saves
   - Modified property tab to only send essential landlord fields

### Architecture Decision
**Issue:** Property details (30+ fields) mixed with Policy model violates Single Responsibility Principle
**Decision:** Create separate PropertyDetails model with 1:1 relationship to Policy
**Benefits:**
- Clean separation of concerns
- Easier to extend and maintain
- Better type safety
- Optimized queries (can query policy without loading all property details)
**Implementation:** See PROPERTY_DETAILS_REFACTOR.md for detailed spec

## 🔧 Most Common Errors & Solutions

### 1. API Response Format Issues

#### Problem: Response Format Mismatch
**Error:** Frontend expects `{ success: true, data: { ... } }` but API returns `{ documents: [...] }`
**Solution:**
```typescript
// Wrap response in standard format
return NextResponse.json({
  success: true,
  data: { documents: [...] }
});
```
**Occurrences:** Landlord, Tenant, Aval document endpoints

#### Problem: Missing Document Fields
**Error:** `uploadedAt` field missing, components crash
**Root Cause:** Prisma model has `createdAt`, TypeScript expects `uploadedAt`
**Solution:** Rename all references to `createdAt` throughout codebase
**Files Affected:** 10+ document-related files

#### Problem: Document Category Mapping
**Error:** `property_tax_statement` not recognized
**Solution:** Use dynamic mapping from Prisma enum:
```typescript
const categoryMap = Object.values(DocumentCategory).reduce((acc, cat) => {
  acc[cat.toLowerCase()] = cat;
  return acc;
}, {});
```

### 2. Address & Database Issues

#### Problem: PropertyAddress ID Conflicts (P2002)
**Error:** `Unique constraint failed on the fields: (\`id\`)`
**Root Cause:** Submitting address with existing ID
**Solution:**
```typescript
const { id, createdAt, updatedAt, ...cleanAddress } = data.addressDetails;
const address = await prisma.propertyAddress.upsert({
  where: { id: existingId || '' },
  create: cleanAddress,
  update: cleanAddress
});
```

#### Problem: Undefined Prisma Model
**Error:** `Cannot read properties of undefined (reading 'upsert')`
**Example:** `prisma.addressDetails.upsert()` - addressDetails isn't a model
**Solution:** Use correct model: `prisma.propertyAddress.upsert()`

### 3. Actor Flow Issues

#### Problem: 405 Method Not Allowed
**Error:** PUT request to submit route fails
**Root Cause:** Missing PUT handler for auto-save
**Solution:** Add both PUT (partial save) and POST (final submit) handlers
**Pattern:**
```typescript
export async function PUT(req) { /* auto-save */ }
export async function POST(req) { /* final submit */ }
```

#### Problem: Invalid Schema Fields
**Error:** Field doesn't exist in Prisma model
**Example:** `legalRepId` exists in Tenant but not in Aval
**Solution:** Check schema before using fields, document differences

#### Problem: Non-existent Success Page
**Error:** Redirect to `/success` returns 404
**Solution:** Show completion state on same page:
```typescript
const [completed, setCompleted] = useState(false);
// Show success card instead of redirect
```

### 4. Document Management Issues

#### Problem: Document List Growing/Duplicates
**Root Cause:** Manually appending to state array
**Solution:** Refetch from server after mutations:
```typescript
const handleUploadSuccess = async () => {
  await fetchDocuments(); // Server as source of truth
};
```

#### Problem: S3 Signed URL Expiration
**Error:** 403 Access Denied on download
**Root Cause:** 10-second expiration too short
**Solution:** Increase to 60 seconds in S3 provider config

#### Problem: useDocumentManagement Hook Mismatch
**Error:** Hook not returning expected state objects
**Solution:** Use object parameters:
```typescript
// Old: useDocumentManagement(type, id, token, docs)
// New:
useDocumentManagement({
  token,
  actorType: 'joint-obligor',
  initialDocuments
})
```

### 5. Form & UI Issues

#### Problem: Missing Final Submit Button
**Issue:** Users stuck on last tab with no way to complete
**Solution:** Add explicit submit button with `partial: false` flag

#### Problem: Tab Progression Blocked
**Issue:** Documents tab disabled despite previous tabs saved
**Solution:** Check `tabSaved` state instead of `informationComplete`

#### Problem: Date Format Issues
**Error:** ISO dates incompatible with HTML date inputs
**Solution:**
```typescript
const formatDateForInput = (date) => {
  return date ? new Date(date).toISOString().split('T')[0] : '';
};
```

#### Problem: No Completion Feedback
**Issue:** Toast disappears, user unsure if submission succeeded
**Solution:** Add delay and reload data:
```typescript
setTimeout(() => {
  setCompleted(true);
  validateAndLoad();
}, 1500);
```

### 6. Reference Management Issues

#### Problem: References Not Saving
**Root Cause:** Sending wrong structure to API
**Solution:** Delete existing and recreate:
```typescript
await prisma.personalReference.deleteMany({ where: { tenantId } });
await prisma.personalReference.createMany({ data: references });
```

### 7. Common TypeScript Errors

#### Problem: Type Mismatches in API Routes
**Solution:** Use proper Next.js types:
```typescript
import { NextRequest, NextResponse } from 'next/server';
```

#### Problem: Prisma Relations Not Included
**Solution:** Explicitly include relations:
```typescript
include: {
  addressDetails: true,
  employerAddressDetails: true,
  guaranteePropertyDetails: true
}
```

## 🏛️ Architectural Patterns & Best Practices

### 1. Wizard Pattern Implementation
**Benefits:** 84-90% code reduction, improved UX, maintainable code
**Structure:**
```
src/
├── hooks/
│   ├── use[Actor]Form.ts (form state management)
│   └── use[Actor]References.ts (references management)
├── components/actor/[actor]/
│   ├── [Actor]PersonalInfoTab.tsx
│   ├── [Actor]EmploymentTab.tsx
│   ├── [Actor]ReferencesTab.tsx
│   ├── [Actor]DocumentsSection.tsx
│   └── [Actor]FormWizard.tsx (orchestrator)
└── app/actor/[actor]/[token]/page.tsx (thin wrapper)
```

### 2. Actor Submission Route Pattern
**Standard structure for all actor submit routes:**
```typescript
// Helper functions
async function upsertAddresses(data, existingActor) { ... }
async function saveReferences(data, actorId) { ... }

// PUT handler for auto-save (partial validation)
export async function PUT(req) {
  const data = await req.json();
  // Validate token
  // Upsert addresses
  // Update fields (partial save allowed)
  // Save references if provided
  return { success: true };
}

// POST handler for final submission (full validation)
export async function POST(req) {
  const data = await req.json();
  // Validate token
  // Upsert addresses
  // Update all fields + set informationComplete = true
  // Save references
  // Log activity
  // Check if all actors complete → transition policy
  return { success: true, actorsComplete };
}
```

### 3. Address Upsert Pattern
**Always clean data before upsert:**
```typescript
const { id, createdAt, updatedAt, ...cleanAddress } = data.addressDetails;
const address = await prisma.propertyAddress.upsert({
  where: { id: actor.addressId || '' },
  create: cleanAddress,
  update: cleanAddress
});
if (actor.addressId !== address.id) {
  await prisma.[actor].update({
    where: { id: actor.id },
    data: { addressId: address.id }
  });
}
```

### 4. Document Management Best Practices
**Server as source of truth:**
```typescript
// Never manually update state
const handleUpload = async () => {
  await uploadDocument();
  await fetchDocuments(); // Refetch from server
};

// Use object parameters for hooks
useDocumentManagement({
  token,
  actorType: 'tenant',
  initialDocuments
});
```

### 5. Response Format Standardization
**All API responses should follow:**
```typescript
// Success
return NextResponse.json({
  success: true,
  data: { /* actual data */ },
  message?: 'Optional success message'
});

// Error
return NextResponse.json({
  success: false,
  error: 'Error message',
  code?: 'ERROR_CODE'
}, { status: 400 });
```

### 6. Tab-Based Form Management
**Progressive disclosure with auto-save:**
- Each tab saves independently (PUT with partial validation)
- Tabs lock until previous saved (linear progression)
- Visual indicators (checkmarks) for saved tabs
- Final tab has explicit submit (POST with full validation)
- Documents tab waits for all previous tabs

### 7. Completion State Management
**Don't redirect, update state:**
```typescript
// Portal page
const [completed, setCompleted] = useState(false);
const handleComplete = () => {
  setTimeout(() => {
    setCompleted(true);
    validateAndLoad(); // Refetch data
  }, 1500); // Allow toast visibility
};

// Show success card when completed
if (completed) {
  return <SuccessCard />;
}
```

### 8. Reference Management Pattern
**Delete and recreate for updates:**
```typescript
// Always delete existing
await prisma.personalReference.deleteMany({
  where: { tenantId: tenant.id }
});

// Create new set
await prisma.personalReference.createMany({
  data: references.map(ref => ({
    tenantId: tenant.id,
    ...ref
  }))
});
```

### 9. Conditional Field Validation
**Example: Joint Obligor guarantee method:**
```typescript
if (data.guaranteeMethod === 'property') {
  // Validate property fields
  if (!data.propertyValue || data.propertyValue <= 0) {
    errors.push('Property value required');
  }
} else {
  // Validate income fields
  if (!data.monthlyIncome) {
    errors.push('Income required');
  }
}
```

### 10. Document Category Management
**Dynamic categories based on context:**
```typescript
const getDocumentCategories = (isCompany, guaranteeMethod) => {
  const base = isCompany ? COMPANY_DOCS : INDIVIDUAL_DOCS;
  if (guaranteeMethod === 'property') {
    return [...base, 'PROPERTY_DEED', 'PROPERTY_TAX_STATEMENT'];
  }
  return [...base, 'INCOME_PROOF'];
};
```

## 🎯 Major Development Phases Completed

### Phase 1: Database Enhancement (Session 1)
✅ Enhanced all actor models (Landlord, Tenant, JointObligor, Aval)
✅ Added PropertyAddress model
✅ Extended document types to 20 categories
✅ Added 25+ fields to Policy model

### Phase 2: Landlord Flow Implementation (Session 2)
✅ Complete landlord portal with token validation
✅ Document upload system for landlords
✅ Email invitations for landlords
✅ Individual/Company support

### Phase 3: Google Maps Integration (Session 2)
✅ Address autocomplete service
✅ Geocoding and address parsing
✅ AddressAutocomplete component
✅ Integration in all forms

### Phase 4: Admin Form Enhancements (Session 2)
✅ Added 25+ new fields to policy creation
✅ Property features (parking, furnishing, utilities)
✅ Financial details (IVA, maintenance, deposits)
✅ Contract dates and locations
✅ Payment methods configuration

### Phase 5: Company Support for All Actors (Session 3)
✅ Tenant portal - Company/Individual toggle
✅ Joint Obligor - Custom implementation with company support
✅ Aval portal - Property guarantee section + company support
✅ All portals now have commercial/personal references based on type

### Phase 6: Document Categories System (Session 4)
✅ Synchronized TypeScript enum with Prisma (20 categories)
✅ Created document category constants and helpers
✅ Dynamic document requirements by actor type
✅ Company vs Individual document filtering
✅ All components use dynamic categories

### Phase 7: PropertyDetails Model Refactor (Oct 10)
✅ Created separate PropertyDetails model (30+ fields)
✅ Moved financial fields to Policy model (correct domain)
✅ Implemented PropertyDetailsService with full CRUD
✅ Updated all components to use new structure
✅ Code reduction: 1,203 lines removed

### Phase 8: Actor Flow Refactoring (Oct 10-11)
✅ Tenant flow: 1274 → 207 lines (84% reduction)
✅ Aval flow: 1339 → 161 lines (88% reduction)
✅ Joint Obligor flow: 1292 → 123 lines (90% reduction)
✅ Implemented wizard pattern with auto-save
✅ Added multiple address support (current, employer, property guarantee)

### Phase 9: Document Management Enhancement (Oct 10-12)
✅ Fixed S3 signed URL expiration (10s → 60s)
✅ Complete upload/download/delete system
✅ Standardized document field naming (uploadedAt → createdAt)
✅ Dynamic document categories based on actor type
✅ Guarantee documents cross-tab visibility

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

### ✅ Completed Features (99% MVP Complete)
1. **Policy Creation Flow** - Full form with 25+ new fields
2. **Pricing Calculation** - Dynamic pricing with package selection
3. **Actor Token System** - All 4 actor types supported
4. **Email Invitations** - All actors including landlord
5. **Actor Self-Service Portal** - All 4 portals with company support
6. **Workflow State Machine** - Status transitions with validation
7. **Activity Logging** - Audit trail for all actions
8. **Package Management** - Seed data and API endpoints
9. **Policy Details Refactoring** - Component-based architecture
10. **Document Downloads** - Signed S3 URLs with security
11. **Actor Verification** - Approve/reject workflow for STAFF/ADMIN
12. **Document Management System** - Complete upload/download/delete
13. **Multiple Documents per Category** - Dynamic categories by type
14. **Google Maps Integration** - Address autocomplete in all forms
15. **Company/Individual Support** - All actors support both entity types
16. **Property Guarantee System** - Complete for Aval actors
17. **Document Categories** - 20 categories with smart filtering
18. **Landlord Portal** - Complete self-service implementation
19. **Wizard Pattern Implementation** - All actor flows refactored (84-90% code reduction)
20. **Auto-save Functionality** - Tab-by-tab saving with PUT endpoints
21. **Completion Feedback System** - Success states without redirects
22. **Multiple Address Management** - Current, employer, property guarantee addresses
23. **Conditional Validation** - Dynamic requirements based on actor type/method
24. **Cross-tab Document Visibility** - Guarantee docs visible across tabs

## 🚧 Technical Debt & Future Improvements

### Technical Debt to Address

#### High Priority
1. **TypeScript Errors** - ~247 compilation errors remaining
   - PolicyApplicationService needs major refactoring
   - API route type mismatches
   - Prisma relation types need fixing

2. **Missing Authorization** - BROKER role checks incomplete
   - Only 1 endpoint validates ownership
   - Need middleware for policy ownership validation

3. **Database Transactions** - Multi-table updates not atomic
   - Address + Actor updates should be transactional
   - Reference management needs transaction wrapper

#### Medium Priority
1. **Error Handling Inconsistency**
   - Mix of English/Spanish error messages
   - Different response formats across endpoints
   - Missing error boundaries in React components

2. **Performance Optimizations**
   - Missing database indexes on frequently queried fields
   - Large bundle sizes (some pages > 30KB)
   - No query optimization (missing select/include)

3. **Code Quality**
   - 6 TODO comments in workflow service
   - Dead code and unused imports
   - Inconsistent naming conventions

### Future Improvements

#### Short-term (Next Sprint)
1. **Testing Infrastructure**
   - Add unit tests for critical business logic
   - E2E tests for actor flows
   - Integration tests for API endpoints
   - Performance testing for document uploads

2. **Developer Experience**
   - Standardize all hook APIs to object parameters
   - Create shared utilities for common patterns
   - Add TypeScript strict mode
   - Implement ESLint rules for consistency

3. **User Experience**
   - Mobile optimization for actor portals
   - Drag-and-drop document upload
   - Document preview functionality
   - Auto-save with optimistic UI updates
   - Progress persistence across sessions

#### Medium-term (Next Quarter)
1. **Investigation Module**
   - Investigation assignment workflow
   - Document verification interface
   - Risk scoring system
   - Approval/rejection with reasons

2. **Contract Generation**
   - PDF generation with templates
   - Digital signature integration
   - Contract versioning system
   - Amendment management

3. **Payment Integration**
   - Stripe/payment gateway setup
   - Invoice generation
   - Payment tracking dashboard
   - Refund management

4. **Analytics & Reporting**
   - Policy conversion metrics
   - Actor completion rates
   - Document upload analytics
   - Error tracking and monitoring

#### Long-term (Next 6 Months)
1. **Platform Enhancements**
   - Multi-language support (Spanish/English)
   - White-label capability for brokers
   - API for third-party integrations
   - Webhook system for events

2. **Advanced Features**
   - AI-powered document validation
   - Automated risk assessment
   - Predictive analytics for policy approval
   - Chatbot for actor support

3. **Infrastructure**
   - Microservices architecture
   - Event-driven architecture with queues
   - Caching layer (Redis)
   - CDN for static assets

### Lessons Learned

#### What Worked Well
1. **Wizard Pattern** - 84-90% code reduction with better UX
2. **Server as Source of Truth** - Eliminated state sync bugs
3. **Auto-save Pattern** - Prevents data loss, improves UX
4. **Object Parameters for Hooks** - More maintainable and flexible
5. **Explicit State Management** - Better than router tricks

#### Common Pitfalls to Avoid
1. Always check schema before using fields
2. Clean data before upserts (remove id, timestamps)
3. Use correct Prisma models (not relations)
4. Don't redirect to non-existent pages
5. Refetch after mutations (don't manually update state)
6. Include all required relations in queries
7. Test with both individual and company modes
8. Verify token expiration handling
9. Check for missing PUT handlers
10. Ensure consistent response formats

#### Development Best Practices Established
1. **Progressive Disclosure** - Tab-based forms with auto-save
2. **Modular Architecture** - Reusable components and hooks
3. **Standardized Patterns** - Consistent across all flows
4. **Type Safety** - Leverage TypeScript for early error detection
5. **Documentation** - Keep SESSION_CONTEXT.md updated
6. **Code Reviews** - Test all actor flows end-to-end
7. **Performance First** - Optimize queries and bundle sizes
8. **Security by Default** - Token validation, authorization checks
9. **User Feedback** - Toast notifications, loading states, success messages
10. **Error Recovery** - Graceful degradation, helpful error messages


