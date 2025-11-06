# Result Pattern & Error Handling

**Status**: ✅ Production-Proven Pattern
**Last Updated**: November 2024
**Files**:
- `/src/lib/services/types/result.ts` (196 lines)
- `/src/lib/services/types/errors.ts` (181 lines)

---

## Purpose

Type-safe error handling system inspired by Rust's `Result<T, E>` pattern. Eliminates throwing exceptions, makes error handling explicit and composable, and provides consistent error responses across all services.

---

## Why Result Pattern?

### Problems with Traditional Error Handling

**❌ Throwing Exceptions**:
```typescript
async function getPolicy(id: string): Promise<Policy> {
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) throw new Error('Not found'); // Hidden control flow!
  return policy;
}

// Caller doesn't know this can throw
const policy = await getPolicy('123'); // 💥 Might explode!
```

**Problems**:
- Hidden control flow (no type signature indication)
- Easy to forget error handling
- try/catch everywhere clutters code
- Hard to compose operations

**✅ Result Pattern**:
```typescript
async function getPolicy(id: string): AsyncResult<Policy> {
  const policy = await this.executeDbOperation(
    async () => await prisma.policy.findUnique({ where: { id } }),
    'getPolicy'
  );

  if (!policy.ok) {
    return Result.error(new ServiceError(ErrorCode.NOT_FOUND, ...));
  }

  return Result.ok(policy.value);
}

// Caller MUST handle both success and error
const result = await getPolicy('123');
if (result.ok) {
  const policy = result.value; // Type-safe!
} else {
  const error = result.error; // Type-safe!
}
```

**Benefits**:
- Explicit in type signature (`AsyncResult<Policy>`)
- Compiler enforces error handling
- Composable with map(), chain()
- No hidden control flow

---

## Core Types

### Result<T, E>

**Definition**:
```typescript
type Result<T, E = ServiceError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

**Properties**:
- Success: `{ ok: true, value: T }`
- Error: `{ ok: false, error: E }`
- Default error type: `ServiceError`

### AsyncResult<T, E>

**Definition**:
```typescript
type AsyncResult<T, E = ServiceError> = Promise<Result<T, E>>;
```

**Usage**: For async operations (most service methods)

---

## Result Helpers

### Result.ok()

**Purpose**: Create successful result

**Signature**:
```typescript
Result.ok<T>(value: T): Result<T>
```

**Example**:
```typescript
const result = Result.ok({ id: '123', name: 'Test' });
// result = { ok: true, value: { id: '123', name: 'Test' } }
```

---

### Result.error()

**Purpose**: Create error result

**Signature**:
```typescript
Result.error<E = ServiceError>(error: E): Result<never, E>
```

**Example**:
```typescript
const result = Result.error(
  new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404)
);
// result = { ok: false, error: ServiceError {...} }
```

---

### Result.wrap()

**Purpose**: Execute function and wrap in Result (catches exceptions)

**Signature**:
```typescript
Result.wrap<T>(fn: () => T): Result<T>
```

**Example**:
```typescript
const result = Result.wrap(() => {
  return JSON.parse(jsonString); // Might throw
});

if (result.ok) {
  console.log('Parsed:', result.value);
} else {
  console.error('Parse error:', result.error);
}
```

---

### Result.wrapAsync()

**Purpose**: Execute async function and wrap in Result

**Signature**:
```typescript
async wrapAsync<T>(fn: () => Promise<T>): AsyncResult<T>
```

**Example**:
```typescript
const result = await Result.wrapAsync(async () => {
  return await fetch('/api/data').then(r => r.json());
});

if (result.ok) {
  console.log('Data:', result.value);
} else {
  console.error('Fetch error:', result.error);
}
```

---

### Result.map()

**Purpose**: Transform successful result value

**Signature**:
```typescript
Result.map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U>
```

**Example**:
```typescript
const numberResult = Result.ok(5);
const stringResult = Result.map(numberResult, n => `Number: ${n}`);
// stringResult = { ok: true, value: 'Number: 5' }

