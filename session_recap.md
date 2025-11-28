# Session Recap

Consolidated lessons and main issues from all development sessions.

## Fix documents list on landlord info request
**File:** `.claude/sessions/2025-10-10-0000-Fix documents list on landlord info request.md`
### Lessons Learned
1. **API Response Consistency**
- Always use consistent response format across all endpoints
- Standard format: `{ success: boolean, data: {...}, error?: {...} }`
- Include all fields required by consuming components
2. **Document Type Mappings**
- Keep documentType strings consistent between frontend and backend
- Use constants or enums to prevent mapping mismatches
- Validate mappings during development
3. **Form Wizard UX**
- Progressive disclosure works well (Personal → Property → Financial → Documents)
- Each step should save with partial validation
- Final step needs explicit submit with full validation
- Loading states and success feedback are critical
4. **Component Data Flow**
- Server as source of truth (refetch after mutations)
- Don't manually manage state that can be fetched
- Use hooks to centralize data fetching logic
5. **Full vs Partial Validation**
- Allow partial saves during multi-step forms (better UX)
- Require full validation only on final submission
- Backend should differentiate via `partial` flag

---

## Tenant, Oligor and Aval Flows - 2025-10-10 19:53
**File:** `.claude/sessions/2025-10-10-1953-tenant-oligor-aval-flows.md`
### Lessons Learned
1. **Modular architecture pays off** - Reusing components saved hundreds of lines
2. **Progressive disclosure improves UX** - Tab-based flow reduces cognitive load
3. **Auto-save prevents data loss** - Critical for long forms
4. **Conditional validation adds complexity** - But provides flexibility
5. **Consistent patterns across flows** - Makes maintenance easier
6. **Debug logging is essential** - Helps track invitation issues

### Main Issues & Solutions
1. **Problem**: Address saving errors (undefined model)
- **Solution**: Used PropertyAddress model with proper upsert logic
2. **Problem**: Missing employer/rental addresses in database
- **Solution**: Added relations to Prisma schema
3. **Problem**: Aval invitations not being sent
- **Solution**: Added consistent completion checks for all actors
4. **Problem**: Document requirements too rigid
- **Solution**: Made conditional based on actor type and guarantee method
5. **Problem**: Monolithic page components (1000+ lines)
- **Solution**: Refactored to wizard pattern with modular components

---

## Session: Update Mail Look and Field
**File:** `.claude/sessions/2025-10-13-2005-update-mail-look-and-field.md`
### Lessons Learned
1. **Always sync brand assets with design system first** - Initial templates used wrong colors/fonts; checking globals.css early would have prevented rework
2. **React Email is superior to HTML strings** - Type safety, component reusability, and preview capabilities make it worth the migration effort
3. **Centralize configuration early** - Having brand.ts as single source of truth made updates trivial and prevents future drift
4. **Test build after major refactors** - TypeScript caught several issues that would have been runtime errors in production

