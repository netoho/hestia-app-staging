# Validation Schemas

**Status**: ✅ Production Zod Schemas
**Last Updated**: November 2024
**Files**: 6 schema files organized by domain

---

## Purpose

Zod validation schemas for type-safe data validation across frontend and backend. Provides reusable schema components, domain-specific validation rules, and consistent error messages in Spanish.

---

## Architecture

**File Organization**:
```
validations/
├── actors/
│   ├── base.schema.ts       # Reusable actor schemas (address, base, helpers)
│   ├── person.schema.ts     # Person actor validation
│   └── company.schema.ts    # Company actor validation
├── landlord/
│   ├── landlord.schema.ts   # Landlord-specific rules
│   └── property.schema.ts   # Property validation
└── policy.ts                # Policy and general schemas
```

---

## Files

- **actors/base.schema.ts** (~120 lines) - Reusable components (address, base actor, helpers)
- **actors/person.schema.ts** (~80 lines) - Person actor validation (4-field naming)
- **actors/company.schema.ts** (~70 lines) - Company actor validation
- **landlord/landlord.schema.ts** (~90 lines) - Landlord schemas
- **landlord/property.schema.ts** (~60 lines) - Property schemas
- **policy.ts** (~150 lines) - Policy creation and validation

---

## Reusable Schemas

### Address Schema

**File**: `actors/base.schema.ts:8-22`

```typescript
export const addressSchema = z.object({
  street: z.string().min(1, 'La calle es requerida'),
  exteriorNumber: z.string().min(1, 'El número exterior es requerido'),
  interiorNumber: z.string().optional().nullable(),
  neighborhood: z.string().min(1, 'La colonia es requerida'),
  postalCode: z.string().min(4, 'El código postal es requerido'),
  municipality: z.string().min(1, 'El municipio es requerido'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El estado es requerido'),
  country: z.string().default('México'),
  // Google Maps integration
  placeId: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  formattedAddress: z.string().optional().nullable(),
});

export const partialAddressSchema = addressSchema.partial();
```

**Usage**:
```typescript
import { addressSchema } from '@/lib/validations/actors/base.schema';

const result = addressSchema.safeParse(formData);
if (!result.success) {
  // Handle errors
}
```

---

### Base Actor Schema

**File**: `actors/base.schema.ts:28-46`

```typescript
export const baseActorSchema = z.object({
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  workPhone: z.string().optional().nullable().or(z.literal('')),
  address: z.string().min(1, 'La dirección es requerida'),
  addressDetails: addressSchema.optional().nullable(),

  // Bank information (optional for most actors)
  bankName: z.string().optional().nullable().or(z.literal('')),
  accountNumber: z.string().optional().nullable().or(z.literal('')),
  clabe: z.string().refine(
    (val) => !val || val === '' || val.length === 18,
    { message: 'CLABE debe tener 18 caracteres' }
  ).optional().nullable().or(z.literal('')),
  accountHolder: z.string().optional().nullable().or(z.literal('')),

  additionalInfo: z.string().optional().nullable().or(z.literal('')),
});
```

---

### Helper Functions

**File**: `actors/base.schema.ts:68-98`

```typescript
// Nullable string (empty string, null, or undefined)
export const nullableString = () =>
  z.string().optional().nullable().or(z.literal(''));

// Required string with minimum length
export const requiredString = (minLength: number = 1, message?: string) =>
  z.string().min(minLength, message || `Mínimo ${minLength} caracteres`);

// RFC (Mexican tax ID)
export const rfcSchema = z.string()
  .min(12, 'RFC debe tener mínimo 12 caracteres')
  .max(13, 'RFC debe tener máximo 13 caracteres')
  .regex(/^[A-Z]{3,4}\d{6}[0-9A-Z]{2,3}$/, 'Formato de RFC inválido');

// CURP (Mexican national ID)
export const curpSchema = z.string()
  .length(18, 'CURP debe tener 18 caracteres')
  .regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, 'Formato de CURP inválido');

// Optional versions
export const optionalRfcSchema = rfcSchema.optional().nullable().or(z.literal(''));
export const optionalCurpSchema = curpSchema.optional().nullable().or(z.literal(''));
export const optionalEmailSchema = z.string().email().optional().nullable().or(z.literal(''));
export const optionalPhoneSchema = z.string().min(10).optional().nullable().or(z.literal(''));
```

**Usage**:
```typescript
import { requiredString, optionalRfcSchema } from '@/lib/validations/actors/base.schema';

const mySchema = z.object({
  name: requiredString(2, 'Nombre debe tener al menos 2 caracteres'),
  rfc: optionalRfcSchema,
});
```

---

## Person Actor Schema

**File**: `actors/person.schema.ts`

