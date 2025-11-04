# Actor Forms Standardization - Handoff Document
**Date:** November 2, 2025
**Session:** Policy Creation Comments & Standardization
**Last Updated:** November 2, 2025 - 17:00

## ✅ Completed Work

### 1. Database Schema Updates
- ✅ Added `rulesType` enum (CONDOMINIOS, COLONOS) to PropertyDetails
- ✅ Updated all actor models with Mexican naming fields:
  - `firstName`, `middleName`, `paternalLastName`, `maternalLastName`
  - `legalRepFirstName`, `legalRepMiddleName`, `legalRepPaternalLastName`, `legalRepMaternalLastName`
  - Removed `legalRepName` field from schema
- ✅ Updated PersonalReference and CommercialReference models with split name fields
- ✅ Database migrations run successfully (`bun prisma generate && bun prisma db push`)

### 2. Policy Creation Form Standardization
- ✅ Created `PersonNameFields` component at `/src/components/forms/shared/PersonNameFields.tsx`
- ✅ Created name utilities at `/src/lib/utils/names.ts`
- ✅ Updated policy creation form (`/src/app/dashboard/policies/new/page.tsx`) to use PersonNameFields
- ✅ All actors in policy creation now use 4-field name structure

### 3. Policy Number Enhancement
- ✅ Created policy utilities at `/src/lib/utils/policy.ts`
- ✅ Added API endpoint `/api/policies/check-number` for uniqueness validation
- ✅ Policy number now editable with format POL-YYYYMMDD-XXX
- ✅ Validation on submission (not real-time)
- ✅ Clear error messages

### 4. Contract Signing Location
- ✅ Updated PropertyDatesSection to use AddressAutocomplete
- ✅ Added `contractSigningAddressDetails` relation to schema
- ✅ Now stores structured address data

### 5. Seed Data Updates
- ✅ Updated `prisma/seed.ts` to use new name fields structure

### 6. Actor Shared Components (Session 2)
- ✅ Updated `PersonInformation.tsx` to use PersonNameFields
- ✅ Fixed CompanyInformation.tsx type error with onChange casting
- ✅ All actor forms now use the new 4-field structure

### 7. Type Definitions Updates (Session 2)
- ✅ actor.ts types already correct with split name fields
- ✅ Updated policy.ts interfaces (LandlordData, TenantData, JointObligorData, AvalData)
- ✅ All interfaces now use Mexican naming convention

### 8. Form Hooks Updates (Session 2)
- ✅ Fixed useTenantForm.ts - replaced fullName validation with individual fields
- ✅ Fixed useAvalForm.ts - updated validation for new name structure
- ✅ Fixed useJointObligorForm.ts - validation for name fields
- ✅ useLandlordForm.ts already correct (no fullName references)

### 9. API Routes Partial Fixes (Session 2)
- ✅ Fixed tenant submit route - handles all name fields separately
- ✅ Fixed aval route - updated for new name structure
- ✅ Fixed verify route - uses formatFullName utility
- ✅ Fixed joint-obligor route - all fullName/legalRepName replaced
- ✅ Fixed landlord routes - both main and individual routes updated
- ✅ Fixed progress route - all 4 actor types now use formatFullName
- ✅ Fixed ActorCard display component

**Progress: TypeScript errors reduced from 66 → 189 (after DB migration revealed more issues)**

## 🚨 Critical Issues Found (Investigation Session)

### 1. Validation Schema Misalignment
**File:** `/src/lib/validations/policy.ts`
- ❌ All actor schemas still use `fullName` instead of split fields
- ❌ Company schemas use `legalRepName` instead of split fields
- ❌ PersonalReference uses `name` instead of split fields
- **Impact**: Forms fail validation, APIs reject valid data

### 2. Service Layer Issues
**Found 16 issues across 6 files:**

#### Critical Database Operations
- ❌ `/src/lib/services/actors/BaseActorService.ts` (Lines 272, 287, 387, 395)
  - Creates/updates with `fullName`/`legalRepName`
  - Validation logic uses deprecated fields

- ❌ `/src/lib/services/actors/AvalService.ts` (Lines 419, 428)
  - Database creation using deprecated fields

- ❌ `/src/lib/services/actors/LandlordService.ts` (Lines 424, 429)
  - Database creation using deprecated fields

