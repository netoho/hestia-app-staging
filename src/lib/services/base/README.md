# BaseService - Service Layer Foundation

**Status**: ✅ Production-Ready Foundation Class
**Last Updated**: November 2024
**File**: `/src/lib/services/base/BaseService.ts` (197 lines)

---

## Purpose

`BaseService` is an abstract class that provides common functionality for all services in Hestia. It implements patterns for database operations, error handling, logging, validation, authorization, and transactions using the Result pattern for type-safe error handling.

---

## Architecture

### Design Principles

1. **Abstraction**: All services extend BaseService
2. **Result Pattern**: Type-safe error handling without exceptions
3. **Logging**: Structured logging with context
4. **Error Handling**: Automatic Prisma error translation
5. **Transactions**: Built-in transaction support
6. **Context Propagation**: Request context through service chain

### Class Hierarchy

```
BaseService (abstract)
  ├─> BaseActorService (abstract)
  │   ├─> LandlordService
  │   ├─> TenantService
  │   ├─> AvalService
  │   └─> JointObligorService
  │
  ├─> PolicyService
  ├─> DocumentService
  ├─> EmailService
  ├─> PaymentService
  └─> ... (25+ other services)
```

---

## Exports

### Core Class

```typescript
export abstract class BaseService {
  protected prisma: PrismaClient;
  protected context?: ServiceContext;
  protected enableCache: boolean;

  constructor(options?: ServiceOptions);

  // Context management
  withContext(context: ServiceContext): this;

  // Database operations
  protected async executeDbOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): AsyncResult<T>;

  // Transactions
  protected async executeTransaction<T>(
    operations: (tx: PrismaClient) => Promise<T>
  ): AsyncResult<T>;

  // Validation
  protected validate<T>(
    data: T,
    validator: (data: T) => string | null
  ): Result<T>;

  // Authorization
  protected authorize(
    condition: boolean,
    message?: string
  ): Result<void>;

  // Logging
  protected log(
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): void;

  // Caching
  protected getCacheKey(prefix: string, params: any): string;
}
```

### Interfaces

```typescript
export interface ServiceContext {
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ServiceOptions {
  prisma?: PrismaClient;
  enableCache?: boolean;
}

export interface IService {
  withContext(context: ServiceContext): this;
}

export interface ICrudService<T, CreateDTO, UpdateDTO> extends IService {
  findById(id: string): AsyncResult<T | null>;
  findAll(filter?: any): AsyncResult<T[]>;
  create(data: CreateDTO): AsyncResult<T>;
  update(id: string, data: UpdateDTO): AsyncResult<T>;
  delete(id: string): AsyncResult<boolean>;
}
```

---

## Methods

### withContext()

**Purpose**: Set request context for logging and audit trails

**Signature**:
```typescript
withContext(context: ServiceContext): this
```

**Parameters**:
- `context.userId` - ID of user making the request
- `context.requestId` - Unique request identifier
- `context.ipAddress` - Client IP address
- `context.userAgent` - Client user agent

**Returns**: `this` (for method chaining)

**Example Usage**:
```typescript
// File: src/app/api/policies/[id]/route.ts:15-22
import { PolicyService } from '@/lib/services/policyService';

const policyService = new PolicyService().withContext({
  userId: session.user.id,
  requestId: crypto.randomUUID(),
  ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
  userAgent: request.headers.get('user-agent') || 'unknown'
});

const result = await policyService.getPolicy(policyId);
```

**Benefits**:
- Audit trail in logs
- Debugging (can trace requests)
- Security (track who did what)

---

### executeDbOperation()

**Purpose**: Wrap database operations with automatic error handling and logging

**Signature**:
```typescript
protected async executeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): AsyncResult<T>
```

**Parameters**:
- `operation` - Async function containing Prisma operation
- `operationName` - Name for logging (e.g., 'getPolicy', 'createUser')

**Returns**: `AsyncResult<T>` - Success with data or error with ServiceError

**Automatic Error Handling**:

| Prisma Error | ServiceError | HTTP Status | Description |
|--------------|--------------|-------------|-------------|
| P2002 | ALREADY_EXISTS | 409 | Unique constraint violation |
| P2025 | NOT_FOUND | 404 | Record not found |
| P2003 | DATABASE_CONSTRAINT_ERROR | 400 | Foreign key constraint |
| Other | DATABASE_ERROR | 500 | Generic database error |

