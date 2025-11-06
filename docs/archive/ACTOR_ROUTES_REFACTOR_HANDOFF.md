# Actor Routes Refactor - Handoff Document
**Date:** November 2, 2025
**Session:** Actor Routes Consolidation
**Status:** In Progress - Phase 1 (Service Layer) 25% Complete

## 🎯 Objective
Consolidate duplicate actor routes (`/api/admin/actors/` and `/api/actor/`) into a single unified API structure at `/api/actors/` to improve maintainability and eliminate code duplication.

## ✅ Completed Work

### 1. Comprehensive Analysis (COMPLETE)
- Analyzed all 18+ route files across admin and actor directories
- Identified duplicate logic and differences
- Documented service layer capabilities
- Created detailed refactor plan

### 2. TenantService.validateAndSave (COMPLETE)
**File:** `/src/lib/services/actors/TenantService.ts`
- ✅ Implemented full validateAndSave method (lines 101-321)
- ✅ Extracts all logic from `/api/actor/tenant/[token]/submit/route.ts`
- ✅ Handles token validation, partial/final submissions
- ✅ Manages addresses (current, employer, previous rental)
- ✅ Handles references
- ✅ Triggers policy status transitions
- ✅ Added missing error codes (TOKEN_EXPIRED, ALREADY_COMPLETE)

**Key Features:**
- Token validation with expiry check
- Partial save (PUT) vs final submission (POST)
- All tenant fields including new name fields (firstName, middleName, etc.)
- Address management with upsertAddress
- Reference management
- Activity logging
- Policy status transition on completion

### 3. Error Types Updated
**File:** `/src/lib/services/types/errors.ts`
- Added `TOKEN_EXPIRED` to auth errors
- Added `ALREADY_COMPLETE` to business logic errors

## 🚧 In Progress

### JointObligorService.validateAndSave (STARTED)
**File:** `/src/lib/services/actors/JointObligorService.ts`
- Need to add validateAndSave method before line 476
- Should follow same pattern as TenantService
- Extract logic from `/api/actor/joint-obligor/[token]/submit/route.ts`

## 📋 Remaining Todo Items

### Phase 1: Service Layer (75% remaining)
1. ❌ **Complete JointObligorService.validateAndSave**
   - Add method similar to TenantService
   - Handle property guarantee logic
   - Handle marriage information for property guarantee

2. ❌ **Create ActorAuthService**
   **New File:** `/src/lib/services/ActorAuthService.ts`
   ```typescript
   class ActorAuthService {
     async resolveActorAuth(type: string, identifier: string, request: Request) {
       // Check if identifier is UUID (admin) or token (actor)
       // Validate session for admin, token for actor
       // Return { actor, authType: 'admin' | 'actor', user?, canEdit, skipValidation }
     }
   }
   ```

3. ❌ **Create ActorDocumentService**
   **New File:** `/src/lib/services/ActorDocumentService.ts`
   - Extract shared logic from document routes
   - Methods: `upload()`, `list()`, `delete()`, `download()`
   - Handle both admin and actor contexts

4. ❌ **Create PolicyStatusService**
   **New File:** `/src/lib/services/PolicyStatusService.ts`
   ```typescript
   class PolicyStatusService {
     async checkAndTransition(policyId: string) {
       // Check if all actors complete
       // Transition to UNDER_INVESTIGATION if ready
     }
   }
   ```

5. ❌ **Create service factory**
   **New File:** `/src/lib/services/actors/index.ts`
   ```typescript
   export function getServiceForType(type: string) {
     switch(type) {
       case 'tenant': return tenantService;
       case 'landlord': return landlordService;
       case 'joint-obligor': return jointObligorService;
       case 'aval': return avalService;
       default: throw new Error(`Invalid actor type: ${type}`);
     }
   }
   ```

### Phase 2: Create Unified Routes (0% complete)

6. ❌ **Main Actor Route**
   **New File:** `/src/app/api/actors/[type]/[identifier]/route.ts`
   - GET - Fetch actor data (replaces validate endpoints)
   - PUT - Partial update
   - POST - Final submission
   - DELETE - Remove actor (admin only)
   - Use withRole middleware for admin operations
   - Use ActorAuthService to resolve auth type

7. ❌ **Document Route**
   **New File:** `/src/app/api/actors/[type]/[identifier]/documents/route.ts`
   - GET - List documents
   - POST - Upload document
   - DELETE - Remove document
   - Unified handling for both admin and actors

