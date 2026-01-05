# Deferred Items - Future Session Plans

These items were deferred from the Code Clean session (2026-01-01).
Use these as starting points for future sessions.

---

# DEFERRED ITEM 1: Tab Field Consolidation

## Problem
Two parallel sets of tab field configurations exist:
- Generic `actorTabFields.ts` + specific `*TabFields.ts` files
- `actorConfig.ts` + `actorSectionConfig.ts`

This causes confusion and potential inconsistencies.

## Current Files

### Set 1: Tab Field Definitions
- `src/lib/constants/actorTabFields.ts` - Core mapping
- `src/lib/constants/tenantTabFields.ts` - Tenant-specific
- `src/lib/constants/landlordTabFields.ts` - Landlord-specific
- `src/lib/constants/avalTabFields.ts` - Aval-specific
- `src/lib/constants/jointObligorTabFields.ts` - Joint Obligor-specific

### Set 2: Config Files
- `src/lib/constants/actorConfig.ts` - Tab definitions & capabilities
- `src/lib/constants/actorSectionConfig.ts` - Review flow sections

## Actor Tab Differences

| Actor | Individual Tabs | Company Tabs | Special Fields |
|-------|-----------------|--------------|----------------|
| Landlord | 4: owner, property, financial, docs | 4 (same) | legalRep* for company |
| Tenant | 5: personal, employment, rental, refs, docs | 3: personal, refs, docs | Rental history (individual only) |
| Aval | 5: personal, employment, property, refs, docs | 4: no employment | Marriage info for property |
| Joint Obligor | 5: personal, employment, guarantee, refs, docs | 4: no employment | Flexible guarantee method |

## Key Differences
- Landlord: No refs tab, has financial info
- Tenant: Only actor with rental history
- Aval: Always has property guarantee
- Joint Obligor: Flexible (income OR property)

## Recommended Approach

### Option A: Consolidate to Single Source
1. Merge all tab field definitions into `actorConfig.ts`
2. Delete individual `*TabFields.ts` files
3. Export `getTabFields(actorType, tabName, isCompany)` from actorConfig

### Option B: Document Current State
1. Add clear comments explaining the two systems
2. Document which system is used where
3. Add deprecation notices for eventual consolidation

## Files to Modify
- `src/lib/constants/actorConfig.ts` (main source)
- `src/lib/constants/actorTabFields.ts` (delete or deprecate)
- `src/lib/constants/tenantTabFields.ts` (delete or deprecate)
- `src/lib/constants/landlordTabFields.ts` (delete or deprecate)
- `src/lib/constants/avalTabFields.ts` (delete or deprecate)
- `src/lib/constants/jointObligorTabFields.ts` (delete or deprecate)
- `src/lib/utils/*/prepareForDB.ts` (update imports)

## Questions to Answer First
1. Are both config systems actively used? Where?
2. Do the field lists match between systems?
3. Are there runtime errors from mismatches?

---

# DEFERRED ITEM 2: Actor Polymorphism (~200 `any` usages)

## Problem
~200 `any` type usages across actor-related code reduce type safety.

## Files with Most `any` Usages

| File | Count | Priority |
|------|-------|----------|
| validationService.ts | 10 | High (affects validation) |
| reviewService.ts | 8 | High (affects review flow) |
| AvalService.ts | 10 | Medium |
| BaseActorService.ts | 9 | Medium |
| JointObligorService.ts | 7 | Medium |
| Component form wizards | 35+ | Medium |
| progressService.ts | 6 | Low |

## Common Patterns & Fixes

### Pattern 1: Transaction Parameter (5 occurrences)
```typescript
// Current
protected getPrismaDelegate(tx?: any): Prisma.AvalDelegate

// Fix
protected getPrismaDelegate(tx?: Prisma.TransactionClient): Prisma.AvalDelegate
```
**Files**: BaseActorService.ts, AvalService.ts, TenantService.ts, JointObligorService.ts, LandlordService.ts

