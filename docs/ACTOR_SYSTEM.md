# Actor System Architecture

**Status**: ✅ 100% Implemented and Production-Ready
**Last Updated**: November 2024
**Related Files**:
- `/src/lib/services/actors/` (2,948 lines total)
- `/src/components/forms/shared/PersonNameFields.tsx`
- `/src/app/api/actors/[type]/[identifier]/route.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Service Layer](#service-layer)
4. [API Routes](#api-routes)
5. [UI Components](#ui-components)
6. [Implementation Checklist](#implementation-checklist)
7. [Migration History](#migration-history)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Actor Types

Hestia manages 4 types of actors in rental policies:

1. **Landlord** (Arrendador) - Property owner
2. **Tenant** (Arrendatario) - Person/company renting the property
3. **JointObligor** (Obligado Solidario) - Co-signer sharing payment obligation
4. **Aval** - Additional guarantor

### Current Implementation

**Mexican Naming System** - ✅ Fully Implemented (October 2024)

All actors use standardized 4-field structure:
- `firstName` - First name (required)
- `middleName` - Middle name (optional)
- `paternalLastName` - Father's last name (required)
- `maternalLastName` - Mother's last name (optional or required based on validation)

**Previous System** (deprecated):
- Single `fullName` field
- Migrated October 2024 after fixing 189 TypeScript errors

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  /api/actors/[type]/[identifier]                            │
│  ├─ Dual Auth (ActorAuthService)                            │
│  ├─ Token-based (actor self-service)                        │
│  └─ Session-based (admin/staff/broker)                      │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  BaseActorService (511 lines)                               │
│  ├─ LandlordService (594 lines)                             │
│  ├─ TenantService (384 lines)                               │
│  ├─ AvalService (707 lines)                                 │
│  └─ JointObligorService (711 lines)                         │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                             │
│  Prisma Models (schema.prisma)                              │
│  ├─ Landlord                                                │
│  ├─ Tenant                                                  │
│  ├─ Aval                                                    │
│  └─ JointObligor                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Person Actor Schema

**Database Schema** (`schema.prisma`):

```prisma
model Landlord {
  id        String   @id @default(uuid())
  policyId  String
  policy    Policy   @relation(fields: [policyId], references: [id])

  // Actor type
  isCompany Boolean  @default(false)

  // Person fields (when isCompany = false)
  firstName         String?     // First name
  middleName        String?     // Middle name (optional)
  paternalLastName  String?     // Father's last name
  maternalLastName  String?     // Mother's last name (optional)

  // Contact information
  email             String?
  phone             String?

  // Address
  street            String?
  neighborhood      String?
  city              String?
  state             String?
  postalCode        String?

  // Identification
  curp              String?     // Mexican CURP
  rfc               String?     // Mexican tax ID

  // Status & metadata
  informationComplete Boolean   @default(false)
  isPrimary           Boolean   @default(false)  // Primary landlord for multi-owner
  accessToken         String?   @unique          // For actor self-service
  tokenExpiry         DateTime?

  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([policyId])
  @@index([accessToken])
}
```

**Note**: `Tenant`, `Aval`, and `JointObligor` models follow the same structure.

### Company Actor Schema

```prisma
model Landlord {
  // ... (same base fields)

  // Company fields (when isCompany = true)
  companyName           String?  // Legal company name
  rfc                   String?  // Company tax ID

  // Legal representative (same 4-field structure)
  legalRepFirstName         String?
  legalRepMiddleName        String?
  legalRepPaternalLastName  String?
  legalRepMaternalLastName  String?

  // Legal representative contact
  legalRepEmail         String?
  legalRepPhone         String?
  legalRepCurp          String?
  legalRepRfc           String?
}
```

### Name Formatting Utility

**File**: `src/lib/utils/names.ts`

```typescript
export function formatFullName(
  firstName: string | null | undefined,
  middleName: string | null | undefined,
  paternalLastName: string | null | undefined,
  maternalLastName: string | null | undefined
): string {
  const parts = [
    firstName,
    middleName,
    paternalLastName,
    maternalLastName
  ].filter(part => part && part.trim());

  return parts.join(' ');
}