8. ❌ **Document Download Route**
   **New File:** `/src/app/api/actors/[type]/[identifier]/documents/[documentId]/route.ts`
   - GET - Download document

### Phase 3: Cleanup (0% complete)

9. ❌ **Delete old admin routes**
   - Remove entire `/src/app/api/admin/actors/` directory
   - 8 route files to delete

10. ❌ **Delete old actor routes**
    - Remove entire `/src/app/api/actor/` directory
    - 10+ route files to delete

11. ❌ **Test unified routes**
    - Test both admin and actor authentication
    - Test validation skipping for admin
    - Test status transitions
    - Test document operations

## 🔑 Key Implementation Details

### Authentication Strategy
```typescript
// Dual-mode authentication
if (isUUID(identifier)) {
  // Admin flow - check session
  return withRole(request, [ADMIN, STAFF, BROKER], handler);
} else {
  // Actor flow - validate token
  const validation = await validateActorToken(type, identifier);
}
```

### Validation Control
```typescript
// Admin/Staff skip validation
const skipValidation = ['ADMIN', 'STAFF'].includes(user.role);

// Actors always validate
const result = service.validateAndSave(token, data, isPartial);
```

### Service Methods Pattern
All actor services should have:
- `save(id, data, isPartial, skipValidation)` - For admin
- `validateAndSave(token, data, isPartial)` - For actors
- `getById(id)` - Common
- `validate(data, isPartial)` - Common

### withRole Middleware Usage
```typescript
import { withRole } from '@/lib/auth/middleware';

export async function PUT(request, { params }) {
  const auth = await ActorAuthService.resolveActorAuth(...);

  if (auth.authType === 'admin') {
    return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
      // Admin logic here
    });
  }

  // Actor logic here
}
```

## 📊 Impact Analysis

### Before Refactor
- 18+ route files across 2 directories
- Duplicate logic in admin vs actor routes
- Inconsistent validation handling
- No centralized auth resolution

### After Refactor
- 6 route files in single directory
- Single source of truth for each operation
- Consistent role-based validation
- Centralized auth with ActorAuthService
- 75% code reduction

## 🚨 Critical Notes

1. **LandlordService and AvalService** already have validateAndSave methods - no changes needed

2. **Name Fields Migration**: All services now use individual name fields:
   - firstName, middleName, paternalLastName, maternalLastName
   - legalRepFirstName, legalRepMiddleName, etc. for companies

3. **Error Handling**: Added new error codes to `/src/lib/services/types/errors.ts`:
   - TOKEN_EXPIRED
   - ALREADY_COMPLETE

4. **Status Transitions**: Must import dynamically to avoid circular dependencies:
   ```typescript
   const { checkPolicyActorsComplete } = await import('@/lib/services/actorTokenService');
   const { transitionPolicyStatus } = await import('@/lib/services/policyWorkflowService');
   ```

## 📝 Next Session Tasks

1. **PRIORITY 1**: Complete JointObligorService.validateAndSave
2. **PRIORITY 2**: Create ActorAuthService
3. **PRIORITY 3**: Create unified main route
4. Continue with remaining services and routes

## 🔧 Commands for Testing

```bash
# Build to check TypeScript
bun run build

# Test actor token validation
curl -X GET http://localhost:3000/api/actors/tenant/[token]

# Test admin access
curl -X GET http://localhost:3000/api/actors/tenant/[uuid] \
  -H "Cookie: session-token=..."
```

## 📚 Reference Files

### Services
- `/src/lib/services/actors/TenantService.ts` ✅ (has validateAndSave)
- `/src/lib/services/actors/LandlordService.ts` ✅ (has validateAndSave)
- `/src/lib/services/actors/AvalService.ts` ✅ (has validateAndSave)
- `/src/lib/services/actors/JointObligorService.ts` ❌ (needs validateAndSave)

### Current Routes (to be deleted)
- `/src/app/api/admin/actors/[type]/[id]/submit/route.ts`
- `/src/app/api/admin/actors/[type]/[id]/documents/route.ts`
- `/src/app/api/actor/[type]/[token]/submit/route.ts`
- `/src/app/api/actor/[type]/[token]/validate/route.ts`

### Middleware
- `/src/lib/auth/middleware.ts` - withRole function

---

**Ready to continue from Phase 1, Step 1: Complete JointObligorService.validateAndSave**