```typescript
export const personActorSchema = baseActorSchema.extend({
  isCompany: z.literal(false),

  // 4-field Mexican naming
  firstName: z.string().min(1, 'El nombre es requerido'),
  middleName: z.string().optional().nullable().or(z.literal('')),
  paternalLastName: z.string().min(1, 'El apellido paterno es requerido'),
  maternalLastName: z.string().min(1, 'El apellido materno es requerido'),

  // Identification
  curp: optionalCurpSchema,
  rfc: optionalRfcSchema,
  passport: z.string().optional().nullable().or(z.literal('')),
  nationality: z.enum(['MEXICAN', 'FOREIGN']).optional(),

  // Employment (optional)
  occupation: nullableString(),
  employerName: nullableString(),
  position: nullableString(),
  monthlyIncome: z.number().positive().optional().nullable(),
  incomeSource: nullableString(),
});

export const partialPersonActorSchema = personActorSchema.partial();
```

**Usage**:
```typescript
// File: src/lib/services/actors/LandlordService.ts:85-95
import { personActorSchema, partialPersonActorSchema } from '@/lib/validations/actors/person.schema';

protected validatePersonData(data: PersonActorData, isPartial = false): Result<PersonActorData> {
  const schema = isPartial ? partialPersonActorSchema : personActorSchema;

  try {
    const validated = schema.parse(data);
    return Result.ok(validated);
  } catch (error) {
    if (error instanceof ZodError) {
      return Result.error(this.formatValidationError(error));
    }
    throw error;
  }
}
```

---

## Company Actor Schema

**File**: `actors/company.schema.ts`

```typescript
export const companyActorSchema = baseActorSchema.extend({
  isCompany: z.literal(true),

  // Company information
  companyName: z.string().min(1, 'El nombre de la empresa es requerido'),
  rfc: rfcSchema, // Required for companies

  // Legal representative (4-field naming)
  legalRepFirstName: z.string().min(1, 'Nombre del representante requerido'),
  legalRepMiddleName: nullableString(),
  legalRepPaternalLastName: z.string().min(1, 'Apellido paterno requerido'),
  legalRepMaternalLastName: z.string().min(1, 'Apellido materno requerido'),

  legalRepEmail: optionalEmailSchema,
  legalRepPhone: optionalPhoneSchema,
  legalRepCurp: optionalCurpSchema,
  legalRepRfc: optionalRfcSchema,
  legalRepPosition: nullableString(),
});

export const partialCompanyActorSchema = companyActorSchema.partial();
```

---

## Policy Schemas

**File**: `policy.ts`

```typescript
// Base policy creation schema
export const policyCreateSchema = z.object({
  // Property
  propertyAddress: z.string().min(1, 'Dirección de la propiedad requerida'),
  propertyType: z.enum(['HOUSE', 'APARTMENT', 'COMMERCIAL', 'OFFICE', 'WAREHOUSE', 'OTHER']),
  propertyDescription: nullableString(),

  // Financial
  rentAmount: z.number().positive('El monto de renta debe ser positivo'),
  contractLength: z.number().int().min(6, 'Duración mínima: 6 meses').max(60, 'Duración máxima: 60 meses'),

  // Guarantor
  guarantorType: z.enum(['NONE', 'JOINT_OBLIGOR', 'AVAL', 'BOTH']),

  // Package
  packageId: z.string().uuid().optional(),

  // Pricing
  totalPrice: z.number().positive(),
  tenantPercentage: z.number().min(0).max(100),
  landlordPercentage: z.number().min(0).max(100),
}).refine(
  (data) => data.tenantPercentage + data.landlordPercentage === 100,
  { message: 'Los porcentajes deben sumar 100%' }
);

// Landlord creation within policy
export const baseLandlordSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido'),
  middleName: nullableString(),
  paternalLastName: z.string().min(1, 'Apellido paterno requerido'),
  maternalLastName: z.string().min(1, 'Apellido materno requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Teléfono debe tener 10 dígitos'),
  isPrimary: z.boolean().default(true),
});

export const partialLandlordSchema = baseLandlordSchema.partial();
```

---

## Usage Patterns

### Pattern 1: Form Validation

```typescript
// File: src/components/forms/LandlordFormWizard.tsx:120-140
import { personActorSchema } from '@/lib/validations/actors/person.schema';

const validateForm = () => {
  const result = personActorSchema.safeParse(formData);

  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        errors[err.path[0].toString()] = err.message;
      }
    });
    setErrors(errors);
    return false;
  }

  setErrors({});
  return true;
};

const handleSubmit = () => {
  if (!validateForm()) {
    toast.error('Por favor corrige los errores');
    return;
  }

  // Submit data
};
```

---

### Pattern 2: Partial Validation (Draft Saves)

```typescript
// File: src/components/forms/TenantFormWizard.tsx:85-100
import { partialPersonActorSchema } from '@/lib/validations/actors/person.schema';

const saveDraft = async () => {
  // Use partial schema - only validates filled fields
  const result = partialPersonActorSchema.safeParse(formData);

  if (!result.success) {
    // Only show errors for fields user filled
    const errors = result.error.errors
      .filter(err => formData[err.path[0]]) // Only filled fields
      .reduce((acc, err) => ({
        ...acc,
        [err.path[0]]: err.message
      }), {});

    setErrors(errors);
    return;
  }

  // Save partial data
  await saveToApi({ ...formData, informationComplete: false });
};
```