**Example Usage**:
```typescript
// File: src/lib/services/policyService.ts:45-52
async getPolicy(id: string): AsyncResult<Policy | null> {
  return this.executeDbOperation(
    async () => {
      const policy = await this.prisma.policy.findUnique({
        where: { id },
        include: {
          landlords: true,
          tenant: true,
          jointObligors: true,
          avals: true,
          documents: true
        }
      });

      if (!policy) {
        throw new ServiceError(
          ErrorCode.NOT_FOUND,
          `Policy with ID ${id} not found`,
          404
        );
      }

      return policy;
    },
    'getPolicy'
  );
}
```

**Pattern**:
```typescript
return this.executeDbOperation(
  async () => {
    // Prisma operation here
    // Can throw ServiceError for custom errors
    // Prisma errors (P2002, P2025, etc.) handled automatically
    return result;
  },
  'operationName' // For logging
);
```

---

### executeTransaction()

**Purpose**: Execute multiple database operations in a transaction

**Signature**:
```typescript
protected async executeTransaction<T>(
  operations: (tx: PrismaClient) => Promise<T>
): AsyncResult<T>
```

**Parameters**:
- `operations` - Async function receiving transaction Prisma client

**Returns**: `AsyncResult<T>` - Success with result or error

**Example Usage**:
```typescript
// File: src/lib/services/policyService.ts:180-210
async createPolicyWithActors(data: PolicyCreateData): AsyncResult<Policy> {
  return this.executeTransaction(async (tx) => {
    // Create policy
    const policy = await tx.policy.create({
      data: {
        propertyAddress: data.propertyAddress,
        rentAmount: data.rentAmount,
        // ... other fields
      }
    });

    // Create landlord
    const landlord = await tx.landlord.create({
      data: {
        policyId: policy.id,
        email: data.landlord.email,
        // ... other fields
        accessToken: generateToken()
      }
    });

    // Create activity log
    await tx.policyActivity.create({
      data: {
        policyId: policy.id,
        action: PolicyAction.POLICY_CREATED,
        description: `Policy ${policy.policyNumber} created`
      }
    });

    // Return full policy with relations
    return await tx.policy.findUnique({
      where: { id: policy.id },
      include: { landlords: true }
    });
  });
}
```

**Benefits**:
- All-or-nothing execution
- Automatic rollback on error
- Data consistency guaranteed

**Pattern**:
```typescript
return this.executeTransaction(async (tx) => {
  // Use tx instead of this.prisma for all operations
  const result1 = await tx.model1.create({ data });
  const result2 = await tx.model2.create({ data });

  // If any operation fails, entire transaction rolls back
  return finalResult;
});
```

---

### validate()

**Purpose**: Validate input data with custom validator function

**Signature**:
```typescript
protected validate<T>(
  data: T,
  validator: (data: T) => string | null
): Result<T>
```

**Parameters**:
- `data` - Data to validate
- `validator` - Function returning error message or null

**Returns**: `Result<T>` - Success with data or error with message

**Example Usage**:
```typescript
// File: src/lib/services/policyService.ts:92-105
async updatePolicy(id: string, data: Partial<Policy>): AsyncResult<Policy> {
  // Validate input
  const validation = this.validate(data, (d) => {
    if (d.rentAmount && d.rentAmount <= 0) {
      return 'Rent amount must be positive';
    }
    if (d.contractLength && d.contractLength < 6) {
      return 'Contract length must be at least 6 months';
    }
    return null; // Valid
  });

  if (!validation.ok) {
    return Result.error(validation.error);
  }

  // Proceed with update
  return this.executeDbOperation(
    async () => await this.prisma.policy.update({ where: { id }, data }),
    'updatePolicy'
  );
}
```

**Pattern**:
```typescript
const validation = this.validate(data, (d) => {
  // Return error message if invalid
  if (someCondition) return 'Error message';
  if (anotherCondition) return 'Another error';

  // Return null if valid
  return null;
});

if (!validation.ok) {
  return Result.error(validation.error);
}

// Continue with validated data
```

---

### authorize()

**Purpose**: Check authorization conditions

**Signature**:
```typescript
protected authorize(
  condition: boolean,
  message: string = 'Unauthorized'
): Result<void>
```

**Parameters**:
- `condition` - Boolean condition (true = authorized)
- `message` - Error message if unauthorized

**Returns**: `Result<void>` - Success or unauthorized error

