# Actor Services

**Status**: ✅ Production-Ready Actor Management
**Last Updated**: November 2024
**Total Lines**: 2,948 lines across 6 files

---

## Purpose

Complete CRUD and business logic for all actor types (Landlord, Tenant, Aval, JointObligor). Uses inheritance pattern with `BaseActorService` providing common functionality, and concrete services implementing actor-specific validation and business rules.

---

## Files

- **BaseActorService.ts** (511 lines) - Abstract base class with common actor operations
- **LandlordService.ts** (594 lines) - Landlord-specific service
- **TenantService.ts** (384 lines) - Tenant-specific service
- **AvalService.ts** (707 lines) - Aval (guarantor) service
- **JointObligorService.ts** (711 lines) - Joint obligor service
- **index.ts** (41 lines) - Exports and factory function

---

## Architecture

### Inheritance Hierarchy

```
BaseService (from ../base/)
  ↓
BaseActorService<T> (abstract)
  ├─> LandlordService
  ├─> TenantService
  ├─> AvalService
  └─> JointObligorService
```

### Factory Pattern

```typescript
// Singleton instances
const landlordService = new LandlordService();
const tenantService = new TenantService();
const avalService = new AvalService();
const jointObligorService = new JointObligorService();

// Factory function
export function getServiceForType(type: string) {
  switch(type) {
    case 'landlord': return landlordService;
    case 'tenant': return tenantService;
    case 'joint-obligor': return jointObligorService;
    case 'aval': return avalService;
    default: throw new Error(`Invalid actor type: ${type}`);
  }
}
```

---

## Exports

### Classes

```typescript
export { BaseActorService } from './BaseActorService';
export { LandlordService } from './LandlordService';
export { TenantService } from './TenantService';
export { AvalService } from './AvalService';
export { JointObligorService } from './JointObligorService';
```

### Factory Function

```typescript
export function getServiceForType(
  type: 'landlord' | 'tenant' | 'aval' | 'joint-obligor'
): BaseActorService<any>
```

---

## BaseActorService

**File**: `BaseActorService.ts:1-511`

### Purpose

Abstract base class providing common CRUD operations and validation framework for all actors.

### Type Parameters

```typescript
export abstract class BaseActorService<T> extends BaseService
```

`T` = Actor model type (Landlord, Tenant, Aval, or JointObligor)

### Abstract Methods (Must Implement)

```typescript
protected abstract validatePersonData(
  data: PersonActorData,
  isPartial?: boolean
): Result<PersonActorData>;

protected abstract validateCompanyData(
  data: CompanyActorData,
  isPartial?: boolean
): Result<CompanyActorData>;
```

### Concrete Methods (Inherited by All)

```typescript
async create(data: Partial<T>): AsyncResult<T>;
async update(id: string, data: Partial<T>): AsyncResult<T>;
async findById(id: string): AsyncResult<T | null>;
async findByToken(token: string): AsyncResult<T | null>;
async findByPolicyId(policyId: string): AsyncResult<T[]>;
async validateAndSave(data: ActorData, skipValidation?: boolean): AsyncResult<T>;
async delete(id: string): AsyncResult<void>;
```

### Validation Dispatcher

```typescript
protected validateActorData(
  data: ActorData,
  isPartial = false
): Result<ActorData> {
  if (isPersonActor(data)) {
    return this.validatePersonData(data as PersonActorData, isPartial);
  } else if (isCompanyActor(data)) {
    return this.validateCompanyData(data as CompanyActorData, isPartial);
  }
  return Result.error(new ServiceError(ErrorCode.VALIDATION_ERROR, ...));
}
```

---

## Landlord Service

**File**: `LandlordService.ts:1-594`

### Special Features

- **Primary landlord support** (isPrimary flag)
- **Multi-landlord policies** (same property, multiple owners)
- **Bank information** (for rent payment deposits)

### Key Methods

```typescript
export class LandlordService extends BaseActorService<Landlord> {
  // Validation
  protected validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData>;

  protected validateCompanyData(
    data: CompanyActorData,
    isPartial = false
  ): Result<CompanyActorData>;

  // Business logic
  async findPrimaryLandlord(policyId: string): AsyncResult<Landlord | null>;
  async setPrimaryLandlord(landlordId: string): AsyncResult<Landlord>;
}
```

### Usage Example

