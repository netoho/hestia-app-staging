# Service Layer

**Status**: ✅ Production-Ready Architecture
**Last Updated**: November 2024
**Files**: 30 service files (2,948 lines in actors/, ~3,000+ lines in other services)

---

## Purpose

The service layer implements all business logic for Hestia using a Result pattern for type-safe error handling. Services abstract database operations, external API calls, and complex business rules away from API routes, providing a clean, testable, and maintainable architecture.

---

## Architecture

### Design Patterns

**1. Result Pattern** (Rust-inspired)
- Type-safe error handling without throwing exceptions
- Explicit success/failure states
- Composable with map(), chain(), unwrap()

**2. Base Service Pattern**
- Abstract `BaseService` class with common functionality
- All services extend BaseService
- Shared DB operations, logging, validation, transactions

**3. Service Context Pattern**
- Request context (userId, requestId, ipAddress, userAgent)
- Passed through service chain
- Used for logging and audit trails

**4. Singleton Pattern**
- Service instances reused across application
- Lightweight, stateless services
- No instance state beyond configuration

### Service Hierarchy

```
BaseService (abstract)
  ├─> Actor Services
  │   ├─> BaseActorService (abstract)
  │   │   ├─> LandlordService
  │   │   ├─> TenantService
  │   │   ├─> AvalService
  │   │   └─> JointObligorService
  │   └─> ActorAuthService
  │
  ├─> Policy Services
  │   ├─> PolicyService
  │   ├─> PolicyWorkflowService
  │   ├─> PolicyStatusService
  │   ├─> PolicyApplicationService
  │   └─> ProgressService
  │
  ├─> Document Services
  │   ├─> DocumentService
  │   └─> FileUploadService
  │
  ├─> External Services
  │   ├─> EmailService
  │   ├─> PaymentService (Stripe)
  │   ├─> GoogleMapsService
  │   └─> PdfService
  │
  └─> Supporting Services
      ├─> ReviewService
      ├─> PricingService
      ├─> PackageService
      ├─> UserService
      ├─> ActorTokenService
      ├─> UserTokenService
      ├─> PropertyDetailsService
      └─> MockDataService (dev only)
```

---

## Services Catalog

### Actor Services (6 services)

#### BaseActorService
**File**: `/src/lib/services/actors/BaseActorService.ts` (511 lines)
**Purpose**: Abstract base for all actor CRUD services
**Exports**:
```typescript
export abstract class BaseActorService<T> extends BaseService {
  abstract validatePersonData(data: PersonActorData, isPartial?: boolean): Result<PersonActorData>;
  abstract validateCompanyData(data: CompanyActorData, isPartial?: boolean): Result<CompanyActorData>;

  async create(data: Partial<T>): AsyncResult<T>;
  async update(id: string, data: Partial<T>): AsyncResult<T>;
  async findById(id: string): AsyncResult<T | null>;
  async findByToken(token: string): AsyncResult<T | null>;
  async validateAndSave(data: ActorData, skipValidation?: boolean): AsyncResult<T>;
}
```

**See Also**: [/src/lib/services/actors/README.md](./actors/README.md) for detailed actor services documentation

#### ActorAuthService
**File**: `/src/lib/services/ActorAuthService.ts`
**Purpose**: Dual authentication (token vs session) for actor routes
**Key Methods**:
```typescript
export class ActorAuthService {
  async resolveActorAuth(type: ActorType, identifier: string, request: NextRequest): Promise<ActorAuthResult>;
  async canAccessPolicy(userId: string, policyId: string): Promise<boolean>;
}
```