**Example Usage**:
```typescript
// File: src/lib/services/policyService.ts:125-140
async deletePolicy(policyId: string, userId: string): AsyncResult<void> {
  const policyResult = await this.getPolicy(policyId);
  if (!policyResult.ok) return Result.error(policyResult.error);

  const policy = policyResult.value;

  // Only creator or admin can delete
  const canDelete = policy.createdById === userId || this.context?.userId === 'admin';

  const authCheck = this.authorize(
    canDelete,
    'You are not authorized to delete this policy'
  );

  if (!authCheck.ok) {
    return Result.error(authCheck.error);
  }

  return this.executeDbOperation(
    async () => {
      await this.prisma.policy.delete({ where: { id: policyId } });
    },
    'deletePolicy'
  );
}
```

**Pattern**:
```typescript
const authCheck = this.authorize(
  userHasPermission,
  'Custom error message'
);

if (!authCheck.ok) {
  return Result.error(authCheck.error);
}

// Proceed with authorized operation
```

---

### log()

**Purpose**: Structured logging with service context

**Signature**:
```typescript
protected log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: any
): void
```

**Parameters**:
- `level` - Log level
- `message` - Log message
- `data` - Additional data to log

**Output Format**:
```json
{
  "service": "PolicyService",
  "level": "error",
  "message": "Database operation failed: getPolicy",
  "context": {
    "userId": "user-123",
    "requestId": "req-abc",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "data": { /* error details */ },
  "timestamp": "2024-11-05T10:30:00.000Z"
}
```

**Usage**:
```typescript
this.log('info', 'Policy created successfully', { policyId: policy.id });
this.log('warn', 'Policy status transition skipped', { reason: 'Already in status' });
this.log('error', 'Failed to send email', { error: error.message });
```

**Note**: Logging happens automatically in `executeDbOperation` - manual calls rarely needed

---

### getCacheKey()

**Purpose**: Generate cache keys for service operations

**Signature**:
```typescript
protected getCacheKey(prefix: string, params: any): string
```

**Parameters**:
- `prefix` - Cache key prefix (e.g., 'getPolicy', 'listPolicies')
- `params` - Parameters object (sorted and stringified)

**Returns**: Consistent cache key string

**Example**:
```typescript
const cacheKey = this.getCacheKey('getPolicy', { id: '123' });
// Result: "PolicyService:getPolicy:{"id":"123"}"

const listKey = this.getCacheKey('listPolicies', { status: 'ACTIVE', page: 1 });
// Result: "PolicyService:listPolicies:{"page":1,"status":"ACTIVE"}"
// (params sorted alphabetically)
```

**Use Case**: When implementing caching layer (Redis, in-memory, etc.)

---

## Usage Patterns

### Pattern 1: Basic Service Implementation

```typescript
import { BaseService } from './base/BaseService';
import { AsyncResult, Result } from './types/result';

export class MyService extends BaseService {
  async findById(id: string): AsyncResult<MyModel | null> {
    return this.executeDbOperation(
      async () => await this.prisma.myModel.findUnique({ where: { id } }),
      'findById'
    );
  }

  async create(data: CreateData): AsyncResult<MyModel> {
    // Validate
    const validation = this.validate(data, (d) => {
      if (!d.name) return 'Name is required';
      return null;
    });

    if (!validation.ok) {
      return Result.error(validation.error);
    }

    // Create
    return this.executeDbOperation(
      async () => await this.prisma.myModel.create({ data }),
      'create'
    );
  }
}
```

### Pattern 2: Service with Transactions

```typescript
export class OrderService extends BaseService {
  async createOrderWithItems(orderData: OrderData): AsyncResult<Order> {
    return this.executeTransaction(async (tx) => {
      // Create order
      const order = await tx.order.create({ data: orderData });

      // Create order items
      await tx.orderItem.createMany({
        data: orderData.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity
        }))
      });

      // Update inventory
      for (const item of orderData.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Return order with items
      return await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true }
      });
    });
  }
}
```

### Pattern 3: Service with Authorization

```typescript
export class DocumentService extends BaseService {
  async deleteDocument(
    documentId: string,
    userId: string
  ): AsyncResult<void> {
    const docResult = await this.findById(documentId);
    if (!docResult.ok) return Result.error(docResult.error);

    const document = docResult.value;

    // Check authorization
    const authCheck = this.authorize(
      document.uploadedBy === userId,
      'You can only delete your own documents'
    );

    if (!authCheck.ok) {
      return Result.error(authCheck.error);
    }

    return this.executeDbOperation(
      async () => {
        await this.prisma.document.delete({ where: { id: documentId } });
      },
      'deleteDocument'
    );
  }
}
```

### Pattern 4: Service with Context