const errorResult = Result.error(new ServiceError(...));
const mappedError = Result.map(errorResult, n => `Number: ${n}`);
// mappedError = { ok: false, error: ServiceError {...} } (unchanged)
```

**Use Case**: Transform data without checking ok/error

---

### Result.mapError()

**Purpose**: Transform error

**Signature**:
```typescript
Result.mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F>
```

**Example**:
```typescript
const result = Result.error(new Error('DB error'));
const serviceErrorResult = Result.mapError(result, err =>
  new ServiceError(ErrorCode.DATABASE_ERROR, err.message, 500)
);
```

---

### Result.chain()

**Purpose**: Chain operations that return Results (flatMap)

**Signature**:
```typescript
Result.chain<T, U>(
  result: Result<T>,
  fn: (value: T) => Result<U>
): Result<U>
```

**Example**:
```typescript
// File: src/lib/services/policyService.ts:220-235
async createPolicyWithValidation(data: PolicyData): AsyncResult<Policy> {
  // Step 1: Validate
  const validationResult = this.validatePolicyData(data);

  // Step 2: Chain with creation
  return Result.chain(validationResult, async (validData) => {
    // Only runs if validation succeeded
    return await this.executeDbOperation(
      async () => await this.prisma.policy.create({ data: validData }),
      'createPolicy'
    );
  });
}
```

**Alternative (manual)**:
```typescript
const validationResult = this.validatePolicyData(data);
if (!validationResult.ok) {
  return Result.error(validationResult.error);
}

return await this.executeDbOperation(...);
```

---

### Result.unwrap()

**Purpose**: Extract value or throw (use sparingly!)

**Signature**:
```typescript
Result.unwrap<T>(result: Result<T>): T
```

**Example**:
```typescript
const result = Result.ok(42);
const value = Result.unwrap(result); // 42

const errorResult = Result.error(new ServiceError(...));
const value2 = Result.unwrap(errorResult); // 💥 Throws ServiceError!
```

**⚠️ Warning**: Only use when you're CERTAIN result is ok (e.g., in tests)

---

### Result.unwrapOr()

**Purpose**: Extract value or return default

**Signature**:
```typescript
Result.unwrapOr<T>(result: Result<T>, defaultValue: T): T
```

**Example**:
```typescript
const result = await service.getPolicy(id);
const policy = Result.unwrapOr(result, null);
// If ok: returns policy
// If error: returns null
```

**Use Case**: When you want a fallback value instead of handling error

---

### Result.all()

**Purpose**: Combine multiple Results (all must succeed)

**Signature**:
```typescript
Result.all<T>(results: Result<T>[]): Result<T[]>
```

**Example**:
```typescript
const results = await Promise.all([
  service.getPolicy('1'),
  service.getPolicy('2'),
  service.getPolicy('3')
]);

const combinedResult = Result.all(results);

if (combinedResult.ok) {
  const policies = combinedResult.value; // Policy[]
} else {
  // At least one failed - combinedResult.error is the first error
}
```

**Use Case**: When you need ALL operations to succeed

---

### Result.collect()

**Purpose**: Collect successful results, ignore errors

**Signature**:
```typescript
Result.collect<T>(results: Result<T>[]): T[]
```

**Example**:
```typescript
const results = await Promise.all([
  service.getPolicy('1'), // ok
  service.getPolicy('2'), // error
  service.getPolicy('3'), // ok
]);

const policies = Result.collect(results);
// policies = [policy1, policy3] (only successful ones)
```

**Use Case**: When partial success is acceptable

---

## ServiceError Class

### Definition

```typescript
export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context?: ErrorContext,
    isOperational: boolean = true
  );

  toJSON(): object;
  getUserMessage(): string;
}
```

### Properties

**code**: ErrorCode enum value
**statusCode**: HTTP status code (400, 401, 404, 500, etc.)
**context**: Additional data (field names, IDs, etc.)
**isOperational**: `true` = expected error, `false` = programmer error
**timestamp**: When error occurred

### Methods

**toJSON()**: Serialize for logging
**getUserMessage()**: Get user-friendly Spanish message

### Example

```typescript
const error = new ServiceError(
  ErrorCode.VALIDATION_ERROR,
  'Email is required',
  400,
  { field: 'email', value: '' }
);