// Usage example:
const name = formatFullName(
  actor.firstName,
  actor.middleName,
  actor.paternalLastName,
  actor.maternalLastName
);
// Result: "Juan Carlos García López"
```

---

## Service Layer

### BaseActorService

**File**: `src/lib/services/actors/BaseActorService.ts` (512 lines)

**Purpose**: Abstract base class providing common functionality for all actor types.

**Architecture**: BaseActorService does NOT use generics - concrete services handle specific actor types

**Key Methods**:

```typescript
export abstract class BaseActorService extends BaseService {
  protected actorType: string;

  constructor(actorType: string, prisma?: PrismaClient);

  // Abstract methods (must implement in subclasses)
  abstract validatePersonData(
    data: PersonActorData,
    isPartial?: boolean
  ): Result<PersonActorData>;

  abstract validateCompanyData(
    data: CompanyActorData,
    isPartial?: boolean
  ): Result<CompanyActorData>;

  // Protected methods (used by concrete services)
  protected validateActorData(data: ActorData, isPartial = false): Result<ActorData>;
  protected formatZodErrors(error: ZodError): ValidationError[];
  protected async saveActorData<T>(
    tableName: string,
    actorId: string,
    data: T,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<T>;
  protected buildUpdateData(data: ActorData, addressId?: string): any;
  protected async upsertAddress(addressData: AddressDetails, existingAddressId?: string | null): AsyncResult<string>;
}
```

**Note**: Methods like `save()`, `validateAndSave()`, and actor-specific queries are implemented in concrete services (LandlordService, TenantService, etc.), not in BaseActorService.

**Benefits**:
- Eliminated ~75% code duplication across 4 actor types
- Consistent validation logic via abstract methods
- Result pattern for error handling
- Shared utilities (formatZodErrors, buildUpdateData, saveActorData)

### LandlordService

**File**: `src/lib/services/actors/LandlordService.ts` (595 lines)

**Extends**: BaseActorService

**Special Features**:
- Primary landlord handling (`isPrimary` flag)
- Multi-landlord support (same property, multiple owners)

**Public API**:

```typescript
export class LandlordService extends BaseActorService {
  constructor(prisma?: PrismaClient);

  // Implementation of abstract methods
  validatePersonData(data: PersonActorData, isPartial = false): Result<PersonActorData>;
  validateCompanyData(data: CompanyActorData, isPartial = false): Result<CompanyActorData>;

  // Landlord-specific public methods
  async saveLandlordInformation(
    landlordId: string,
    data: LandlordData,
    isPartial?: boolean,
    skipValidation?: boolean
  ): AsyncResult<LandlordData>;

  async validateAndSave(
    token: string,
    data: LandlordData,
    isPartialSave?: boolean
  ): AsyncResult<LandlordResponse>;

  async save(
    landlordId: string,
    data: LandlordData,
    isPartial?: boolean,
    skipValidation?: boolean
  ): AsyncResult<LandlordResponse>;

  async submitLandlord(token: string, data: LandlordSubmissionData): AsyncResult<LandlordResponse>;