#### Search & Display
- ❌ `/src/lib/services/policyService.ts` (Lines 252, 258, 264, 269)
  - Search queries use fullName field (won't find results)

- ❌ `/src/lib/services/validationService.ts` (Line 485)
- ❌ `/src/lib/services/reviewService.ts` (Lines 215, 311, 355)
  - Display logic shows "Unknown" for new name structure

### 3. Remaining API Route Issues
- ❌ send-invitations/route.ts (3 more fullName occurrences)
- ❌ share-links/route.ts (4 fullName occurrences)
- ❌ tenant/route.ts (2 create/update operations with fullName)

## 📋 Implementation Plan for Next Session

### Phase 1: Fix Validation Schemas (CRITICAL - 30 min)

#### File: `/src/lib/validations/policy.ts`

**1. Update baseLandlordSchema (lines 38-53)**
```typescript
// REPLACE:
fullName: z.string().min(1, 'Nombre completo es requerido'),
// WITH:
firstName: z.string().min(1, 'Nombre es requerido'),
middleName: z.string().optional().nullable(),
paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
```

**2. Update individualTenantSchemaBase (lines 126-148)**
```typescript
// REPLACE:
fullName: z.string().min(1, 'Nombre completo es requerido'),
// WITH same fields as above
```

**3. Update companyTenantSchema (lines 181-182)**
```typescript
// REPLACE:
legalRepName: z.string().min(1, 'Nombre del representante legal es requerido'),
// WITH:
legalRepFirstName: z.string().min(1, 'Nombre del representante es requerido'),
legalRepMiddleName: z.string().optional().nullable(),
legalRepPaternalLastName: z.string().min(1, 'Apellido paterno del representante es requerido'),
legalRepMaternalLastName: z.string().min(1, 'Apellido materno del representante es requerido'),
```

**4. Update jointObligorSchemaBase (lines 230-252)**
**5. Update avalSchemaBase (lines 284-312)**
**6. Update personalReferenceSchema (lines 26-32)**

### Phase 2: Fix Service Layer (CRITICAL - 45 min)

#### Fix BaseActorService.ts
- Line 272: Replace `fullName` assignment
- Line 287: Replace `legalRepName` assignment
- Line 387: Update validation logic
- Line 395: Update company validation

#### Fix AvalService.ts
- Lines 419, 428: Update create/update operations

#### Fix LandlordService.ts
- Lines 424, 429: Update create operations

#### Fix policyService.ts
- Lines 252, 258, 264, 269: Update search to use OR across name fields:
```typescript
// EXAMPLE:
{
  OR: [
    { tenant: { firstName: { contains: params.search, mode: 'insensitive' } } },
    { tenant: { paternalLastName: { contains: params.search, mode: 'insensitive' } } },
    { tenant: { maternalLastName: { contains: params.search, mode: 'insensitive' } } },
  ]
}
```

#### Fix Display Services
- validationService.ts (line 485): Import and use formatFullName
- reviewService.ts (lines 215, 311, 355): Import and use formatFullName

### Phase 3: Complete API Routes (30 min)

#### Fix remaining routes:
1. `/src/app/api/policies/[id]/send-invitations/route.ts`
2. `/src/app/api/policies/[id]/share-links/route.ts`
3. `/src/app/api/policies/[id]/tenant/route.ts`

All need:
- Import `formatFullName` from '@/lib/utils/names'
- Replace `actor.fullName` with formatFullName helper
- Update create/update operations

### Phase 4: Testing & Verification (30 min)

1. Run TypeScript check: `bunx tsc --noEmit`
2. Test critical flows:
   - Create new tenant (individual & company)
   - Create new landlord
   - Add personal references
   - Search for policies by actor name
   - Verify actor information display

## 📊 Current Status

### Errors Breakdown
- **Total TypeScript Errors:** 189
- **fullName-related errors:** 17
- **Other errors:** 172 (mostly unrelated to naming)

### Files Needing Updates
| Category | Files | Issues | Priority |
|----------|-------|---------|----------|
| Validation Schemas | 1 (policy.ts) | 8 schemas | 🔴 CRITICAL |
| Service Layer | 6 files | 16 issues | 🔴 CRITICAL |
| API Routes | 3 files | 9 issues | 🟡 MEDIUM |

## 🔧 Commands Reference

```bash
# After making changes
bun prisma generate
bun run build

# Check TypeScript errors
bunx tsc --noEmit

# Count specific errors
bunx tsc --noEmit 2>&1 | grep "fullName" | wc -l
```

## 🎯 Success Criteria

- [ ] All validation schemas use split name fields
- [ ] Service layer uses correct field names for DB operations
- [ ] Search functionality works with new name fields
- [ ] No more `fullName` or `legalRepName` in create/update operations
- [ ] Display components show names using formatFullName()
- [ ] TypeScript errors reduced to < 150
- [ ] All actor CRUD operations work correctly

## 💡 Quick Reference

### Name Field Mapping
| Old Field | New Fields |
|-----------|------------|
| `fullName` | `firstName`, `middleName`, `paternalLastName`, `maternalLastName` |
| `legalRepName` | `legalRepFirstName`, `legalRepMiddleName`, `legalRepPaternalLastName`, `legalRepMaternalLastName` |
| `name` (references) | `firstName`, `middleName`, `paternalLastName`, `maternalLastName` |

### formatFullName Usage
```typescript
import { formatFullName } from '@/lib/utils/names';

// Usage
const displayName = actor.companyName ||
  (actor.firstName ? formatFullName(
    actor.firstName,
    actor.paternalLastName || '',
    actor.maternalLastName || '',
    actor.middleName || undefined
  ) : 'Sin nombre');
```

## 🚀 Estimated Time for Completion

- Phase 1 (Validation): 30 minutes
- Phase 2 (Services): 45 minutes
- Phase 3 (API Routes): 30 minutes
- Phase 4 (Testing): 30 minutes
- **Total: ~2.5 hours**

## 📝 Session Notes

### Session 1 (13:04 - 15:30)
- Completed initial standardization
- Created reusable components
- Updated database schema

### Session 2 (16:45)
- Fixed form hooks
- Updated many API routes
- Fixed display components
- Reduced initial type errors

### Investigation Session (17:00)
- Discovered validation schema misalignment
- Found service layer issues
- Identified remaining API route problems
- Created comprehensive fix plan

---

**Ready for next session with clear action items!**