console.log(error.code); // 'VALIDATION_ERROR'
console.log(error.statusCode); // 400
console.log(error.getUserMessage()); // 'Los datos proporcionados no son válidos.'
console.log(error.context); // { field: 'email', value: '' }
```

---

## Error Codes

### General Errors (1000-1999)

| Code | HTTP | User Message (Spanish) |
|------|------|------------------------|
| UNKNOWN_ERROR | 500 | Ha ocurrido un error inesperado |
| VALIDATION_ERROR | 400 | Los datos proporcionados no son válidos |
| NOT_FOUND | 404 | El recurso solicitado no fue encontrado |
| ALREADY_EXISTS | 409 | Este recurso ya existe |
| PERMISSION_DENIED | 403 | No tienes permisos para realizar esta acción |
| RATE_LIMITED | 429 | Has excedido el límite de solicitudes |
| INVALID_REQUEST | 400 | La solicitud no es válida |

### Database Errors (2000-2999)

| Code | HTTP | Description |
|------|------|-------------|
| DATABASE_ERROR | 500 | Generic database error |
| DATABASE_CONNECTION_ERROR | 500 | Cannot connect to database |
| DATABASE_QUERY_ERROR | 500 | Query execution failed |
| DATABASE_CONSTRAINT_ERROR | 400 | Constraint violation (FK, unique, etc.) |

### Authentication Errors (3000-3999)

| Code | HTTP | Description |
|------|------|-------------|
| AUTHENTICATION_ERROR | 401 | Generic auth error |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Authenticated but not authorized |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| SESSION_EXPIRED | 401 | Session no longer valid |
| INVALID_TOKEN | 401 | Token format invalid |
| TOKEN_EXPIRED | 401 | Token expired |

### Business Logic Errors (4000-4999)

| Code | HTTP | Description |
|------|------|-------------|
| POLICY_NOT_FOUND | 404 | Policy doesn't exist |
| POLICY_ALREADY_EXISTS | 409 | Duplicate policy |
| POLICY_INVALID_STATE | 400 | Cannot perform action in current state |
| ALREADY_COMPLETE | 400 | Already completed |
| PAYMENT_FAILED | 402 | Payment processing failed |
| PAYMENT_ALREADY_PROCESSED | 400 | Duplicate payment |
| INSUFFICIENT_FUNDS | 402 | Not enough balance |

### External Service Errors (5000-5999)

| Code | HTTP | Description |
|------|------|-------------|
| EMAIL_SEND_FAILED | 500 | Email service error |
| STORAGE_UPLOAD_FAILED | 500 | S3/storage error |
| STRIPE_API_ERROR | 502 | Stripe API error |
| PDF_GENERATION_FAILED | 500 | PDF gen error |

**Total**: 30+ error codes

---

## Error Factory Functions

**File**: `src/lib/services/types/errors.ts:132-180`

### Errors.notFound()

```typescript
Errors.notFound(resource: string, id?: string): ServiceError
```

**Example**:
```typescript
return Result.error(Errors.notFound('Policy', policyId));
// ServiceError { code: NOT_FOUND, message: 'Policy not found: 123', statusCode: 404 }
```

---

### Errors.validation()

```typescript
Errors.validation(field: string, message: string): ServiceError
```

**Example**:
```typescript
return Result.error(Errors.validation('email', 'Invalid email format'));
// ServiceError { code: VALIDATION_ERROR, context: { field: 'email', ... } }
```

---

### Errors.database()

```typescript
Errors.database(operation: string, error: any): ServiceError
```

**Example**:
```typescript
return Result.error(Errors.database('createPolicy', prismaError));
```

---

### Errors.unauthorized()

```typescript
Errors.unauthorized(reason?: string): ServiceError
```

**Example**:
```typescript
return Result.error(Errors.unauthorized('Only policy creator can delete'));
// ServiceError { code: PERMISSION_DENIED, statusCode: 403 }
```

---

### Errors.authentication()

```typescript
Errors.authentication(reason?: string): ServiceError
```

**Example**:
```typescript
return Result.error(Errors.authentication('Token expired'));
// ServiceError { code: AUTHENTICATION_ERROR, statusCode: 401 }
```

---

### Errors.external()

```typescript
Errors.external(service: string, error: any): ServiceError
```

**Example**:
```typescript
return Result.error(Errors.external('Stripe', stripeError));
// ServiceError { code: UNKNOWN_ERROR, statusCode: 502 }
```

---

## ServiceResponse Type

**Purpose**: Standard API response format

**Definition**:
```typescript
interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId?: string;
    [key: string]: any;
  };
}
```

### toServiceResponse()

**Purpose**: Convert Result to API response

**Signature**:
```typescript
toServiceResponse<T>(
  result: Result<T>,
  requestId?: string
): ServiceResponse<T>
```

**Example**:
```typescript
// File: src/app/api/policies/[id]/route.ts:35-40
const result = await policyService.getPolicy(policyId);
const response = toServiceResponse(result, request.headers.get('x-request-id'));