```typescript
// File: src/app/api/actors/landlord/[identifier]/route.ts:25-40
import { LandlordService } from '@/lib/services/actors';

const landlordService = new LandlordService();

const result = await landlordService.validateAndSave({
  id: landlordId,
  firstName: 'Juan',
  middleName: 'Carlos',
  paternalLastName: 'García',
  maternalLastName: 'López',
  email: 'juan@example.com',
  phone: '5551234567',
  bankName: 'BBVA',
  accountNumber: '0123456789',
  informationComplete: true
}, false); // Don't skip validation

if (!result.ok) {
  return NextResponse.json(
    { error: result.error.getUserMessage() },
    { status: result.error.statusCode }
  );
}

return NextResponse.json({ success: true, data: result.value });
```

---

## Tenant Service

**File**: `TenantService.ts:1-384`

### Special Features

- **Individual vs Company** tenant types
- **Employment information** validation
- **Income verification**
- **Personal references** (3 required)

### Key Methods

```typescript
export class TenantService extends BaseActorService<Tenant> {
  protected validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData>;

  protected validateCompanyData(
    data: CompanyActorData,
    isPartial = false
  ): Result<CompanyActorData>;

  // Tenant-specific
  async validateReferences(references: PersonalReference[]): Result<void>;
  async calculateIncomeRatio(tenant: Tenant, rentAmount: number): number;
}
```

### Usage Example

```typescript
// File: src/app/api/actors/tenant/[identifier]/route.ts:30-55
import { TenantService } from '@/lib/services/actors';

const tenantService = new TenantService();

const result = await tenantService.validateAndSave({
  id: tenantId,
  tenantType: TenantType.INDIVIDUAL,
  firstName: 'María',
  paternalLastName: 'González',
  maternalLastName: 'Hernández',
  email: 'maria@example.com',
  phone: '5559876543',
  employmentStatus: 'EMPLOYED',
  occupation: 'Software Engineer',
  employerName: 'Tech Corp',
  monthlyIncome: 50000,
  references: [
    { name: 'Pedro López', phone: '5551111111', relationship: 'Friend' },
    { name: 'Ana Martínez', phone: '5552222222', relationship: 'Colleague' },
    { name: 'Carlos Ruiz', phone: '5553333333', relationship: 'Former Landlord' }
  ],
  informationComplete: true
});

if (!result.ok) {
  return NextResponse.json(
    { error: result.error.getUserMessage(), details: result.error.context },
    { status: result.error.statusCode }
  );
}
```

---

## Aval Service

**File**: `AvalService.ts:1-707`

### Special Features

- **Property guarantee** (owns property as guarantee)
- **Property deed number** and registry
- **Property value validation**
- **Personal references**

### Key Methods

```typescript
export class AvalService extends BaseActorService<Aval> {
  protected validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData>;

  protected validateCompanyData(
    data: CompanyActorData,
    isPartial = false
  ): Result<CompanyActorData>;

  // Aval-specific
  async validatePropertyGuarantee(data: PropertyGuaranteeData): Result<void>;
  async calculatePropertyValue(address: string): AsyncResult<number>;
}
```

### Usage Example

```typescript
// File: src/app/api/actors/aval/[identifier]/route.ts:35-60
import { AvalService } from '@/lib/services/actors';

const avalService = new AvalService();

const result = await avalService.validateAndSave({
  id: avalId,
  firstName: 'Roberto',
  paternalLastName: 'Sánchez',
  maternalLastName: 'Torres',
  email: 'roberto@example.com',
  phone: '5554445555',
  occupation: 'Business Owner',
  monthlyIncome: 80000,
  // Property guarantee (required for Aval)
  propertyAddress: 'Av. Insurgentes 1234, Col. Roma, CDMX',
  propertyValue: 3000000,
  propertyDeedNumber: 'DEED-12345',
  propertyRegistry: 'REG-67890',
  references: [/* 3 references */],
  informationComplete: true
});
```

---

## Joint Obligor Service

**File**: `JointObligorService.ts:1-711`

### Special Features

- **Shares payment obligation** with tenant
- **Income requirements** (must meet minimum threshold)
- **Employment verification**
- **Personal references**

### Key Methods

```typescript
export class JointObligorService extends BaseActorService<JointObligor> {
  protected validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData>;

  protected validateCompanyData(
    data: CompanyActorData,
    isPartial = false
  ): Result<CompanyActorData>;

  // JointObligor-specific
  async validateIncomeRequirement(
    income: number,
    rentAmount: number
  ): Result<void>;
}
```

### Usage Example