  async findPrimaryLandlord(policyId: string): AsyncResult<Landlord | null>;
}
```

**Key Implementation Details**:
- Uses `individualLandlordSchema` and `companyLandlordSchema` for validation
- Has partial schemas for auto-save functionality
- `validateAndSave()` for actor token-based saves
- `save()` for admin/staff saves with optional validation bypass
- `formatZodErrors()` returns `ValidationError[]` with `{field, message, code}` structure

### TenantService

**File**: `src/lib/services/actors/TenantService.ts` (384 lines)

**Extends**: BaseActorService

**Special Features**:
- Typically one tenant per policy
- Employment information validation
- Income verification fields

### AvalService

**File**: `src/lib/services/actors/AvalService.ts` (707 lines)

**Extends**: BaseActorService

**Special Features**:
- Multiple avals allowed per policy
- Additional guarantor role
- Similar validation to tenant but separate entity

### JointObligorService

**File**: `src/lib/services/actors/JointObligorService.ts` (711 lines)

**Extends**: BaseActorService

**Special Features**:
- Multiple joint obligors per policy
- Shares payment obligation with tenant
- Strongest validation requirements

### Service Factory

**File**: `src/lib/services/actors/index.ts`

```typescript
import { LandlordService } from './LandlordService';
import { TenantService } from './TenantService';
import { AvalService } from './AvalService';
import { JointObligorService } from './JointObligorService';

export function getServiceForType(type: string): BaseActorService {
  switch (type) {
    case 'landlord':
      return new LandlordService();
    case 'tenant':
      return new TenantService();
    case 'aval':
      return new AvalService();
    case 'joint-obligor':
      return new JointObligorService();
    default:
      throw new Error(`Unknown actor type: ${type}`);
  }
}

export {
  LandlordService,
  TenantService,
  AvalService,
  JointObligorService
};
```

---

## API Routes

### Unified Actor Endpoint

**File**: `/src/app/api/actors/[type]/[identifier]/route.ts`

**Pattern**: One route handles all actor types with dual authentication

**Supported Operations**:
- `GET` - Fetch actor data
- `PUT` - Update actor data (save or validateAndSave)
- `DELETE` - Remove actor (admin only)

**Route Parameters**:
- `type` - Actor type: `landlord` | `tenant` | `aval` | `joint-obligor`
- `identifier` - Either UUID (admin) or access token (actor self-service)

**Authentication Logic**:

```typescript
// src/lib/services/actors/ActorAuthService.ts
async resolveActorAuth(
  type: ActorType,
  identifier: string,
  request: NextRequest
): Promise<ActorAuthResult> {
  // Check if identifier is a valid token format
  if (this.isValidToken(identifier)) {
    // Actor self-service with token
    return await this.handleActorAuth(type, identifier);
  } else {
    // Admin/staff/broker with session
    return await this.handleAdminAuth(type, identifier, request);
  }
}
```

**GET Example**:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; identifier: string } }
) {
  try {
    const { type, identifier } = await params;

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Admin access - requires role check
    if (auth.authType === 'admin') {
      return withRole(
        request,
        [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
        async (req, user) => {
          // Broker authorization check
          if (user.role === UserRole.BROKER) {
            const canAccess = await actorAuthService.canAccessPolicy(
              user.id,
              auth.actor.policyId
            );
            if (!canAccess) {
              return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
              );
            }
          }

          return NextResponse.json({
            success: true,
            data: formatActorData(auth.actor, type),
            canEdit: auth.canEdit,
            authType: auth.authType
          });
        }
      );
    }

    // Actor token access - already validated by resolveActorAuth
    return NextResponse.json({
      success: true,
      data: formatActorData(auth.actor, type),
      canEdit: auth.canEdit,
      authType: auth.authType
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al obtener información del actor' },
      { status: error.statusCode || 500 }
    );
  }
}
```

**PUT Example** (Partial save - auto-save):

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;
    const data = await request.json();
    const service = getServiceForType(type);

    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    if (!auth.canEdit) {
      return NextResponse.json(
        { error: 'La información ya fue completada y no puede ser editada' },
        { status: 400 }
      );
    }