**Usage**: See [API_ROUTE_PATTERNS.md](../../../docs/API_ROUTE_PATTERNS.md#dual-authentication-pattern)

---

### Policy Services (5 services)

#### PolicyService
**File**: `/src/lib/services/policyService.ts`
**Purpose**: Core policy CRUD and business logic
**Key Methods**:
```typescript
export class PolicyService extends BaseService {
  async createPolicy(data: PolicyCreateData): AsyncResult<Policy>;
  async updatePolicy(id: string, data: Partial<Policy>): AsyncResult<Policy>;
  async getPolicy(id: string, include?: PolicyInclude): AsyncResult<Policy | null>;
  async listPolicies(filters: PolicyFilters): AsyncResult<PaginatedPolicies>;
  async deletePolicy(id: string): AsyncResult<void>;
  async sendInvitations(policyId: string): AsyncResult<void>;
}
```

**Example Usage**:
```typescript
// File: src/app/api/policies/[id]/route.ts
import { PolicyService } from '@/lib/services/policyService';

const policyService = new PolicyService();
const result = await policyService.getPolicy(policyId, {
  landlords: true,
  tenant: true,
  documents: true
});

if (result.ok) {
  return NextResponse.json({ success: true, data: result.value });
} else {
  return NextResponse.json(
    { error: result.error.getUserMessage() },
    { status: result.error.statusCode }
  );
}
```

#### PolicyWorkflowService
**File**: `/src/lib/services/policyWorkflowService.ts`
**Purpose**: Policy status transitions and workflow management
**Key Methods**:
```typescript
export class PolicyWorkflowService extends BaseService {
  async transitionTo(policyId: string, newStatus: PolicyStatus): AsyncResult<Policy>;
  async canTransitionTo(policy: Policy, newStatus: PolicyStatus): boolean;
  async startInvestigation(policyId: string): AsyncResult<Policy>;
  async completeInvestigation(policyId: string, approved: boolean): AsyncResult<Policy>;
  async activatePolicy(policyId: string): AsyncResult<Policy>;
}
```

**Example Usage**:
```typescript
// File: src/app/api/policies/[id]/status/route.ts
const workflowService = new PolicyWorkflowService();

// Check if transition is allowed
const policy = await policyService.getPolicy(policyId);
if (!policy.ok) return errorResponse(policy.error);

const canTransition = await workflowService.canTransitionTo(
  policy.value,
  PolicyStatus.UNDER_INVESTIGATION
);

if (!canTransition) {
  return NextResponse.json(
    { error: 'Invalid status transition' },
    { status: 400 }
  );
}

// Perform transition
const result = await workflowService.transitionTo(policyId, PolicyStatus.UNDER_INVESTIGATION);
```

#### PolicyApplicationService
**File**: `/src/lib/services/policyApplicationService.ts`
**Purpose**: Policy initiation and application flow
**Key Methods**:
```typescript
export class PolicyApplicationService extends BaseService {
  async initiatePolicy(data: PolicyInitiationData): AsyncResult<Policy>;
  async calculatePricing(data: PricingData): AsyncResult<PricingResult>;
  async submitPolicy(policyId: string): AsyncResult<Policy>;
}
```

#### PolicyStatusService
**File**: `/src/lib/services/PolicyStatusService.ts`
**Purpose**: Policy status management and validation
**Key Methods**:
```typescript
export class PolicyStatusService extends BaseService {
  async updateStatus(policyId: string, status: PolicyStatus): AsyncResult<Policy>;
  canUserUpdateStatus(user: User, policy: Policy, newStatus: PolicyStatus): boolean;
  getAvailableTransitions(policy: Policy): PolicyStatus[];
}
```

#### ProgressService
**File**: `/src/lib/services/progressService.ts`
**Purpose**: Track actor and policy completion progress
**Key Methods**:
```typescript
export class ProgressService extends BaseService {
  async getActorProgress(actorId: string, actorType: ActorType): AsyncResult<ProgressData>;
  async getPolicyProgress(policyId: string): AsyncResult<PolicyProgressData>;
  async calculateCompletionPercentage(policy: Policy): number;
}
```

---

### Document Services (2 services)

#### DocumentService
**File**: `/src/lib/services/documentService.ts`
**Purpose**: Document management, validation, and storage
**Key Methods**:
```typescript
export class DocumentService extends BaseService {
  async uploadDocument(data: DocumentUploadData): AsyncResult<Document>;
  async getDocument(documentId: string): AsyncResult<Document | null>;
  async deleteDocument(documentId: string): AsyncResult<void>;
  async getDownloadUrl(documentId: string): AsyncResult<string>;
  async validateDocument(documentId: string, approved: boolean, reason?: string): AsyncResult<Document>;
}
```

**Example Usage**:
```typescript
// File: src/app/api/actors/[type]/[identifier]/documents/route.ts
import { DocumentService } from '@/lib/services/documentService';

const documentService = new DocumentService();

const result = await documentService.uploadDocument({
  file: formData.get('file'),
  category: DocumentCategory.IDENTIFICATION,
  policyId,
  actorId,
  actorType: 'tenant'
});

if (!result.ok) {
  return NextResponse.json(
    { error: result.error.getUserMessage() },
    { status: result.error.statusCode }
  );
}
```

#### FileUploadService
**File**: `/src/lib/services/fileUploadService.ts`
**Purpose**: File upload utilities and validation
**Key Methods**:
```typescript
export class FileUploadService {
  validateFile(file: File, options?: FileValidationOptions): Result<void>;
  generateUniqueFilename(originalName: string, prefix?: string): string;
  sanitizeFilename(filename: string): string;
  getFileMimeType(file: File): string;
}
```

---

### External Services (4 services)

#### EmailService
**File**: `/src/lib/services/emailService.ts`
**Purpose**: Send emails using React Email templates
**Key Methods**:
```typescript
export class EmailService extends BaseService {
  async sendEmail(data: EmailData): AsyncResult<void>;
  async sendActorInvitation(actor: Actor, token: string): AsyncResult<void>;
  async sendPolicyStatusUpdate(policy: Policy, newStatus: PolicyStatus): AsyncResult<void>;
  async sendActorIncompleteReminder(data: ActorReminderData): AsyncResult<void>;
  async sendPolicyCreatorSummary(data: PolicySummaryData): AsyncResult<void>;
}
```

**Example Usage**:
```typescript
// File: src/services/reminderService.ts
import { EmailService } from '@/lib/services/emailService';

const emailService = new EmailService();

const result = await emailService.sendActorIncompleteReminder({
  actorEmail: landlord.email,
  actorName: getFullName(landlord),
  actorType: 'landlord',
  policyNumber: policy.policyNumber,
  accessToken: landlord.accessToken,
  daysRemaining: calculateDaysRemaining(policy)
});

if (!result.ok) {
  console.error('Failed to send reminder:', result.error.getUserMessage());
}
```

#### PaymentService
**File**: `/src/lib/services/paymentService.ts`
**Purpose**: Stripe payment integration
**Key Methods**:
```typescript
export class PaymentService extends BaseService {
  async createPaymentIntent(amount: number, metadata?: any): AsyncResult<PaymentIntent>;
  async confirmPayment(paymentIntentId: string): AsyncResult<PaymentIntent>;
  async refundPayment(paymentIntentId: string, amount?: number): AsyncResult<Refund>;
  async handleWebhook(event: Stripe.Event): AsyncResult<void>;
}
```

#### GoogleMapsService
**File**: `/src/lib/services/googleMapsService.ts`
**Purpose**: Google Maps API integration for address autocomplete
**Key Methods**:
```typescript
export class GoogleMapsService {
  async autocomplete(input: string): Promise<AutocompleteResult[]>;
  async getPlaceDetails(placeId: string): Promise<PlaceDetails>;
  async geocode(address: string): Promise<GeocodeResult>;
}
```

**Example Usage**:
```typescript
// File: src/app/api/address/autocomplete/route.ts
import { GoogleMapsService } from '@/lib/services/googleMapsService';

const mapsService = new GoogleMapsService();
const predictions = await mapsService.autocomplete(query);

return NextResponse.json({ predictions });
```

#### PdfService
**File**: `/src/lib/services/pdfService.ts`
**Purpose**: Generate PDFs for policies using Puppeteer
**Key Methods**:
```typescript
export class PdfService extends BaseService {
  async generatePolicyPdf(policyId: string): AsyncResult<Buffer>;
  async generateContractPdf(contractData: ContractData): AsyncResult<Buffer>;
}
```

---

### Supporting Services (9 services)

#### ReviewService
**File**: `/src/lib/services/reviewService.ts`
**Purpose**: Policy review workflow and validation
**Key Methods**:
```typescript
export class ReviewService extends BaseService {
  async startReview(policyId: string): AsyncResult<Review>;
  async validateSection(reviewId: string, section: string, valid: boolean): AsyncResult<Review>;
  async addNote(reviewId: string, note: string): AsyncResult<ReviewNote>;
  async completeReview(reviewId: string, approved: boolean): AsyncResult<Review>;
}
```

#### PricingService
**File**: `/src/lib/services/pricingService.ts`
**Purpose**: Calculate policy pricing based on risk factors
**Key Methods**:
```typescript
export class PricingService extends BaseService {
  async calculatePrice(data: PricingInputData): AsyncResult<PricingResult>;
  async applyDiscount(price: number, discountCode: string): AsyncResult<number>;
  async splitPayment(totalPrice: number, tenantPercent: number): PaymentSplit;
}
```

**Example Usage**:
```typescript
// File: src/app/api/policies/calculate-price/route.ts
const pricingService = new PricingService();

const result = await pricingService.calculatePrice({
  rentAmount: 15000,
  contractLength: 12,
  propertyType: PropertyType.APARTMENT,
  guarantorType: GuarantorType.JOINT_OBLIGOR,
  packageId: selectedPackage.id
});

if (result.ok) {
  return NextResponse.json({
    totalPrice: result.value.totalPrice,
    breakdown: result.value.breakdown
  });
}
```

#### PackageService
**File**: `/src/lib/services/packageService.ts`
**Purpose**: Manage policy packages/plans
**Key Methods**:
```typescript
export class PackageService extends BaseService {
  async listPackages(): AsyncResult<Package[]>;
  async getPackage(id: string): AsyncResult<Package | null>;
  async createPackage(data: PackageData): AsyncResult<Package>;
}
```

#### UserService
**File**: `/src/lib/services/userService.ts`
**Purpose**: User management (admin, staff, broker)
**Key Methods**:
```typescript
export class UserService extends BaseService {
  async createUser(data: UserCreateData): AsyncResult<User>;
  async updateUser(id: string, data: Partial<User>): AsyncResult<User>;
  async deleteUser(id: string): AsyncResult<void>;
  async getUserByEmail(email: string): AsyncResult<User | null>;
  async changePassword(userId: string, newPassword: string): AsyncResult<void>;
}
```

#### ActorTokenService
**File**: `/src/lib/services/actorTokenService.ts`
**Purpose**: Generate and validate actor access tokens
**Key Methods**:
```typescript
export class ActorTokenService {
  generateToken(actorId: string, actorType: ActorType): string;
  validateToken(token: string): { valid: boolean; actorId?: string; actorType?: ActorType };
  regenerateToken(actorId: string, actorType: ActorType): AsyncResult<string>;
}
```

#### UserTokenService
**File**: `/src/lib/services/userTokenService.ts`
**Purpose**: Generate and validate user invitation/reset tokens
**Key Methods**:
```typescript
export class UserTokenService {
  async generateInvitationToken(userId: string): AsyncResult<string>;
  async generatePasswordResetToken(userId: string): AsyncResult<string>;
  async validateToken(token: string, type: TokenType): AsyncResult<TokenData>;
}
```

#### PropertyDetailsService
**File**: `/src/lib/services/PropertyDetailsService.ts`
**Purpose**: Manage property details and validation
**Key Methods**:
```typescript
export class PropertyDetailsService extends BaseService {
  async updatePropertyDetails(policyId: string, data: PropertyData): AsyncResult<Policy>;
  async validatePropertyDetails(data: PropertyData): Result<void>;
}
```

#### MockDataService
**File**: `/src/lib/services/mockDataService.ts`
**Purpose**: Generate mock data for development/testing
**Note**: Development only, not used in production

---

## Result Pattern

### Overview

The Result pattern provides type-safe error handling without throwing exceptions:

```typescript
type Result<T, E = ServiceError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type AsyncResult<T, E = ServiceError> = Promise<Result<T, E>>;
```

### Benefits

1. **Type Safety**: Compiler forces error handling
2. **Explicit**: No hidden control flow (no throws)
3. **Composable**: Can chain operations with map(), chain()
4. **Consistent**: Same pattern across all services

### Usage Pattern

```typescript
// Service method returns Result
async function getPolicy(id: string): AsyncResult<Policy> {
  return this.executeDbOperation(
    async () => await this.prisma.policy.findUnique({ where: { id } }),
    'getPolicy'
  );
}

// API route handles Result
const result = await policyService.getPolicy(policyId);

if (result.ok) {
  // Success case - result.value is Policy
  return NextResponse.json({ success: true, data: result.value });
} else {
  // Error case - result.error is ServiceError
  return NextResponse.json(
    { error: result.error.getUserMessage() },
    { status: result.error.statusCode }
  );
}
```

### Result Helpers

**See**: [/src/lib/services/types/README.md](./types/README.md) for comprehensive Result pattern documentation

---

## Service Lifecycle

### 1. Instantiation

Services are lightweight and can be instantiated per-request or reused:

```typescript
// Per-request (simple)
const policyService = new PolicyService();

// With context (recommended for audit trails)
const policyService = new PolicyService().withContext({
  userId: user.id,
  requestId: crypto.randomUUID(),
  ipAddress: request.ip,
  userAgent: request.headers.get('user-agent')
});

// With custom Prisma instance (testing)
const policyService = new PolicyService({
  prisma: mockPrismaClient
});
```

### 2. Operation Execution

All DB operations wrapped in `executeDbOperation`:

```typescript
protected async executeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): AsyncResult<T> {
  try {
    const result = await operation();
    this.log('info', `Operation succeeded: ${operationName}`);
    return Result.ok(result);
  } catch (error: any) {
    this.log('error', `Operation failed: ${operationName}`, error);

    // Handle Prisma errors
    if (error.code === 'P2002') {
      return Result.error(new ServiceError(ErrorCode.ALREADY_EXISTS, ...));
    }
    if (error.code === 'P2025') {
      return Result.error(new ServiceError(ErrorCode.NOT_FOUND, ...));
    }

    // Generic error
    return Result.error(new ServiceError(ErrorCode.INTERNAL_ERROR, ...));
  }
}
```

### 3. Error Handling

Services never throw - always return Result:

```typescript
// ❌ DON'T
async function getPolicy(id: string): Promise<Policy> {
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) throw new Error('Not found');
  return policy;
}

// ✅ DO
async function getPolicy(id: string): AsyncResult<Policy> {
  return this.executeDbOperation(
    async () => {
      const policy = await prisma.policy.findUnique({ where: { id } });
      if (!policy) {
        throw new ServiceError(ErrorCode.NOT_FOUND, 'Policy not found', 404);
      }
      return policy;
    },
    'getPolicy'
  );
}
```

---

## Common Patterns

### Pattern 1: Validation Before Operation

```typescript
async createPolicy(data: PolicyCreateData): AsyncResult<Policy> {
  // Validate first
  const validation = this.validatePolicyData(data);
  if (!validation.ok) {
    return Result.error(validation.error);
  }

  // Then execute
  return this.executeDbOperation(
    async () => await this.prisma.policy.create({ data }),
    'createPolicy'
  );
}
```

### Pattern 2: Service Composition

```typescript
// PolicyApplicationService uses other services
async initiatePolicy(data: PolicyInitiationData): AsyncResult<Policy> {
  // Use PricingService
  const pricingResult = await this.pricingService.calculatePrice(data);
  if (!pricingResult.ok) return Result.error(pricingResult.error);

  // Use PolicyService
  const policyResult = await this.policyService.createPolicy({
    ...data,
    totalPrice: pricingResult.value.totalPrice
  });
  if (!policyResult.ok) return Result.error(policyResult.error);

  // Use EmailService
  await this.emailService.sendPolicyInvitation(policyResult.value);

  return Result.ok(policyResult.value);
}
```

### Pattern 3: Transaction Support

```typescript
async complexOperation(): AsyncResult<Result> {
  return this.executeDbOperation(
    async () => {
      return await this.prisma.$transaction(async (tx) => {
        // Multiple operations in transaction
        const policy = await tx.policy.create({ data: policyData });
        const landlord = await tx.landlord.create({ data: landlordData });
        await tx.activityLog.create({ data: activityData });

        return { policy, landlord };
      });
    },
    'complexOperation'
  );
}
```

---

## Best Practices

### DO ✅

- Extend BaseService for all services
- Use Result pattern for all async operations
- Wrap DB operations in `executeDbOperation`
- Log errors with context
- Use service composition for complex operations
- Add ServiceContext for audit trails
- Validate before executing operations
- Use transactions for multi-step DB operations

### DON'T ❌

- Throw exceptions from services
- Access Prisma directly from routes
- Ignore Result errors
- Mix business logic into routes
- Skip validation
- Return raw database errors to users
- Create stateful service instances

---

## Testing

### Unit Testing Services

```typescript
import { PolicyService } from '@/lib/services/policyService';
import { prismaMock } from '@/tests/mocks/prisma';

describe('PolicyService', () => {
  const service = new PolicyService({ prisma: prismaMock });

  it('should get policy by id', async () => {
    const mockPolicy = { id: '123', policyNumber: 'POL-001', ... };
    prismaMock.policy.findUnique.mockResolvedValue(mockPolicy);

    const result = await service.getPolicy('123');

    expect(result.ok).toBe(true);
    expect(result.value).toEqual(mockPolicy);
  });

  it('should return error when policy not found', async () => {
    prismaMock.policy.findUnique.mockResolvedValue(null);

    const result = await service.getPolicy('999');

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(ErrorCode.NOT_FOUND);
  });
});
```

---

## Related Modules

- **[/src/lib/services/base/](./base/README.md)** - BaseService implementation
- **[/src/lib/services/types/](./types/README.md)** - Result pattern and error handling
- **[/src/lib/services/actors/](./actors/README.md)** - Actor services
- **[/src/lib/storage/](../storage/README.md)** - Storage abstraction
- **[DEVELOPER_GUIDE.md](../../../docs/DEVELOPER_GUIDE.md)** - Main developer guide

---

**Last Verified**: November 2024
**Production Status**: ✅ Active and Battle-Tested