```typescript
// File: src/app/api/actors/joint-obligor/[identifier]/route.ts:40-65
import { JointObligorService } from '@/lib/services/actors';

const obligorService = new JointObligorService();

const result = await obligorService.validateAndSave({
  id: obligorId,
  firstName: 'Luis',
  paternalLastName: 'Ramírez',
  maternalLastName: 'Flores',
  email: 'luis@example.com',
  phone: '5556667777',
  employmentStatus: 'EMPLOYED',
  occupation: 'Manager',
  employerName: 'Corp Inc',
  monthlyIncome: 60000, // Must be >= 3x rent typically
  incomeSource: 'Salary',
  references: [/* 3 references */],
  informationComplete: true
});
```

---

## Factory Pattern Usage

### Basic Usage

```typescript
// File: src/app/api/actors/[type]/[identifier]/route.ts:45-50
import { getServiceForType } from '@/lib/services/actors';

export async function PUT(
  request: NextRequest,
  { params }: { params: { type: string; identifier: string } }
) {
  const { type, identifier } = await params;
  const body = await request.json();

  // Get appropriate service based on type
  const service = getServiceForType(type);

  const result = await service.validateAndSave(
    { ...body, id: identifier },
    false
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.getUserMessage() },
      { status: result.error.statusCode }
    );
  }

  return NextResponse.json({ success: true, data: result.value });
}
```

### Type-Safe Usage

```typescript
import { getServiceForType } from '@/lib/services/actors';
import type { ActorType } from '@/types/policy';

function handleActor(type: ActorType) {
  const service = getServiceForType(type);
  // service is BaseActorService<any>
  // All methods available: findById, validateAndSave, etc.
}
```

### Direct Import (When Type Known)

```typescript
import { LandlordService } from '@/lib/services/actors';

const landlordService = new LandlordService();
const result = await landlordService.findPrimaryLandlord(policyId);
```

---

## Common Patterns

### Pattern 1: Save Draft (Partial Validation)

```typescript
// User saving progress - allow incomplete data
const result = await service.validateAndSave(
  {
    id: actorId,
    firstName: 'Juan', // Only filled this field
    informationComplete: false
  },
  false // Don't skip validation, but use partial schema
);
```

### Pattern 2: Final Submission (Full Validation)

```typescript
// User submitting complete information
const result = await service.validateAndSave(
  {
    id: actorId,
    ...allRequiredFields,
    informationComplete: true // Triggers full validation
  },
  false
);
```

### Pattern 3: Admin Override (Skip Validation)

```typescript
// Admin can bypass validation
const isAdmin = user.role === UserRole.ADMIN;

const result = await service.validateAndSave(
  data,
  isAdmin && skipValidation // Only admins can skip
);
```

### Pattern 4: Find with Policy Context

```typescript
// Get all actors for a policy
const landlords = await landlordService.findByPolicyId(policyId);
const tenant = (await tenantService.findByPolicyId(policyId))[0];
const avals = await avalService.findByPolicyId(policyId);
const obligors = await obligorService.findByPolicyId(policyId);

// Check if all complete
const allComplete =
  landlords.every(l => l.informationComplete) &&
  tenant?.informationComplete &&
  avals.every(a => a.informationComplete) &&
  obligors.every(o => o.informationComplete);
```

---

## Extending for New Actor Type

### Step 1: Create Service Class

```typescript
// src/lib/services/actors/NewActorService.ts
import { BaseActorService } from './BaseActorService';
import { NewActor } from "@/prisma/generated/prisma-client/enums";
import { PersonActorData, CompanyActorData } from '@/lib/types/actor';
import { Result } from '../types/result';

export class NewActorService extends BaseActorService<NewActor> {
  constructor() {
    super(prisma.newActor, 'newActor');
  }

  protected validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData> {
    const schema = isPartial
      ? partialPersonNewActorSchema
      : personNewActorSchema;

    try {
      const validated = schema.parse(data);
      return Result.ok(validated);
    } catch (error) {
      return Result.error(this.formatValidationError(error));
    }
  }

  protected validateCompanyData(
    data: CompanyActorData,
    isPartial = false
  ): Result<CompanyActorData> {
    // Similar implementation
  }

  // Add actor-specific methods
  async customBusinessLogic(): AsyncResult<something> {
    // ...
  }
}
```

### Step 2: Add to Factory