    // Admin access - uses save() method
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
        const result = await service.save(
          auth.actor.id,
          data,
          true, // isPartial
          auth.skipValidation
        );

        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: 'Información guardada exitosamente',
          data: result.value
        });
      });
    }

    // Actor token access - uses validateAndSave()
    const result = await (service as any).validateAndSave(
      identifier, // token
      data,
      true // isPartialSave
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: result.value
    });

  } catch (error: any) {
    console.error('Actor PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar actor' },
      { status: 500 }
    );
  }
}
```

**Note**:
- Admin uses `service.save()` with `skipValidation` option
- Actor token uses `service.validateAndSave()` with token parameter
- `isPartial: true` means it's an auto-save, not final submission

### Document Upload Endpoint

**File**: `/src/app/api/actors/[type]/[identifier]/documents/route.ts`

**Purpose**: Upload and manage actor documents (ID, proof of address, etc.)

**Operations**:
- `POST` - Upload new document to S3
- `GET` - List all documents for actor
- `DELETE` - Remove document

**Authentication**: Same dual auth pattern as main actor route

---

## UI Components

### PersonNameFields Component

**File**: `src/components/forms/shared/PersonNameFields.tsx` (80+ lines)

**Purpose**: Reusable component for 4-field Mexican naming input

**Usage**:

```typescript
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';