---

### Pattern 3: Server-Side Validation

```typescript
// File: src/app/api/policies/initiate/route.ts:25-40
import { policyCreateSchema } from '@/lib/validations/policy';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate request body
  const validation = policyCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: validation.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  // Proceed with validated data
  const policyService = new PolicyService();
  const result = await policyService.createPolicy(validation.data);

  // ...
}
```

---

### Pattern 4: Conditional Validation

```typescript
// File: src/lib/validations/actors/person.schema.ts:45-60
export const personActorWithEmploymentSchema = personActorSchema.extend({
  // Employment required if employmentStatus is EMPLOYED
  occupation: z.string().min(1),
  employerName: z.string().min(1),
  monthlyIncome: z.number().positive(),
}).refine(
  (data) => {
    // If employed, must have employment info
    if (data.employmentStatus === 'EMPLOYED') {
      return data.occupation && data.employerName && data.monthlyIncome;
    }
    return true;
  },
  { message: 'Información de empleo requerida para empleados' }
);
```

---

## Best Practices

### DO ✅

- **Use partial schemas for drafts**
  ```typescript
  const schema = isSubmitting ? personActorSchema : partialPersonActorSchema;
  ```

- **Provide Spanish error messages**
  ```typescript
  z.string().min(1, 'El nombre es requerido')
  ```

- **Use helpers for common patterns**
  ```typescript
  firstName: requiredString(1, 'Nombre requerido'),
  rfc: optionalRfcSchema,
  ```

- **Validate on both client and server**
  ```typescript
  // Client: immediate feedback
  const result = schema.safeParse(formData);

  // Server: security (never trust client)
  const validation = schema.safeParse(requestBody);
  ```

- **Use `.refine()` for complex validation**
  ```typescript
  .refine(
    (data) => data.tenantPercentage + data.landlordPercentage === 100,
    { message: 'Must sum to 100%' }
  )
  ```

### DON'T ❌

- **Don't use `.parse()` - use `.safeParse()`**
  ```typescript
  // ❌ WRONG - throws exception
  const data = schema.parse(input);

  // ✅ RIGHT - returns Result
  const result = schema.safeParse(input);
  if (!result.success) { /* handle */ }
  ```

- **Don't coerce nulls to empty strings in validation**
  ```typescript
  // ❌ WRONG
  .transform(val => val ?? '')

  // ✅ RIGHT
  .optional().nullable().or(z.literal(''))
  ```

- **Don't repeat validation logic**
  ```typescript
  // ❌ WRONG
  z.string().email().optional().nullable().or(z.literal('')) // Repeated!

  // ✅ RIGHT
  import { optionalEmailSchema } from '@/lib/validations/actors/base.schema';
  ```

---

## Common Schemas

### RFC (Mexican Tax ID)

```typescript
// Required
rfc: rfcSchema

// Optional
rfc: optionalRfcSchema
```

**Format**: 12-13 characters, e.g., `AAAA123456XXX`

### CURP (Mexican National ID)

```typescript
// Required
curp: curpSchema

// Optional
curp: optionalCurpSchema
```

**Format**: 18 characters, e.g., `GARC850101HDFRRR09`

### Email

```typescript
// Required
email: z.string().email('Email inválido')

// Optional
email: optionalEmailSchema
```

### Phone

```typescript
// Required
phone: z.string().min(10, 'Debe tener 10 dígitos')

// Optional
phone: optionalPhoneSchema
```

### Money Amount

```typescript
rentAmount: z.number().positive('Debe ser positivo')
```

---

## Testing

```typescript
import { personActorSchema } from '@/lib/validations/actors/person.schema';

describe('Person Actor Validation', () => {
  it('should validate complete person data', () => {
    const validData = {
      isCompany: false,
      firstName: 'Juan',
      paternalLastName: 'García',
      maternalLastName: 'López',
      email: 'juan@example.com',
      phone: '5551234567',
      address: 'Calle Principal 123'
    };

    const result = personActorSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      ...validData,
      email: 'not-an-email'
    };

    const result = personActorSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Email inválido');
  });
});
```

---

## Related Modules

- **[FORM_VALIDATION_PATTERNS.md](../../../docs/FORM_VALIDATION_PATTERNS.md)** - Comprehensive validation patterns and best practices
- **[/src/lib/services/actors/](../services/actors/README.md)** - Services use these schemas
- **[/src/components/forms/](../../components/forms/README.md)** - Forms use these schemas
- **[DEVELOPER_GUIDE.md](../../../docs/DEVELOPER_GUIDE.md)** - Main developer guide

---

**Last Verified**: November 2024
**Production Status**: ✅ All Forms Use These Schemas