return NextResponse.json(response);

// Success response:
{
  success: true,
  data: { id: '123', policyNumber: 'POL-001', ... },
  meta: {
    timestamp: '2024-11-05T10:30:00.000Z',
    requestId: 'req-abc-123'
  }
}

// Error response:
{
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'La protección no fue encontrada.',
    details: { policyId: '999' }
  },
  meta: {
    timestamp: '2024-11-05T10:30:00.000Z',
    requestId: 'req-abc-123'
  }
}
```

---

## Real-World Examples

### Example 1: Service Method with Validation

```typescript
// File: src/lib/services/policyService.ts:88-115
async updatePolicy(
  id: string,
  data: Partial<Policy>
): AsyncResult<Policy> {
  // Validate data
  const validation = this.validate(data, (d) => {
    if (d.rentAmount && d.rentAmount <= 0) {
      return 'Rent amount must be positive';
    }
    if (d.contractLength && d.contractLength < 6) {
      return 'Contract length must be at least 6 months';
    }
    return null;
  });

  // Return early if validation fails
  if (!validation.ok) {
    return Result.error(validation.error);
  }

  // Update in database
  return this.executeDbOperation(
    async () => {
      const policy = await this.prisma.policy.update({
        where: { id },
        data: validation.value
      });

      if (!policy) {
        throw Errors.notFound('Policy', id);
      }

      return policy;
    },
    'updatePolicy'
  );
}
```

---

### Example 2: API Route Handling Result

```typescript
// File: src/app/api/policies/[id]/route.ts:15-35
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const policyService = new PolicyService();

    const result = await policyService.getPolicy(id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.getUserMessage() },
        { status: result.error.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value
    });
  } catch (error: any) {
    console.error('[Policy GET Error]', error);
    return NextResponse.json(
      { error: 'Error al obtener la póliza' },
      { status: 500 }
    );
  }
}
```

---

### Example 3: Chaining Multiple Operations

```typescript
// File: src/lib/services/policyApplicationService.ts:45-80
async initiatePolicy(data: PolicyInitiationData): AsyncResult<Policy> {
  // Step 1: Calculate pricing
  const pricingResult = await this.pricingService.calculatePrice({
    rentAmount: data.rentAmount,
    contractLength: data.contractLength,
    propertyType: data.propertyType
  });

  if (!pricingResult.ok) {
    return Result.error(pricingResult.error);
  }

  // Step 2: Create policy
  const policyResult = await this.policyService.createPolicy({
    ...data,
    totalPrice: pricingResult.value.totalPrice,
    status: PolicyStatus.DRAFT
  });

  if (!policyResult.ok) {
    return Result.error(policyResult.error);
  }

  // Step 3: Send invitations
  const emailResult = await this.emailService.sendPolicyInvitations(
    policyResult.value
  );

  // Log email errors but don't fail entire operation
  if (!emailResult.ok) {
    this.log('warn', 'Failed to send invitations', emailResult.error);
  }

  return Result.ok(policyResult.value);
}
```

---

### Example 4: Using Result.all()

```typescript
// File: src/lib/services/progressService.ts:55-75
async getPolicyProgress(policyId: string): AsyncResult<PolicyProgressData> {
  // Fetch all actors in parallel
  const [landlordResult, tenantResult, avalsResult, obligorsResult] =
    await Promise.all([
      this.landlordService.findByPolicyId(policyId),
      this.tenantService.findByPolicyId(policyId),
      this.avalService.findByPolicyId(policyId),
      this.obligorService.findByPolicyId(policyId)
    ]);

  // Check if all succeeded
  const allResults = Result.all([
    landlordResult,
    tenantResult,
    avalsResult,
    obligorsResult
  ]);

  if (!allResults.ok) {
    return Result.error(allResults.error);
  }

  const [landlord, tenant, avals, obligors] = allResults.value;

  return Result.ok({
    landlordComplete: landlord?.informationComplete || false,
    tenantComplete: tenant?.informationComplete || false,
    avalsComplete: avals.every(a => a.informationComplete),
    obligorsComplete: obligors.every(o => o.informationComplete)
  });
}
```

---

## Best Practices

### DO ✅

- **Always use Result for service methods**
  ```typescript
  async getPolicy(id: string): AsyncResult<Policy>
  ```

- **Check `result.ok` before accessing `.value`**
  ```typescript
  if (result.ok) {
    const data = result.value; // Safe!
  }
  ```

- **Return early on errors**
  ```typescript
  if (!validation.ok) {
    return Result.error(validation.error);
  }
  ```

- **Use error factories**
  ```typescript
  return Result.error(Errors.notFound('Policy', id));
  ```

- **Chain operations with Result.chain() or manual checks**
  ```typescript
  return Result.chain(validationResult, data => this.create(data));
  ```

- **Use toServiceResponse() in API routes**
  ```typescript
  return NextResponse.json(toServiceResponse(result));
  ```

### DON'T ❌

- **Don't throw exceptions from services**
  ```typescript
  // ❌ WRONG
  async getPolicy(id: string): Promise<Policy> {
    const policy = await prisma.policy.findUnique({ where: { id } });
    if (!policy) throw new Error('Not found');
    return policy;
  }
  ```

- **Don't access `.value` without checking `.ok`**
  ```typescript
  // ❌ WRONG
  const result = await service.getPolicy(id);
  const policy = result.value; // Might be undefined!
  ```

- **Don't ignore error cases**
  ```typescript
  // ❌ WRONG
  const result = await service.createPolicy(data);
  return NextResponse.json({ data: result.value }); // What if !result.ok?
  ```

- **Don't mix Result and try/catch**
  ```typescript
  // ❌ WRONG
  try {
    const result = await service.getPolicy(id);
    return result; // Already returns Result, no need for try/catch
  } catch (error) {
    // This will never execute!
  }
  ```

- **Don't use unwrap() in production code**
  ```typescript
  // ❌ WRONG (in production)
  const policy = Result.unwrap(result); // Can throw!

  // ✅ RIGHT (tests only)
  expect(Result.unwrap(result)).toEqual(expectedPolicy);
  ```

---

## Testing

### Testing Success Case

```typescript
it('should return policy when found', async () => {
  const mockPolicy = { id: '123', policyNumber: 'POL-001' };
  prismaMock.policy.findUnique.mockResolvedValue(mockPolicy);

  const result = await policyService.getPolicy('123');

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value).toEqual(mockPolicy);
  }
});
```

### Testing Error Case

```typescript
it('should return NOT_FOUND error when policy does not exist', async () => {
  prismaMock.policy.findUnique.mockResolvedValue(null);

  const result = await policyService.getPolicy('999');

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(result.error.statusCode).toBe(404);
    expect(result.error.getUserMessage()).toBe('La protección no fue encontrada.');
  }
});
```

### Testing Error Factory

```typescript
it('should create not found error correctly', () => {
  const error = Errors.notFound('Policy', '123');

  expect(error).toBeInstanceOf(ServiceError);
  expect(error.code).toBe(ErrorCode.NOT_FOUND);
  expect(error.statusCode).toBe(404);
  expect(error.context).toEqual({ resource: 'Policy', id: '123' });
});
```

---

## Migration from Throwing to Result

### Before (Throwing)

```typescript
async function getPolicy(id: string): Promise<Policy> {
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) {
    throw new Error('Policy not found');
  }
  return policy;
}

// Usage
try {
  const policy = await getPolicy('123');
  console.log(policy);
} catch (error) {
  console.error(error);
}
```

### After (Result Pattern)

```typescript
async function getPolicy(id: string): AsyncResult<Policy> {
  return this.executeDbOperation(
    async () => {
      const policy = await prisma.policy.findUnique({ where: { id } });
      if (!policy) {
        throw Errors.notFound('Policy', id);
      }
      return policy;
    },
    'getPolicy'
  );
}

// Usage
const result = await getPolicy('123');
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error.getUserMessage());
}
```

---

## Related Modules

- **[/src/lib/services/](../README.md)** - Service layer overview
- **[/src/lib/services/base/](../base/README.md)** - BaseService (uses Result pattern)
- **[/src/lib/services/actors/](../actors/README.md)** - Actor services (use Result pattern)
- **[DEVELOPER_GUIDE.md](../../../../docs/DEVELOPER_GUIDE.md)** - Main developer guide

---

**Last Verified**: November 2024
**Production Status**: ✅ Foundation of All Error Handling
