# Service Layer

**Status**: Active (mostly consolidated)
**Last Updated**: January 2026

---

## Purpose

The service layer implements business logic for Hestia. Services abstract database operations, external API calls, and complex business rules away from API routes.

---

## Current Architecture

### Patterns in Use

| Pattern | Count | Description |
|---------|-------|-------------|
| **BaseService** | 14+ services | Class-based with singleton export |
| **Functional** | ~4 services | Pure functions (no DB access) |
| **Class (no base)** | 2 services | Legacy class singletons |

### Services Extending BaseService

```
BaseService (abstract)
├── BaseActorService (abstract)
│   ├── LandlordService
│   ├── TenantService
│   ├── AvalService
│   └── JointObligorService
├── PropertyDetailsService
├── PackageService
├── UserService
├── GoogleMapsService
├── DocumentService
├── UserTokenService
├── PricingService
├── FileUploadService
├── ActorTokenService
└── PolicyWorkflowService
```

### Functional Services (Pure)

These remain functional because they don't need DB access or BaseService benefits:

- `progressService.ts` - Pure calculation functions

### Class Singletons (No BaseService)

- `reviewService.ts` - `class ReviewService`
- `validationService.ts` - `class ValidationService`

---

## Services Catalog

### Actor Services

#### BaseActorService
**File**: `src/lib/services/actors/BaseActorService.ts`
**Pattern**: BaseService (abstract class)

Abstract base for all actor CRUD operations. See [actors/README.md](./actors/README.md).

```typescript
abstract class BaseActorService<T> extends BaseService {
  abstract validatePersonData(data: PersonActorData): Result<PersonActorData>;
  abstract validateCompanyData(data: CompanyActorData): Result<CompanyActorData>;
  async create(data: Partial<T>): AsyncResult<T>;
  async update(id: string, data: Partial<T>): AsyncResult<T>;
}
```

#### Individual Actor Services
- **LandlordService** - `src/lib/services/actors/LandlordService.ts`
- **TenantService** - `src/lib/services/actors/TenantService.ts`
- **AvalService** - `src/lib/services/actors/AvalService.ts`
- **JointObligorService** - `src/lib/services/actors/JointObligorService.ts`

### Policy Services

#### policyService
**File**: `src/lib/services/policyService/index.ts`
**Pattern**: Functional exports

```typescript
import { createPolicy, getPolicies, getPolicyById, logPolicyActivity } from '@/lib/services/policyService';

const policy = await createPolicy(data);
const { policies, pagination } = await getPolicies({ status: 'DRAFT' });
```

#### policyWorkflowService
**File**: `src/lib/services/policyWorkflowService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { transitionPolicyStatus, isTransitionAllowed } from '@/lib/services/policyWorkflowService';

if (isTransitionAllowed(currentStatus, newStatus)) {
  await transitionPolicyStatus(policyId, newStatus, userId);
}
```

#### progressService
**File**: `src/lib/services/progressService.ts`
**Pattern**: Functional exports (pure, no DB)

```typescript
import { calculateActorProgress, calculatePolicyProgress } from '@/lib/services/progressService';

const actorProgress = calculateActorProgress(actor, 'tenant');
const policyProgress = calculatePolicyProgress(policy);
```

### Document Services

#### fileUploadService
**File**: `src/lib/services/fileUploadService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { uploadActorDocument, getDocumentUrl, deleteDocument } from '@/lib/services/fileUploadService';

await uploadActorDocument(file, actorId, actorType, category);
const url = await getDocumentUrl(documentId);
```

#### documentService
**File**: `src/lib/services/documentService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { getDocumentsByActor, getRequiredDocumentTypes } from '@/lib/services/documentService';
```

### Token Services

#### actorTokenService
**File**: `src/lib/services/actorTokenService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { generateActorToken, validateTenantToken } from '@/lib/services/actorTokenService';

const { token, url, expiresAt } = await generateActorToken(actorType, actorId);
const result = await validateTenantToken(token);
```

#### userTokenService
**File**: `src/lib/services/userTokenService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { generatePasswordResetToken, validatePasswordResetToken } from '@/lib/services/userTokenService';
```

### External Services

#### googleMapsService
**File**: `src/lib/services/googleMapsService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { searchPlaces, getPlaceDetails, parseGooglePlaceToAddress } from '@/lib/services/googleMapsService';

const predictions = await searchPlaces(query);
const details = await getPlaceDetails(placeId);
```

#### pricingService
**File**: `src/lib/services/pricingService.ts`
**Pattern**: BaseService (singleton + legacy exports)

```typescript
import { calculatePolicyPricing, getPackageDetails } from '@/lib/services/pricingService';

const pricing = await calculatePolicyPricing(input);
```

### Review & Validation

#### reviewService
**File**: `src/lib/services/reviewService.ts`
**Pattern**: Class singleton (no BaseService)

```typescript
import { reviewService } from '@/lib/services/reviewService';

const reviewData = await reviewService.getPolicyReviewData(policyId);
```

#### validationService
**File**: `src/lib/services/validationService.ts`
**Pattern**: Class singleton (no BaseService)

```typescript
import { validationService } from '@/lib/services/validationService';

const progress = await validationService.getValidationProgress(policyId);
```

### BaseService Pattern Services

#### PropertyDetailsService
**File**: `src/lib/services/PropertyDetailsService.ts`
**Pattern**: BaseService

```typescript
const service = new PropertyDetailsService();
const result = await service.upsert(policyId, data);
if (result.ok) {
  // result.value contains the data
}
```

#### PackageService
**File**: `src/lib/services/packageService.ts`
**Pattern**: BaseService

#### UserService
**File**: `src/lib/services/userService.ts`
**Pattern**: BaseService

---

## BaseService Pattern

All BaseService-extending services now use a consistent pattern:

```typescript
class FooService extends BaseService {
  // Access Prisma via this.prisma
  async getData() {
    return this.prisma.foo.findMany();
  }

  // Log via this.log()
  handleError(err: Error) {
    this.log('error', 'Failed', err);
  }
}

// Singleton export
export const fooService = new FooService();

// Legacy function exports for backwards compatibility
export const getData = fooService.getData.bind(fooService);
```

---

## Result Pattern

Used by some BaseService-extending services for type-safe error handling:

```typescript
type Result<T, E = ServiceError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Usage
const result = await service.findById(id);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error.getUserMessage());
}
```

See [types/README.md](./types/README.md) for detailed Result pattern documentation.

---

## Related Documentation

- [Actor Services](./actors/README.md)
- [BaseService](./base/README.md)
- [Result Types](./types/README.md)
- [Storage](../storage/README.md)