```typescript
// src/lib/services/actors/index.ts
export { NewActorService } from './NewActorService';
import { NewActorService } from './NewActorService';

const newActorService = new NewActorService();

export function getServiceForType(type: string) {
  switch(type) {
    // ... existing cases
    case 'new-actor':
      return newActorService;
    default:
      throw new Error(`Invalid actor type: ${type}`);
  }
}
```

### Step 3: Use in Routes

```typescript
// src/app/api/actors/[type]/[identifier]/route.ts
// Already works! Factory will return NewActorService for 'new-actor' type
```

---

## Validation Rules

### Person Actor (All Types)

**Required Fields**:
- firstName
- paternalLastName
- maternalLastName
- email (valid format)
- phone (10 digits)

**Optional Fields**:
- middleName
- curp (18 chars if provided)
- rfc (12-13 chars if provided)
- passport

### Company Actor (All Types)

**Required Fields**:
- companyName
- rfc (12-13 chars)
- legalRepFirstName
- legalRepPaternalLastName
- legalRepEmail

**Optional Fields**:
- legalRepMiddleName
- legalRepMaternalLastName
- legalRepPhone
- legalRepCurp

### Actor-Specific Rules

**Tenant**:
- 3 personal references required
- monthlyIncome required (if employed)
- Typically income >= 3x rent (soft validation)

**Aval**:
- Property guarantee fields required
- propertyValue must be positive
- propertyAddress required

**JointObligor**:
- monthlyIncome and incomeSource required
- 3 personal references required

**Landlord**:
- Bank information (optional but recommended)
- isPrimary flag (one must be primary per policy)

---

## Testing

### Unit Test Example

```typescript
import { LandlordService } from '@/lib/services/actors';
import { prismaMock } from '@/tests/mocks/prisma';

describe('LandlordService', () => {
  const service = new LandlordService({ prisma: prismaMock });

  it('should validate and save landlord', async () => {
    const mockLandlord = {
      id: '123',
      firstName: 'Juan',
      paternalLastName: 'García',
      maternalLastName: 'López',
      email: 'juan@example.com',
      phone: '5551234567'
    };

    prismaMock.landlord.update.mockResolvedValue(mockLandlord);

    const result = await service.validateAndSave(mockLandlord);

    expect(result.ok).toBe(true);
    expect(result.value).toEqual(mockLandlord);
  });

  it('should reject invalid email', async () => {
    const invalidData = {
      id: '123',
      firstName: 'Juan',
      email: 'not-an-email' // Invalid!
    };

    const result = await service.validateAndSave(invalidData);

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});
```

---

## Best Practices

### DO ✅

- **Use factory pattern** in unified routes
  ```typescript
  const service = getServiceForType(type);
  ```

- **Use direct import** when type is known
  ```typescript
  const landlordService = new LandlordService();
  ```

- **Allow partial saves** for draft state
  ```typescript
  await service.validateAndSave({ ...data, informationComplete: false });
  ```

- **Set informationComplete = true** only when all required fields filled
  ```typescript
  await service.validateAndSave({ ...completeData, informationComplete: true });
  ```

- **Check primary landlord** when multiple landlords
  ```typescript
  const primary = await landlordService.findPrimaryLandlord(policyId);
  ```

### DON'T ❌

- **Don't skip validation** except for admin overrides
  ```typescript
  // ❌ WRONG
  await service.validateAndSave(data, true); // Always skips!

  // ✅ RIGHT
  await service.validateAndSave(data, isAdmin && userRequestedSkip);
  ```

- **Don't access prisma directly** - use service methods
  ```typescript
  // ❌ WRONG
  await prisma.landlord.update({ where: { id }, data });

  // ✅ RIGHT
  await landlordService.validateAndSave({ id, ...data });
  ```

- **Don't forget Result error handling**
  ```typescript
  // ❌ WRONG
  const result = await service.findById(id);
  const actor = result.value; // Might be undefined!

  // ✅ RIGHT
  const result = await service.findById(id);
  if (!result.ok) return Result.error(result.error);
  const actor = result.value; // Guaranteed to exist
  ```

---

## Related Modules

- **[/src/lib/services/](../README.md)** - Service layer overview
- **[/src/lib/services/base/](../base/README.md)** - BaseService foundation
- **[/src/lib/services/types/](../types/README.md)** - Result pattern
- **[/docs/ACTOR_SYSTEM.md](../../../../docs/ACTOR_SYSTEM.md)** - Complete actor system architecture
- **[/src/lib/validations/](../../validations/README.md)** - Actor validation schemas

---

**Last Verified**: November 2024
**Production Status**: ✅ Handles All Actor CRUD Operations