### Pattern 2: Data Parameters (8+ occurrences)
```typescript
// Current
async create(data: any): AsyncResult<AvalWithRelations>

// Fix
async create(data: Partial<AvalFormData>): AsyncResult<AvalWithRelations>
```
**Files**: All actor services

### Pattern 3: Reference Arrays (6 occurrences)
```typescript
// Current
async savePersonalReferences(id: string, references: any[]): AsyncResult<void>

// Fix - use existing types
async savePersonalReferences(id: string, references: PersonalReferenceInput[]): AsyncResult<void>
```
**Files**: AvalService.ts, TenantService.ts, JointObligorService.ts

### Pattern 4: Address Details (4 occurrences)
```typescript
// Current
addressDetails?: any;
employerAddressDetails?: any;

// Fix
addressDetails?: AddressDetails;
employerAddressDetails?: AddressDetails;
```
**Files**: BaseActorService.ts

### Pattern 5: Validation/Review Actor Params (18 occurrences)
```typescript
// Current
private calculateActorProgress(policy: any, ...)
async buildActorReviewInfo(actorType: ActorType, actor: any, policy: any)

// Fix - create union type
type ActorData = Landlord | Tenant | Aval | JointObligor;
interface PolicyWithActors {
  landlords?: Landlord[];
  tenant?: Tenant | null;
  jointObligors?: JointObligor[];
  avals?: Aval[];
}
```
**Files**: validationService.ts, reviewService.ts

### Pattern 6: Component Props (35+ occurrences)
```typescript
// Current
interface LandlordFormWizardProps {
  initialData?: any;
  policy?: any;
  onSave: (data: any) => Promise<void>;
}

// Fix
interface LandlordFormWizardProps {
  initialData?: Partial<LandlordWithRelations>;
  policy?: PolicyWithRelations;
  onSave: (data: Partial<LandlordWithRelations>) => Promise<void>;
}
```
**Files**: All `*FormWizard-Simplified.tsx` components

## Existing Types to Use
These types already exist - use them instead of `any`:
- `ActorType` = 'landlord' | 'tenant' | 'aval' | 'jointObligor'
- `LandlordWithRelations`, `TenantWithRelations`, `AvalWithRelations`, `JointObligorWithRelations`
- `PersonalReferenceInput`, `CommercialReferenceInput`
- `AddressDetails`
- `PersonActorData`, `CompanyActorData`

## Implementation Strategy

### Phase 1: Create Base Types (Low risk)
1. Create `ActorData` union type
2. Create `PolicyWithActors` interface
3. Add `Prisma.TransactionClient` type alias

### Phase 2: Fix Services (Medium risk)
1. Fix BaseActorService.ts (affects all services)
2. Fix individual actor services
3. Run type checker after each file

### Phase 3: Fix Validation/Review (Higher risk)
1. Fix validationService.ts
2. Fix reviewService.ts
3. Test validation flows

### Phase 4: Fix Components (Medium risk)
1. Update form wizard props
2. Update component callbacks
3. Test all actor forms

## Files to Modify (Priority Order)
1. `src/lib/services/actors/BaseActorService.ts` - 9 fixes
2. `src/lib/services/validationService.ts` - 10 fixes
3. `src/lib/services/reviewService.ts` - 8 fixes
4. `src/lib/services/actors/AvalService.ts` - 10 fixes
5. `src/lib/services/actors/JointObligorService.ts` - 7 fixes
6. `src/lib/services/actors/LandlordService.ts` - 4 fixes
7. `src/lib/services/actors/TenantService.ts` - 4 fixes
8. `src/components/actor/*/FormWizard-Simplified.tsx` - 35+ fixes
9. `src/lib/services/progressService.ts` - 6 fixes

## Estimated Effort
- Phase 1: 30 mins (create types)
- Phase 2: 2-3 hours (services)
- Phase 3: 1-2 hours (validation/review)
- Phase 4: 2-3 hours (components)
- **Total: ~1 day**

## Questions to Answer First
1. Are `*WithRelations` types complete for all use cases?
2. Do form components need different types than services?
3. Should we add runtime validation or just compile-time types?
