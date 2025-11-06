# Form Validation Patterns

**Status**: ✅ Production Best Practices
**Last Updated**: November 5, 2024 (commit: 513fa3d)
**Related Files**:
- `/src/lib/validations/` - All Zod schemas
- `/src/lib/services/actors/BaseActorService.ts` - Service-layer validation
- `prisma/schema.prisma` - Database constraints

---

## Table of Contents

1. [Overview](#overview)
2. [The Three-Layer Stack](#the-three-layer-stack)
3. [Common Validation Mistakes](#common-validation-mistakes)
4. [Schema Synchronization](#schema-synchronization)
5. [Testing Strategies](#testing-strategies)
6. [Real-World Examples](#real-world-examples)

---

## Overview

Hestia uses a **three-layer validation approach** to ensure data integrity at every level:

1. **Frontend** (Zod) - Immediate user feedback
2. **API** (Service Layer) - Security and business rules
3. **Database** (Prisma) - Final data integrity guarantee

**Why three layers?**
- **Frontend**: User experience - catch errors before submission
- **API**: Security - never trust client-side validation alone
- **Database**: Data integrity - enforce constraints at the source of truth

---

## The Three-Layer Stack

### Layer 1: Frontend Validation (Zod)

**Purpose**: Provide immediate feedback to users before they submit forms

**Location**: `/src/lib/validations/`

**Example** - Person Actor Schema:

```typescript
// File: src/lib/validations/actors/person.schema.ts
import { z } from 'zod';

// Email validation
const emailSchema = z
  .string()
  .email('Correo electrónico inválido')
  .min(1, 'El correo electrónico es requerido');

// Phone validation
const phoneSchema = z
  .string()
  .regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos')
  .min(1, 'El teléfono es requerido');

// Person actor schema
export const personActorSchema = z.object({
  isCompany: z.literal(false),

  // 4-field Mexican naming
  firstName: z.string().min(1, 'El nombre es requerido'),
  middleName: z.string().optional().nullable(),
  paternalLastName: z.string().min(1, 'El apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'El apellido materno es requerido'),

  // Contact
  email: emailSchema,
  phone: phoneSchema,

  // Address
  street: z.string().min(1, 'La calle es requerida'),
  neighborhood: z.string().min(1, 'La colonia es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El estado es requerido'),
  postalCode: z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),

  // Identification
  curp: z.string()
    .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, 'CURP inválido')
    .optional()
    .nullable(),
  rfc: z.string()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-V1-9][A-Z1-9][0-9A]$/, 'RFC inválido')
    .optional()
    .nullable(),
});

// Partial schema for progressive saving (all fields optional)
export const partialPersonActorSchema = personActorSchema.partial();
```

**Usage in Forms**:

```typescript
import { personActorSchema } from '@/lib/validations/actors/person.schema';

export function LandlordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: any) => {
    try {
      // Validate single field
      personActorSchema.shape[field].parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
      }
      return false;
    }
  };

  const validateForm = () => {
    try {
      personActorSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  return (
    // Form JSX with error display
  );
}
```

---

### Layer 2: API Validation (Service Layer)

**Purpose**: Enforce business rules and security (never trust client-side validation)

**Location**: `/src/lib/services/actors/BaseActorService.ts`

**Pattern**: Service layer validates before database operations

```typescript
// File: src/lib/services/actors/BaseActorService.ts (lines 21-81)
export abstract class BaseActorService extends BaseService {
  protected actorType: string;

  constructor(actorType: string, prisma?: PrismaClient);

  // Abstract methods - subclasses must implement
  abstract validatePersonData(
    data: PersonActorData,
    isPartial?: boolean
  ): Result<PersonActorData>;

  abstract validateCompanyData(
    data: CompanyActorData,
    isPartial?: boolean
  ): Result<CompanyActorData>;

  // Validation dispatcher (lines 42-70)
  protected validateActorData(
    data: ActorData,
    isPartial = false
  ): Result<ActorData> {
    try {
      if (isPersonActor(data)) {
        return this.validatePersonData(data as PersonActorData, isPartial);
      } else if (isCompanyActor(data)) {
        return this.validateCompanyData(data as CompanyActorData, isPartial);
      } else {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid actor type: must be either person or company',
            400
          )
        );
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return Result.error(
          new ServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Validation failed',
            400,
            { errors: this.formatZodErrors(error) }
          )
        );
      }
      throw error;
    }
  }

  // Helper to format Zod errors (lines 75-81)
  protected formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }

  // Protected save method used by concrete services (lines 315-365)
  protected async saveActorData<T>(
    tableName: string,
    actorId: string,
    data: T,
    isPartial: boolean = false,
    skipValidation: boolean = false
  ): AsyncResult<T>;
}
```

**Note**: `validateAndSave()` and `save()` methods are implemented in concrete services (LandlordService, TenantService, etc.), not in BaseActorService.

**Concrete Implementation** - LandlordService:

```typescript
// File: src/lib/services/actors/LandlordService.ts (lines 30-75)
export class LandlordService extends BaseActorService {
  constructor(prisma?: PrismaClient) {
    super('landlord', prisma);
  }

  validatePersonData(
    data: PersonActorData,
    isPartial = false
  ): Result<PersonActorData> {
    // Choose schema based on partial/full validation
    const schema = isPartial
      ? partialIndividualLandlordSchema  // Note: "Individual" not "Person"
      : individualLandlordSchema;

    const result = schema.safeParse(data);

    if (!result.success) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid person landlord data',
          400,
          { errors: this.formatZodErrors(result.error) }
        )
      );
    }

    return Result.ok(result.data as PersonActorData);
  }

  // validateCompanyData follows same pattern with companyLandlordSchema
}
```

**Important**: The schema names vary by actor type:
- **Landlord**: `individualLandlordSchema`, `partialIndividualLandlordSchema`
- **Tenant**: `individualTenantSchema`, `partialIndividualTenantSchema`
- **Aval**: `individualAvalSchema`, `partialIndividualAvalSchema`
- **JointObligor**: `individualJointObligorSchema`, `partialIndividualJointObligorSchema`

**formatZodErrors Return Type**:

```typescript
// Type definition
export interface ValidationError {
  field: string;   // e.g., "firstName", "address.street"
  message: string; // e.g., "El nombre es requerido"
  code: string;    // Zod error code, e.g., "invalid_type", "too_small"
}

// Returns array, NOT Record<string, string>
protected formatZodErrors(error: ZodError): ValidationError[]
```

**Usage in API Routes**:

```typescript
// File: src/app/api/actors/[type]/[identifier]/route.ts
export async function PUT(request: NextRequest, { params }) {
  const { type, identifier } = await params;
  const data = await request.json();

  const service = getServiceForType(type);
  const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

  // Actor token access - uses validateAndSave
  const result = await (service as any).validateAndSave(
    identifier,
    data,
    true // isPartialSave
  );

  if (!result.ok) {
    // result.error is a ServiceError
    // result.error.context.errors is ValidationError[]
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.value
  });
}
```

---

### Layer 3: Database Validation (Prisma)

**Purpose**: Final data integrity guarantee at the source of truth

**Location**: `prisma/schema.prisma`

**Example** - Landlord Model:

```prisma
model Landlord {
  id        String   @id @default(uuid())
  policyId  String   // Required reference
  policy    Policy   @relation(fields: [policyId], references: [id])

  // Actor type (Boolean, not nullable)
  isCompany Boolean  @default(false)

  // Person fields (nullable because they're only required when isCompany = false)
  firstName         String?
  middleName        String?
  paternalLastName  String?
  maternalLastName  String?

  // Contact (nullable to allow progressive saving)
  email             String?
  phone             String?

  // Status flags (Boolean with defaults)
  informationComplete Boolean   @default(false)
  isPrimary           Boolean   @default(false)

  // Unique constraints
  accessToken         String?   @unique  // Enforced uniqueness

  // Timestamps (auto-managed)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Indexes for performance
  @@index([policyId])
  @@index([accessToken])
}
```

**Constraints Enforced**:
- `@id` - Primary key constraint
- `@unique` - Uniqueness constraint (accessToken)
- `@default()` - Default values
- Type constraints - String, Boolean, DateTime enforced
- Foreign keys - `@relation` creates FK constraint
- NOT NULL - Non-nullable fields enforced

---

## Common Validation Mistakes

### Mistake 1: Optional Field Coercion ❌

**Problem**: Coercing `null` or `undefined` to empty string `''`

**Wrong Code**:
```typescript
const validateField = (value: string | null | undefined) => {
  // ❌ WRONG: Coercing to empty string
  const normalized = value ?? '';

  // Empty string ALWAYS fails required validation!
  if (!normalized || normalized.trim() === '') {
    return 'Field is required';
  }

  return undefined;
};

// Example:
validateField(null);       // Returns 'Field is required' ✅
validateField(undefined);  // Returns 'Field is required' ✅
validateField('');         // Returns 'Field is required' ✅
// But for OPTIONAL fields, null/undefined should be valid!
```

**Right Code**:
```typescript
const validateField = (
  value: string | null | undefined,
  isRequired: boolean = false
) => {
  // ✅ RIGHT: Handle optional fields properly
  if (!value) {
    return isRequired ? 'Field is required' : undefined;
  }

  if (value.trim() === '') {
    return 'Field cannot be empty';
  }

  return undefined;
};

// OR using Zod:
const optionalFieldSchema = z.string().optional().nullable();
const requiredFieldSchema = z.string().min(1, 'Field is required');
```

---

### Mistake 2: Not Using Partial Schemas ❌

**Problem**: Using full validation schema for progressive/draft saves

**Wrong Code**:
```typescript
// ❌ WRONG: User tries to save partial data (firstName only)
const data = { firstName: 'Juan' };  // Missing required fields

try {
  // This will FAIL because paternalLastName, maternalLastName are required
  personActorSchema.parse(data);
} catch (error) {
  // Error: paternalLastName is required
  // User can't save progress!
}
```

**Right Code**:
```typescript
// ✅ RIGHT: Use partial schema for draft saves
const data = { firstName: 'Juan' };  // Partial data

try {
  // Partial schema makes ALL fields optional
  partialPersonActorSchema.parse(data);
  // Success! User can save progress
} catch (error) {
  // Only fails if provided values are invalid format
}

// Full validation only for final submission
const isSubmitting = true;
const schema = isSubmitting
  ? personActorSchema          // All required fields enforced
  : partialPersonActorSchema;  // All fields optional
```

**Implementation in Service**:
```typescript
async validateAndSave(data: ActorData, skipValidation = false) {
  if (!skipValidation) {
    // Use partial validation for drafts
    const isPartial = !data.informationComplete;
    const validationResult = this.validateActorData(data, isPartial);

    if (!validationResult.success) {
      return Result.error(validationResult.error);
    }
  }

  // Save to database
  return this.executeDbOperation(async () => {
    return await this.model.update({
      where: { id: data.id },
      data: data
    });
  });
}
```

---

### Mistake 3: Validating Before Schema Generation ❌

**Problem**: Updating validation schemas before running `bun prisma generate`

**Wrong Order**:
```bash
# ❌ WRONG ORDER
1. Update prisma/schema.prisma
2. Update Zod validation schemas  # TypeScript errors!
3. bun prisma generate            # Too late!
```

**Right Order**:
```bash
# ✅ RIGHT ORDER
1. Update prisma/schema.prisma
2. bun prisma generate            # Updates TypeScript types
3. Update Zod validation schemas  # Now types are correct
4. Update service layer
5. Update UI components
```

**Why**: Prisma generates TypeScript types from schema. If you update validation before generation, you'll reference types that don't exist yet.

---

### Mistake 4: Not Handling Zod Errors Properly ❌

**Problem**: Throwing Zod errors instead of formatting them for users

**Wrong Code**:
```typescript
// ❌ WRONG: Raw Zod error leaked to user
try {
  schema.parse(data);
} catch (error) {
  throw error;  // User sees: "ZodError: 2 validation errors..."
}
```

**Right Code**:
```typescript
// ✅ RIGHT: Format errors for user-friendly display
try {
  schema.parse(data);
  return Result.ok(data);
} catch (error) {
  if (error instanceof ZodError) {
    // Format errors into field: message map
    const errors: Record<string, string> = {};
    error.errors.forEach(err => {
      if (err.path[0]) {
        errors[err.path[0].toString()] = err.message;
      }
    });

    return Result.error(
      new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        400,
        { errors }  // { firstName: 'Required', email: 'Invalid format' }
      )
    );
  }
  throw error;
}
```

---

### Mistake 5: Client-Side Only Validation ❌

**Problem**: Trusting client-side validation without server-side verification

**Wrong Code**:
```typescript
// ❌ WRONG: API route trusts client data
export async function PUT(request: NextRequest) {
  const data = await request.json();

  // No validation! Trusting client sent valid data
  await prisma.landlord.update({
    where: { id: data.id },
    data: data
  });

  return NextResponse.json({ success: true });
}
```

**Right Code**:
```typescript
// ✅ RIGHT: Always validate on server
export async function PUT(request: NextRequest) {
  const data = await request.json();

  // Validate through service layer
  const service = new LandlordService();
  const result = await service.validateAndSave(data);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message, details: result.error.context },
      { status: result.error.statusCode }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
```

**Why**: Client-side validation can be bypassed by malicious users or browser extensions. Always validate on server.

---

## Schema Synchronization

### The Correct Process

When updating data structures, follow this exact order:

#### 1. Update Prisma Schema

```prisma
// prisma/schema.prisma
model Landlord {
  // Add new field
  middleName String?  // ← NEW FIELD
}
```

#### 2. Generate Prisma Client

```bash
bun prisma generate
```

**What this does**:
- Generates TypeScript types from schema
- Updates `@prisma/client` package
- Creates type-safe database client

#### 3. Create Migration

```bash
bun prisma migrate dev --name add_middle_name
```

**What this does**:
- Creates SQL migration file
- Applies migration to development database
- Updates `schema.prisma` migrations folder

#### 4. Update Zod Validation Schemas

```typescript
// src/lib/validations/actors/person.schema.ts
export const personActorSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  middleName: z.string().optional().nullable(),  // ← NEW FIELD
  paternalLastName: z.string().min(1, 'Apellido paterno es requerido'),
  // ...
});
```

#### 5. Update Service Layer

```typescript
// Service methods automatically get new field from Prisma types
// No changes needed if using BaseActorService pattern!
```

#### 6. Update UI Components

```typescript
// Add middleName to form inputs
<PersonNameFields
  firstName={data.firstName}
  middleName={data.middleName}  // ← NEW FIELD
  paternalLastName={data.paternalLastName}
  maternalLastName={data.maternalLastName}
  onChange={handleChange}
/>
```

#### 7. Test Edge Cases

```typescript
// Test all variations
test('handles null middle name', () => {
  const data = { firstName: 'Juan', middleName: null, ... };
  expect(validatePerson(data)).toBeValid();
});

test('handles undefined middle name', () => {
  const data = { firstName: 'Juan', middleName: undefined, ... };
  expect(validatePerson(data)).toBeValid();
});

test('handles empty string middle name', () => {
  const data = { firstName: 'Juan', middleName: '', ... };
  expect(validatePerson(data)).toBeValid();
});
```

#### 8. Verify Build

```bash
# Type check
bunx tsc --noEmit

# Build
bun run build
```

---

## Testing Strategies

### Unit Testing Validation

**Example** - Testing Zod Schema:

```typescript
import { describe, it, expect } from 'bun:test';
import { personActorSchema } from '@/lib/validations/actors/person.schema';

describe('Person Actor Validation', () => {
  it('should validate complete person data', () => {
    const validData = {
      isCompany: false,
      firstName: 'Juan',
      middleName: 'Carlos',
      paternalLastName: 'García',
      maternalLastName: 'López',
      email: 'juan@example.com',
      phone: '5551234567',
      street: 'Calle Principal 123',
      neighborhood: 'Centro',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '01000'
    };

    expect(() => personActorSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const invalidData = {
      // ... other valid fields
      email: 'not-an-email'
    };

    expect(() => personActorSchema.parse(invalidData)).toThrow();
  });

  it('should reject invalid phone format', () => {
    const invalidData = {
      // ... other valid fields
      phone: '123'  // Too short
    };

    expect(() => personActorSchema.parse(invalidData)).toThrow();
  });

  it('should allow optional fields to be null', () => {
    const dataWithNulls = {
      // ... required fields
      middleName: null,      // Optional
      curp: null,            // Optional
      rfc: null              // Optional
    };

    expect(() => personActorSchema.parse(dataWithNulls)).not.toThrow();
  });
});
```

### Integration Testing Service Layer

**Example** - Testing LandlordService:

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { LandlordService } from '@/lib/services/actors/LandlordService';

describe('LandlordService Validation', () => {
  const service = new LandlordService();

  it('should accept partial data when isPartial = true', async () => {
    const partialData = {
      firstName: 'Juan'
      // Missing other required fields
    };

    const result = service['validatePersonData'](partialData, true);
    expect(result.success).toBe(true);
  });

  it('should reject partial data when isPartial = false', async () => {
    const partialData = {
      firstName: 'Juan'
      // Missing other required fields
    };

    const result = service['validatePersonData'](partialData, false);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('should format Zod errors correctly', async () => {
    const invalidData = {
      isCompany: false,
      firstName: '',  // Empty (invalid)
      email: 'not-an-email',  // Invalid format
      phone: '123'  // Too short
    };

    const result = service['validatePersonData'](invalidData, false);
    expect(result.success).toBe(false);
    expect(result.error.context.errors).toHaveProperty('firstName');
    expect(result.error.context.errors).toHaveProperty('email');
    expect(result.error.context.errors).toHaveProperty('phone');
  });
});
```

### End-to-End Testing API Routes

**Example** - Testing Actor API:

```typescript
import { describe, it, expect } from 'bun:test';

describe('PUT /api/actors/[type]/[identifier]', () => {
  it('should reject invalid data', async () => {
    const invalidData = {
      firstName: '',  // Empty
      email: 'invalid'
    };

    const response = await fetch('/api/actors/landlord/test-token', {
      method: 'PUT',
      body: JSON.stringify(invalidData)
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.details.errors).toHaveProperty('firstName');
  });

  it('should accept valid data', async () => {
    const validData = {
      // ... complete valid data
    };

    const response = await fetch('/api/actors/landlord/test-token', {
      method: 'PUT',
      body: JSON.stringify(validData)
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});
```

---

## Real-World Examples

### Example 1: Actor Form with Progressive Saving

**Component**: `LandlordFormWizard.tsx`

```typescript
export function LandlordFormWizard({ landlordId, token }: Props) {
  const [formData, setFormData] = useState<Partial<LandlordData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Save as draft (partial validation)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Partial validation allows incomplete data
      const result = partialIndividualLandlordSchema.safeParse(formData);

      if (!result.success) {
        // Only show errors for fields user has filled
        const newErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          if (err.path[0] && formData[err.path[0]]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }

      // Save to API
      const response = await fetch(`/api/actors/landlord/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, informationComplete: false })
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      toast.success('Progreso guardado');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit (full validation)
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // Full validation requires all fields
      const result = individualLandlordSchema.safeParse(formData);

      if (!result.success) {
        // Show ALL validation errors
        const newErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error('Por favor complete todos los campos requeridos');
        return;
      }

      // Submit to API
      const response = await fetch(`/api/actors/landlord/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, informationComplete: true })
      });

      if (!response.ok) {
        const json = await response.json();
        // json.error is ServiceError
        // json.error.context.errors is ValidationError[]
        if (json.error?.context?.errors) {
          // Convert ValidationError[] to Record<string, string> for display
          const errorMap: Record<string, string> = {};
          json.error.context.errors.forEach((err: {field: string, message: string}) => {
            errorMap[err.field] = err.message;
          });
          setErrors(errorMap);
        }
        throw new Error(json.error?.message || 'Failed to submit');
      }

      toast.success('Información enviada exitosamente');
      router.push('/portal/success');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form>
      <PersonNameFields
        firstName={formData.firstName}
        middleName={formData.middleName}
        paternalLastName={formData.paternalLastName}
        maternalLastName={formData.maternalLastName}
        onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
        errors={errors}
      />

      {/* Other form fields */}

      <div className="flex gap-4">
        <button type="button" onClick={handleSaveDraft} disabled={isSaving}>
          Guardar progreso
        </button>
        <button type="button" onClick={handleSubmit} disabled={isSaving}>
          Enviar información
        </button>
      </div>
    </form>
  );
}
```

---

## Best Practices Summary

### DO ✅

- **Use three-layer validation** - Frontend, API, Database
- **Use partial schemas** for draft saves
- **Format Zod errors** into user-friendly messages
- **Follow schema sync order** - Schema → Generate → Types → Validation
- **Test edge cases** - null, undefined, empty string
- **Always validate on server** - Never trust client-side only
- **Use Result pattern** for consistent error handling

### DON'T ❌

- **Coerce null/undefined to ''** for optional fields
- **Skip `bun prisma generate`** after schema changes
- **Use full validation** for partial/draft saves
- **Throw raw Zod errors** to users
- **Trust client-side validation** without server verification
- **Update types before** running Prisma generate

---

## Related Documentation

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Main developer guide
- **[ACTOR_SYSTEM.md](./ACTOR_SYSTEM.md)** - Actor system architecture
- **[REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md)** - Form state management
- **[API_ROUTE_PATTERNS.md](./API_ROUTE_PATTERNS.md)** - API error handling

---

**Last Verified**: November 5, 2024 (commit: 513fa3d)
**Production Status**: ✅ Active and Proven
**Documentation Accuracy**: ✅ Verified against actual codebase