```typescript
// In API route
const service = new MyService().withContext({
  userId: session.user.id,
  requestId: headers.get('x-request-id') || crypto.randomUUID(),
  ipAddress: request.ip,
  userAgent: headers.get('user-agent')
});

const result = await service.create(data);
// Context automatically included in logs
```

---

## Testing

### Unit Testing with Mock Prisma

```typescript
import { MyService } from '@/lib/services/myService';
import { prismaMock } from '@/tests/mocks/prisma';

describe('MyService', () => {
  const service = new MyService({ prisma: prismaMock });

  it('should execute operation successfully', async () => {
    const mockData = { id: '123', name: 'Test' };
    prismaMock.myModel.findUnique.mockResolvedValue(mockData);

    const result = await service.findById('123');

    expect(result.ok).toBe(true);
    expect(result.value).toEqual(mockData);
  });

  it('should handle not found error', async () => {
    prismaMock.myModel.findUnique.mockResolvedValue(null);

    const result = await service.findById('999');

    expect(result.ok).toBe(true); // findById returns null, not error
    expect(result.value).toBeNull();
  });

  it('should handle Prisma P2002 error', async () => {
    prismaMock.myModel.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['email'] }
    });

    const result = await service.create({ email: 'test@example.com' });

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(ErrorCode.ALREADY_EXISTS);
    expect(result.error.statusCode).toBe(409);
  });
});
```

### Integration Testing with Real Database

```typescript
import { MyService } from '@/lib/services/myService';
import { PrismaClient } from '@prisma/client';

describe('MyService Integration', () => {
  const testPrisma = new PrismaClient({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } }
  });
  const service = new MyService({ prisma: testPrisma });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('should create and retrieve record', async () => {
    const createResult = await service.create({ name: 'Test' });
    expect(createResult.ok).toBe(true);

    const findResult = await service.findById(createResult.value.id);
    expect(findResult.ok).toBe(true);
    expect(findResult.value?.name).toBe('Test');
  });
});
```

---

## Best Practices

### DO ✅

- Extend BaseService for all services
- Use `executeDbOperation` for all database operations
- Use `executeTransaction` for multi-step operations
- Validate input before operations
- Check authorization before sensitive operations
- Set context for audit trails
- Return Result pattern consistently
- Log errors (happens automatically)

### DON'T ❌

- Access `prisma` directly without `executeDbOperation`
- Throw exceptions (use Result pattern)
- Skip validation
- Ignore authorization
- Use try/catch (use Result pattern)
- Create stateful services
- Mix business logic into routes
- Return raw Prisma errors to users

---

## Common Pitfalls

### Pitfall 1: Not Using executeDbOperation

**❌ WRONG**:
```typescript
async getPolicy(id: string): AsyncResult<Policy> {
  try {
    const policy = await this.prisma.policy.findUnique({ where: { id } });
    return Result.ok(policy);
  } catch (error) {
    return Result.error(new ServiceError(...));
  }
}
```

**✅ RIGHT**:
```typescript
async getPolicy(id: string): AsyncResult<Policy> {
  return this.executeDbOperation(
    async () => await this.prisma.policy.findUnique({ where: { id } }),
    'getPolicy'
  );
}
```

### Pitfall 2: Using Transaction Client Outside Transaction

**❌ WRONG**:
```typescript
return this.executeTransaction(async (tx) => {
  const policy = await this.prisma.policy.create({ data }); // Uses this.prisma!
  return policy;
});
```

**✅ RIGHT**:
```typescript
return this.executeTransaction(async (tx) => {
  const policy = await tx.policy.create({ data }); // Uses tx!
  return policy;
});
```

### Pitfall 3: Forgetting to Check Result.ok

**❌ WRONG**:
```typescript
const result = await service.getPolicy(id);
const policy = result.value; // Might be undefined if !result.ok!
```

**✅ RIGHT**:
```typescript
const result = await service.getPolicy(id);
if (!result.ok) {
  return Result.error(result.error);
}
const policy = result.value; // Safe - guaranteed to exist
```

---

## Related Modules

- **[/src/lib/services/](../README.md)** - Service layer overview
- **[/src/lib/services/types/](../types/README.md)** - Result pattern and error handling
- **[/src/lib/services/actors/](../actors/README.md)** - Actor services (extend BaseService)
- **[DEVELOPER_GUIDE.md](../../../../docs/DEVELOPER_GUIDE.md)** - Main developer guide

---

**Last Verified**: November 2024
**Production Status**: ✅ Foundation for All Services