### Main Issues & Solutions
**Problem 1:** Brand colors in email templates didn't match website
- **Solution:** Audited globals.css, extracted correct color values (#173459, #FF7F50), updated brand.ts
**Problem 2:** Font families inconsistent between emails and web
- **Solution:** Changed from Bw Stretch/Inter to Libre Baskerville/PT Sans to match website typography
**Problem 3:** TypeScript type errors after migration
- **Solution:** Fixed type definitions across 3 commits (e877eed, 5ac3b04)
**Problem 4:** Build verification needed
- **Solution:** Ran `npm run build` to verify no runtime errors, successful compilation

---

## Session: Unify Upload and List Files Components
**File:** `.claude/sessions/2025-10-23-1737-unify upload and list files components.md`
### Lessons Learned
1. **API Contract Alignment**: Always verify actual API response structure vs client expectations
2. **Systematic Migration**: Grep searches are essential for finding all component usages
3. **Delete Old Code**: Removing deprecated components prevents accidental future usage
4. **Progress Tracking**: Real-time progress improves UX significantly for file operations
5. **Centralization Wins**: Single validation/upload/download logic eliminates inconsistencies

### Main Issues & Solutions
**Problem 1**: Download failing with "Invalid response from server"
- **Cause**: API response structure changed from `{url}` to `{data: {downloadUrl}}`
- **Solution**: Updated download functions to read `data.data.downloadUrl`
- **Files**: `src/lib/documentManagement/download.ts`
- **Impact**: Downloads now work correctly
**Problem 2**: Finding all usages of old components
- **Cause**: Multiple old component variants scattered across codebase
- **Solution**: Systematic grep search for `InlineDocumentUpload|DocumentUploadCard|useDocumentManagement`
- **Result**: Found and migrated all 3 remaining files

---

## UX Improvements - 2025-10-24 14:30
**File:** `.claude/sessions/2025-10-24-1430-ux-improvements.md`
### Lessons Learned
1. **Component extraction pays off:** Moving logic to dedicated components dramatically improves maintainability
2. **Less is more:** Removing redundant UI elements improves user focus
3. **Progressive disclosure:** Toggle between info/history keeps interface clean
4. **Inline actions:** Embedding actions in cards reduces clicks and improves workflow

### Main Issues & Solutions
1. **Missing UI component:** No ToggleGroup in UI library
- Solution: Created custom toggle buttons with native HTML/CSS
2. **Import errors:** Missing icon imports
- Solution: Added XCircle icon to imports
3. **TypeScript props:** ActorCard needed additional props
- Solution: Extended interface with onSendInvitation, canEdit, sending

---

## Session: Improve Info Review Flow
**File:** `.claude/sessions/2025-10-26-1026-improve-info-review-flow.md`
### Lessons Learned
1. **Polymorphic Relations**: Using string-based actor types provides flexibility over rigid FK constraints
2. **Progressive Enhancement**: Building UI components that work independently improves maintainability
3. **Activity Logging**: Centralizing through `logPolicyActivity` ensures consistent audit trail
4. **Import Management**: Default vs named exports in Next.js require careful attention

### Main Issues & Solutions
1. **Prisma Import Issues**: Changed from named to default exports (`import prisma from '@/lib/prisma'`)
2. **Missing UI Component**: Created `collapsible.tsx` for accordion functionality
3. **Auth Config Path**: Fixed imports to use `@/lib/auth/auth-config`
4. **Schema Relation Conflict**: Renamed `reviewNotes` to `validationNotes` to avoid field name conflict
5. **Build Errors**: Resolved all TypeScript and Next.js compilation issues

---

## More Minor Fixes - 2025-10-26 18:45
**File:** `.claude/sessions/2025-10-26-1845-more minor fixes.md`
### Lessons Learned
1. Always sanitize user input before using in HTTP headers
2. S3 presigned URLs should be opened directly, not fetched
3. TypeScript types help catch issues like object vs array confusion
4. Backward compatibility is crucial when updating APIs
5. Test with real-world data (special characters, emojis)

---

## Polish the Info Request Flow for Actors - 2025-10-26 19:00
**File:** `.claude/sessions/2025-10-26-1900-polish-the-info-request-flow-for-actors.md`
### Lessons Learned
1. **Plan First**: Creating POLICIES_LIST_REFACTOR.md saved significant time during implementation
2. **DRY Aggressively**: Eliminating duplication (actorTokenService, headers, FieldError) improved maintainability dramatically
3. **Consistent Design**: Small inconsistencies (2 vs 3 columns) compound across multiple pages
4. **React Closures**: Stale closure bugs are subtle but critical - always verify state freshness in callbacks
5. **Component Architecture**: Breaking 639-line files into focused components makes code navigable and testable

---

## Session: Better Progress Page UI
**File:** `.claude/sessions/2025-10-29-0000-better-progress-page-ui.md`
### Main Issues & Solutions
:
1. **SSL Certificate Warnings**
- Problem: Dots in bucket names incompatible with wildcard certificates
- Solution: Renamed buckets using hyphens
2. **Document Display Issues**
- Problem: Duplicate document lists in review
- Solution: Created unified DocumentValidationItem component
3. **TypeScript Errors**
- Problem: landlord/landlords schema mismatch
- Solution: Updated to array-based landlords support
4. **File Size Inconsistency**
- Problem: Code validated 15MB but messages said 5MB
- Solution: Aligned all messages to 15MB
---
## Configuration Changes

---

## Session: Policy Creation Comments Resolution
**File:** `.claude/sessions/2025-11-02-1304-policy-creation-comments.md`
### Main Issues & Solutions
1. **Transaction Isolation Issue**
- **Problem**: Policy status checks reading stale data inside transactions
- **Solution**: Moved checks to route level after transaction commits
2. **Name Field Migration Complexity**
- **Problem**: 66+ TypeScript errors from fullName → 4-field migration
- **Solution**: Systematic update of schemas, types, services, and UI components
3. **Route Duplication**
- **Problem**: 18+ route files with duplicated logic
- **Solution**: Unified routes with dual authentication pattern
4. **Actor Page Breakage**
- **Problem**: Pages expected old response format after refactor
- **Solution**: Updated all 4 actor pages to handle new unified response

---

## Session: Cron Jobs Implementation
**File:** `.claude/sessions/2025-11-04-cron-jobs.md`
### Lessons Learned
1. **Documentation Drift is Real**: Even recent docs (from October 2024) had significant inaccuracies
2. **Line Numbers Don't Last**: File references with line numbers quickly become outdated
3. **Verify, Don't Assume**: Code examples must be extracted from actual files, not written from memory
4. **Schema is Source of Truth**: Database schema field names (e.g., `tokenExpiry`) should be canonical
5. **Pure Functions > Closures**: React hooks using pure functions (like `canAccessTab`) are easier to document accurately
6. **Type Signatures Matter**: Return type documentation (e.g., `ValidationError[]` vs `Record`) is critical for API consumers
7. **Consistent Headers Help**: Adding "Last Verified" with commit hash makes it clear when docs were last checked
8. **Archive > Delete**: Keeping historical docs helps understand evolution and decisions

### Main Issues & Solutions
and Solutions
**Problem 1: Documentation-Code Mismatch**
- **Issue**: Documentation showed `BaseActorService<T>` with generics, but actual code doesn't use generics
- **Impact**: Developers following docs would write incorrect code
- **Solution**: Removed all generic type references, documented actual implementation
**Problem 2: Wrong Return Types**
- **Issue**: `formatZodErrors` documented as returning `Record<string, string>`, actually returns `ValidationError[]`
- **Impact**: Frontend error handling code wouldn't match API responses
- **Solution**: Fixed all references, added proper type definitions
**Problem 3: Missing Method Documentation**
- **Issue**: `getProgress()` method exists in useFormWizardTabs but wasn't documented
- **Impact**: Developers unaware of progress tracking functionality
- **Solution**: Added complete method documentation with return value structure
**Problem 4: Inconsistent Field Naming**
- **Issue**: Mixed use of `tokenExpiration` vs `tokenExpiry` in docs
- **Impact**: Confusion about correct field name
- **Solution**: Verified schema uses `tokenExpiry`, updated all docs
**Problem 5: Stale Code Examples**
- **Issue**: Many code examples didn't match actual implementations
- **Impact**: Copy-pasting from docs would result in errors
- **Solution**: Regenerated all examples from actual source files

---

## Session: Add Internal Code Field to Policy Model
**File:** `.claude/sessions/2025-11-05-2123-fix-policy-model.md`
### Lessons Learned
1. **Optional fields simplify rollout** - No data migration needed for existing records
2. **Placeholder examples crucial** - Help users understand expected format (INV1, CONT 1)
3. **Email exclusion important** - Internal codes should stay internal
4. **Systematic verification** - Checking all 7 email templates prevented data leaks

### Main Issues & Solutions
- **No significant issues** - Implementation was straightforward
- All type checking passed without errors
- Build verification successful on first attempt

---

## Session: Fix Admin Actions
**File:** `.claude/sessions/2025-11-09-1234-fix-admin-actions.md`
### Lessons Learned
1. **Always check internal methods** before adding new ones - often functionality exists but isn't exposed
2. **Schema is truth** - Use Prisma schema as single source, generate everything else
3. **Build-time generation** better than runtime duplication for enums
4. **Complex saves** need to handle nested structures, not just flat objects
5. **Transaction boundaries** critical for multi-table updates

---

## Forgot Password Session - 2025-11-10 15:51
**File:** `.claude/sessions/2025-11-10-1551-forgot-password.md`
### Lessons Learned
1. **Template Consistency**: Always check existing working templates for correct property usage
2. **Brand Config Structure**: The brand config has specific namespaces - not all properties exist under `email.*`
3. **Security First**: Implemented comprehensive security measures from the start
4. **Type Safety**: TypeScript caught potential runtime errors early

### Main Issues & Solutions
1. **Brand Configuration Errors**
- **Problem**: PasswordResetEmail used non-existent brandColors properties
- **Solution**: Compared with working UserInvitationEmail template, replaced 14 incorrect property references
2. **TypeScript Errors**
- **Problem**: Type mismatch (null vs undefined) in reset-password route
- **Solution**: Changed `user.name` to `user.name || undefined`
3. **Rate Limiting Issue**
- **Problem**: Rate limiter prevented testing during development
- **Solution**: Temporarily commented out (lines 17-21) for testing

---

## Session: Pricing Improvements and IVA Implementation
**File:** `.claude/sessions/2025-11-12-pricing-improvements.md`
### Lessons Learned
1. **Always prefer controlled actions** over automatic triggers for expensive operations
2. **Maintain consistent DOM structure** across loading states to prevent layout shifts
3. **Consider regional tax requirements** early in pricing implementations
4. **Text inputs with validation** often provide better UX than HTML5 number inputs
5. **Blur + loading spinner** combination provides clearer state feedback than spinner alone

### Main Issues & Solutions
**Problem 1**: UI content jumping between empty/loading/loaded states
- **Solution**: Created unified component that maintains consistent structure across all states
**Problem 2**: Browser number input inconsistencies (spinner buttons, decimal handling)
- **Solution**: Converted to text inputs with parseFloat/parseInt validation
**Problem 3**: Need for Mexican tax compliance (16% IVA)
- **Solution**: Comprehensive IVA implementation in pricing service and UI
**Problem 4**: Too many unnecessary API calls degrading performance
- **Solution**: Removed automatic calculations, added manual trigger button

---

## tRPC Migration & Actor System Fixes - Nov 17-19, 2024
**File:** `.claude/sessions/2025-11-17-1345-migration-to-trpc.md`
### Lessons Learned
1. **Frontend Transformation**: Better to transform data once at submission point rather than in each schema
2. **Explicit Handling**: Complex fields (arrays, nested objects) need explicit handling
3. **Incremental Migration**: Can add type safety incrementally without breaking existing code

### Main Issues & Solutions
1. **Validation Error on Empty Emails**
- Problem: `personalEmail = ''` failed validation
- Solution: Transform empty strings to null before validation
2. **References Lost on Tab Save**
- Problem: References only sent on final submit
- Solution: Include references in tab save payload
3. **Tab Fields Configuration Confusion**
- Problem: Empty array meant "return all data"
- Solution: Added `isComplexTab()` check, return empty object

---