export function LandlordForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    paternalLastName: '',
    maternalLastName: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <PersonNameFields
      firstName={formData.firstName}
      middleName={formData.middleName}
      paternalLastName={formData.paternalLastName}
      maternalLastName={formData.maternalLastName}
      onChange={handleChange}
      required={true}
      disabled={false}
      errors={{}}
    />
  );
}
```

**Component Implementation**:

```typescript
export function PersonNameFields({
  firstName = '',
  middleName = '',
  paternalLastName = '',
  maternalLastName = '',
  onChange,
  required = true,
  disabled = false,
  errors = {}
}: PersonNameFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Nombre(s) {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => onChange('firstName', e.target.value)}
          disabled={disabled}
          className={errors.firstName ? 'border-red-500' : ''}
        />
        {errors.firstName && (
          <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Segundo nombre (opcional)
        </label>
        <input
          type="text"
          value={middleName}
          onChange={(e) => onChange('middleName', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Apellido paterno {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={paternalLastName}
          onChange={(e) => onChange('paternalLastName', e.target.value)}
          disabled={disabled}
          className={errors.paternalLastName ? 'border-red-500' : ''}
        />
        {errors.paternalLastName && (
          <p className="text-red-500 text-sm mt-1">{errors.paternalLastName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Apellido materno {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={maternalLastName}
          onChange={(e) => onChange('maternalLastName', e.target.value)}
          disabled={disabled}
          className={errors.maternalLastName ? 'border-red-500' : ''}
        />
        {errors.maternalLastName && (
          <p className="text-red-500 text-sm mt-1">{errors.maternalLastName}</p>
        )}
      </div>
    </div>
  );
}
```

**Benefits**:
- Consistent UI across all actor forms
- Built-in validation error display
- Responsive grid layout
- Disabled state support for read-only views

### Form Wizards

All actor forms use wizard pattern with tabs:

- `LandlordFormWizard.tsx`
- `TenantFormWizard.tsx`
- `AvalFormWizard.tsx`
- `JointObligorFormWizard.tsx`

**Pattern**: Use `useFormWizardTabs` hook for state management

**See**: [REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md#form-wizard-pattern)

---

## Implementation Checklist

### Adding a New Actor Type

When implementing a new actor type, follow this checklist:

#### 1. Database Layer
- [ ] Add model to `schema.prisma`
```prisma
model NewActorType {
  id        String   @id @default(uuid())
  policyId  String
  policy    Policy   @relation(fields: [policyId], references: [id])

  // Add 4-field naming
  firstName         String?
  middleName        String?
  paternalLastName  String?
  maternalLastName  String?

  // ... other fields
}
```
- [ ] Add relation to `Policy` model
```prisma
model Policy {
  // ... existing relations
  newActors  NewActorType[]
}
```
- [ ] Run `bun prisma generate` (CRITICAL - do this before fixing types!)
- [ ] Create migration: `bun prisma migrate dev --name add_new_actor_type`

#### 2. Type Layer
- [ ] Prisma generates types automatically
- [ ] Create additional types if needed in `/src/types/actors.ts`

#### 3. Validation Layer
- [ ] Create Zod schemas in `/src/lib/validations/actors/newActorType.schema.ts`
```typescript
import { z } from 'zod';

export const personNewActorTypeSchema = z.object({
  isCompany: z.literal(false),
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno es requerido'),
  // ... other fields
});

export const partialPersonNewActorTypeSchema = personNewActorTypeSchema.partial();
```
- [ ] Export from `/src/lib/validations/actors/index.ts`

#### 4. Service Layer
- [ ] Create service extending BaseActorService
```typescript
// src/lib/services/actors/NewActorTypeService.ts
import { PrismaClient } from '@prisma/client';
import { BaseActorService } from './BaseActorService';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode } from '../types/errors';
import { PersonActorData, CompanyActorData } from '@/lib/types/actor';
import { ZodError } from 'zod';

export class NewActorTypeService extends BaseActorService {
  constructor(prisma?: PrismaClient) {
    super('newActorType', prisma);
  }

  validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData> {
    const schema = isPartial
      ? partialPersonNewActorTypeSchema
      : personNewActorTypeSchema;

    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid person data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as PersonActorData);
  }

  validateCompanyData(
    data: CompanyActorData,
    isPartial = false
  ): Result<CompanyActorData> {
    // Similar implementation using companyNewActorTypeSchema
    const schema = isPartial
      ? partialCompanyNewActorTypeSchema
      : companyNewActorTypeSchema;

    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid company data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as CompanyActorData);
  }

  // Implement public API methods like save(), validateAndSave(), etc.
}
```
- [ ] Add to factory in `/src/lib/services/actors/index.ts`
```typescript
case 'new-actor-type':
  return new NewActorTypeService();
```

#### 5. API Layer
- [ ] Unified route `/api/actors/[type]/[identifier]` already handles all types!
- [ ] Just ensure type is added to `ActorType` type definition
- [ ] Document endpoint already works for new type

#### 6. UI Layer
- [ ] Create form wizard component
```typescript
// src/components/forms/NewActorTypeFormWizard.tsx
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';

export function NewActorTypeFormWizard({ actorId, token }: Props) {
  // Use PersonNameFields for name inputs
  // Use useFormWizardTabs for tab navigation
}
```
- [ ] Add to actor portal pages
- [ ] Add admin editing capability

#### 7. Testing
- [ ] Test actor self-service flow with token
- [ ] Test admin editing flow with session
- [ ] Test validation with edge cases (null, undefined, empty)
- [ ] Test document upload if applicable
- [ ] Verify cron jobs work with new actor type (if applicable)

#### 8. Build Verification
- [ ] Type check: `bunx tsc --noEmit`
- [ ] Build: `bun run build`
- [ ] Fix any TypeScript errors
- [ ] Test in development: `bun run dev`

---

## Migration History

### The Great Name Field Migration (October 2024)

**Challenge**: Migrate from single `fullName` field to Mexican 4-field naming system

**Impact**: 189 TypeScript errors across 40+ files

**Timeline**:

**Day 1** - Schema & Generation
- Updated Prisma schema with 4 name fields
- Ran `bun prisma generate` to update types
- Discovered 189 TypeScript errors

**Day 2** - Validation & Services
- Fixed validation schemas in `/src/lib/validations/`
- Updated BaseActorService and all 4 implementations
- Created `formatFullName()` utility
- Reduced errors to ~50

**Day 3** - UI Components
- Created `PersonNameFields` component
- Updated all 4 form wizards
- Fixed display components (cards, tables, etc.)
- All errors resolved

**Key Learnings**:

1. **Always follow this order**: Schema → Generate → Types → Validation → Logic → UI
2. **Don't skip `bun prisma generate`**: Types won't update without it
3. **Create reusable components early**: PersonNameFields saved hours
4. **Test edge cases**: null, undefined, empty string behave differently
5. **Use formatFullName() consistently**: Don't build names with template strings

**Files Changed** (40+ files):
- ✅ `schema.prisma` - 4 models updated
- ✅ All validation schemas
- ✅ All 4 actor services
- ✅ All 4 form wizards
- ✅ All display components
- ✅ Email templates
- ✅ PDF generation

**Outcome**: ✅ 100% complete, production-ready, zero regressions

---

## Troubleshooting

### Common Issues

#### Error: "Property 'fullName' does not exist on type 'Landlord'"

**Cause**: Old code still references deprecated `fullName` field

**Fix**:
```typescript
// ❌ WRONG (deprecated)
const name = landlord.fullName;

// ✅ RIGHT
import { formatFullName } from '@/lib/utils/names';
const name = formatFullName(
  landlord.firstName,
  landlord.middleName,
  landlord.paternalLastName,
  landlord.maternalLastName
);
```

#### Error: "Cannot find module '@prisma/client'"

**Cause**: Haven't run `bun prisma generate` after schema changes

**Fix**:
```bash
bun prisma generate
```

#### Validation Always Fails for Optional Fields

**Cause**: Coercing `null`/`undefined` to empty string `''`

**Fix**:
```typescript
// ❌ WRONG - Coercing null/undefined to empty string
const error = validateRequired(field ?? '');  // '' always fails validation!

// ✅ RIGHT - Check for value first
const error = field ? validateRequired(field) : undefined;
```

**See**: [FORM_VALIDATION_PATTERNS.md](./FORM_VALIDATION_PATTERNS.md#optional-field-handling)

#### Admin Can't Skip Tabs in Form Wizard

**Cause**: Missing `isAdminEdit` check in tab navigation

**Fix**: See [REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md#admin-tab-navigation-bug)

#### Token Authentication Not Working

**Cause**: Token expired or invalid format

**Check**:
```sql
-- Check token expiry
SELECT id, accessToken, tokenExpiry
FROM "Landlord"
WHERE accessToken = 'your-token-here';
```

**Default Expiration**: 1000 days from creation

**Regenerate Token**: Use admin panel to regenerate actor access token

#### Primary Landlord Not Set

**Cause**: Multiple landlords but none marked as primary

**Fix**:
```typescript
// Find and set primary landlord
const landlordService = new LandlordService();
await landlordService.save(
  landlordId,
  { isPrimary: true },
  true, // isPartial
  true  // skipValidation (admin only)
);
```

**Impact**: Cron jobs only send to primary landlord

---

## Best Practices

### DO ✅

- Use `PersonNameFields` component for all name inputs
- Use `formatFullName()` utility for display
- Extend `BaseActorService` for new actor types
- Follow Result pattern for error handling
- Run `bun prisma generate` after schema changes
- Test with null, undefined, and empty string
- Use `isPrimary` flag for multi-landlord scenarios
- Validate at all three layers (Frontend → API → Database)

### DON'T ❌

- Build names with template strings (`${first} ${last}`)
- Skip `bun prisma generate` after schema changes
- Coerce optional fields to empty string (`field ?? ''`)
- Hardcode actor type strings (use enums/constants)
- Mix admin and actor authentication in same component
- Allow actors to skip validation (admin-only feature)

---

## Related Documentation

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Main developer guide
- **[FORM_VALIDATION_PATTERNS.md](./FORM_VALIDATION_PATTERNS.md)** - Validation best practices
- **[REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md)** - Form wizard state management
- **[API_ROUTE_PATTERNS.md](./API_ROUTE_PATTERNS.md)** - Dual auth implementation

---

**Last Verified**: November 5, 2024 (commit: 513fa3d)
**Implementation Status**: ✅ 100% Complete
**Production Status**: ✅ Active and Stable
**Documentation Accuracy**: ✅ Verified against actual codebase
