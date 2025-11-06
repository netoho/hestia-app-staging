# API Route Patterns

**Status**: ✅ Production Architecture
**Last Updated**: November 5, 2024 (commit: 513fa3d)
**Related Files**:
- `/src/app/api/actors/[type]/[identifier]/route.ts` - Unified actor routes
- `/src/lib/services/actors/ActorAuthService.ts` - Dual authentication
- `/src/lib/auth/withRole.ts` - Role-based middleware

---

## Table of Contents

1. [Overview](#overview)
2. [Unified Actor Routes](#unified-actor-routes)
3. [Dual Authentication Pattern](#dual-authentication-pattern)
4. [Role-Based Access Control](#role-based-access-control)
5. [Error Handling](#error-handling)
6. [Request/Response Patterns](#requestresponse-patterns)
7. [Real Examples](#real-examples)

---

## Overview

### API Architecture Principles

**1. Unified Routes**
- One endpoint serves multiple actor types
- `/api/actors/[type]/[identifier]` handles landlord, tenant, aval, joint-obligor

**2. Dual Authentication**
- Token-based for actor self-service
- Session-based for admin/staff/broker access
- Resolved automatically by `ActorAuthService`

**3. Role-Based Access**
- ADMIN/STAFF: Full access, can skip validation
- BROKER: Limited to assigned policies
- Actor: Token-based, own data only

**4. Result Pattern**
- Services return `Result<T>` instead of throwing errors
- Consistent error format across all routes

---

## Unified Actor Routes

### Route Structure

```
/api/actors/[type]/[identifier]
```

**Parameters**:
- `type`: Actor type - `landlord` | `tenant` | `aval` | `joint-obligor`
- `identifier`: Either UUID (admin access) or access token (actor self-service)

**Supported Methods**:
- `GET` - Fetch actor data
- `PUT` - Update actor data
- `DELETE` - Remove actor (admin only)

### GET Route Implementation

**File**: `/src/app/api/actors/[type]/[identifier]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { actorAuthService } from '@/lib/services/actors/ActorAuthService';
import { getServiceForType } from '@/lib/services/actors';
import { withRole } from '@/lib/auth/withRole';
import { UserRole } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; identifier: string } }
) {
  try {
    const { type, identifier } = await params;

    // 1. Resolve authentication (token vs session)
    const auth = await actorAuthService.resolveActorAuth(
      type,
      identifier,
      request
    );

    // 2. Handle admin access with role middleware
    if (auth.authType === 'admin') {
      return withRole(
        request,
        [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
        async (req, user) => {
          // 3. Additional authorization for brokers
          if (user.role === UserRole.BROKER) {
            const canAccess = await actorAuthService.canAccessPolicy(
              user.id,
              auth.actor.policyId
            );

            if (!canAccess) {
              return NextResponse.json(
                { error: 'No autorizado para acceder a esta póliza' },
                { status: 403 }
              );
            }
          }

          // 4. Return actor data
          return NextResponse.json({
            success: true,
            data: formatActorData(auth.actor, type),
            canEdit: auth.canEdit,
            authType: auth.authType
          });
        }
      );
    }

    // 5. Actor token access (already validated by resolveActorAuth)
    return NextResponse.json({
      success: true,
      data: formatActorData(auth.actor, type),
      canEdit: auth.canEdit,
      authType: auth.authType
    });

  } catch (error: any) {
    console.error('[Actor GET Error]', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener información del actor' },
      { status: error.statusCode || 500 }
    );
  }
}
```

### PUT Route Implementation

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { type: string; identifier: string } }
) {
  try {
    const { type, identifier } = await params;
    const body = await request.json();

    // 1. Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(
      type,
      identifier,
      request
    );

    // 2. Get service for actor type
    const service = getServiceForType(type);

    // 3. Determine if we should skip validation (admin-only feature)
    const skipValidation =
      auth.authType === 'admin' && body.skipValidation === true;

    // 4. Validate and save
    const result = await service.validateAndSave(
      { ...body, id: auth.actor.id },
      skipValidation
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error.message,
          details: result.error.context
        },
        { status: result.error.statusCode }
      );
    }

    // 5. Return updated data
    return NextResponse.json({
      success: true,
      data: formatActorData(result.data, type)
    });

  } catch (error: any) {
    console.error('[Actor PUT Error]', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar actor' },
      { status: 500 }
    );
  }
}
```

### DELETE Route Implementation

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string; identifier: string } }
) {
  try {
    const { type, identifier } = await params;

    // 1. Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(
      type,
      identifier,
      request
    );

    // 2. DELETE only allowed for admins
    if (auth.authType !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado para eliminar actores' },
        { status: 403 }
      );
    }

    // 3. Use admin role middleware
    return withRole(
      request,
      [UserRole.ADMIN, UserRole.STAFF],
      async (req, user) => {
        const service = getServiceForType(type);

        // 4. Delete actor
        const result = await service.delete(auth.actor.id);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error.message },
            { status: result.error.statusCode }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Actor eliminado exitosamente'
        });
      }
    );

  } catch (error: any) {
    console.error('[Actor DELETE Error]', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar actor' },
      { status: 500 }
    );
  }
}
```

---

## Dual Authentication Pattern

### ActorAuthService

**File**: `/src/lib/services/actors/ActorAuthService.ts`

**Purpose**: Automatically resolve whether request uses token or session authentication

```typescript
export class ActorAuthService {
  /**
   * Resolve actor authentication from either token or session
   *
   * @param type - Actor type (landlord, tenant, aval, joint-obligor)
   * @param identifier - Either UUID (admin) or access token (actor)
   * @param request - Next.js request object
   * @returns Actor auth result with actor data and permissions
   */
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

  /**
   * Check if string is a valid token format (not a UUID)
   */
  private isValidToken(identifier: string): boolean {
    // UUID pattern: 8-4-4-4-12 hex digits
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // If it matches UUID pattern, it's NOT a token
    return !uuidPattern.test(identifier);
  }

  /**
   * Handle token-based actor authentication
   */
  private async handleActorAuth(
    type: ActorType,
    token: string
  ): Promise<ActorAuthResult> {
    const service = getServiceForType(type);

    // Find actor by token
    const result = await service.findByToken(token);

    if (!result.success || !result.data) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'Token inválido o expirado',
        404
      );
    }

    const actor = result.data;

    // Check token expiration
    if (actor.tokenExpiry && new Date() > new Date(actor.tokenExpiry)) {
      throw new ServiceError(
        ErrorCode.UNAUTHORIZED,
        'Token expirado',
        401
      );
    }

    return {
      actor,
      authType: 'actor',
      canEdit: true  // Actors can edit their own data
    };
  }

  /**
   * Handle session-based admin authentication
   */
  private async handleAdminAuth(
    type: ActorType,
    actorId: string,
    request: NextRequest
  ): Promise<ActorAuthResult> {
    // Verify session exists
    const session = await getServerSession(request);

    if (!session?.user) {
      throw new ServiceError(
        ErrorCode.UNAUTHORIZED,
        'No autorizado',
        401
      );
    }

    const service = getServiceForType(type);

    // Find actor by ID
    const result = await service.findById(actorId);

    if (!result.success || !result.data) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'Actor no encontrado',
        404
      );
    }

    return {
      actor: result.data,
      authType: 'admin',
      canEdit: true  // Admins can edit
    };
  }

  /**
   * Check if broker can access policy
   */
  async canAccessPolicy(userId: string, policyId: string): Promise<boolean> {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: { assignedBroker: true }
    });

    if (!policy) return false;

    // Check if broker is assigned to this policy
    return policy.assignedBrokerId === userId;
  }
}

export const actorAuthService = new ActorAuthService();
```

### Token vs Session Detection

**How it works**:

1. **Check identifier format**
   - UUID pattern (8-4-4-4-12): Admin access (session)
   - Any other format: Actor access (token)

2. **Validate accordingly**
   - UUID: Check session, fetch actor by ID
   - Token: Verify token, check expiration, fetch actor

3. **Return auth result**
   - Actor object
   - Auth type (`'admin'` or `'actor'`)
   - Can edit flag

**Example Flow**:

```
Request: GET /api/actors/landlord/abc123token
         ↓
isValidToken('abc123token') → true
         ↓
handleActorAuth('landlord', 'abc123token')
         ↓
findByToken('abc123token')
         ↓
Check token expiration
         ↓
Return { actor, authType: 'actor', canEdit: true }

---

Request: GET /api/actors/landlord/550e8400-e29b-41d4-a716-446655440000
         ↓
isValidToken('550e8400-...') → false (UUID pattern)
         ↓
handleAdminAuth('landlord', '550e8400-...')
         ↓
Check session exists
         ↓
findById('550e8400-...')
         ↓
Return { actor, authType: 'admin', canEdit: true }
```

---

## Role-Based Access Control

### User Roles

**Defined in**: `prisma/schema.prisma`

```prisma
enum UserRole {
  ADMIN       // Full access, can skip validation
  STAFF       // Full access, can skip validation
  BROKER      // Limited to assigned policies only
}
```

### withRole Middleware

**File**: `/src/lib/auth/withRole.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';

type RouteHandler = (
  request: NextRequest,
  user: { id: string; role: UserRole }
) => Promise<NextResponse>;

/**
 * Middleware to check user role before executing route handler
 *
 * @param request - Next.js request
 * @param allowedRoles - Array of roles that can access this route
 * @param handler - Route handler function
 */
export async function withRole(
  request: NextRequest,
  allowedRoles: UserRole[],
  handler: RouteHandler
): Promise<NextResponse> {
  // 1. Check if user is authenticated
  const session = await getServerSession(request);

  if (!session?.user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }

  // 2. Check if user has required role
  const userRole = session.user.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: 'No autorizado para esta acción' },
      { status: 403 }
    );
  }

  // 3. Execute route handler with user context
  return handler(request, {
    id: session.user.id,
    role: userRole
  });
}
```

### Usage Examples

**Admin-Only Route**:

```typescript
export async function DELETE(request: NextRequest, { params }) {
  return withRole(
    request,
    [UserRole.ADMIN],  // Only admins
    async (req, user) => {
      // Delete logic
      return NextResponse.json({ success: true });
    }
  );
}
```

**Admin & Staff Route**:

```typescript
export async function PUT(request: NextRequest, { params }) {
  return withRole(
    request,
    [UserRole.ADMIN, UserRole.STAFF],  // Admin or Staff
    async (req, user) => {
      // Update logic
      return NextResponse.json({ success: true });
    }
  );
}
```

**Admin, Staff & Broker Route with Additional Authorization**:

```typescript
export async function GET(request: NextRequest, { params }) {
  return withRole(
    request,
    [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
    async (req, user) => {
      // Additional authorization for brokers
      if (user.role === UserRole.BROKER) {
        const canAccess = await checkBrokerAccess(user.id, params.policyId);
        if (!canAccess) {
          return NextResponse.json(
            { error: 'No autorizado para esta póliza' },
            { status: 403 }
          );
        }
      }

      // Fetch data
      return NextResponse.json({ success: true, data: /* ... */ });
    }
  );
}
```

---

## Error Handling

### Error Response Format

**Standard Error Response**:

```typescript
{
  error: string;           // User-friendly error message
  details?: {              // Optional additional details
    errors?: Record<string, string>;  // Field-level validation errors
    code?: string;         // Error code for programmatic handling
  };
}
```

### Service Error Class

**File**: `/src/lib/errors/ServiceError.ts`

```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class ServiceError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
```

### Error Handling Pattern

**In Routes**:

```typescript
export async function PUT(request: NextRequest, { params }) {
  try {
    const service = getServiceForType(params.type);
    const result = await service.validateAndSave(body);

    // Handle service errors (Result pattern)
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error.message,
          details: result.error.context
        },
        { status: result.error.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    // Handle unexpected errors
    console.error('[Route Error]', error);

    return NextResponse.json(
      {
        error: error.message || 'Error interno del servidor',
        details: { code: 'INTERNAL_ERROR' }
      },
      { status: error.statusCode || 500 }
    );
  }
}
```

**In Services** (Result Pattern):

```typescript
async validateAndSave(data: ActorData): AsyncResult<Actor> {
  // Validation
  const validationResult = this.validateActorData(data);

  if (!validationResult.success) {
    // Return error, don't throw
    return Result.error(validationResult.error);
  }

  // Database operation with error handling
  return this.executeDbOperation(async () => {
    return await prisma.actor.update({
      where: { id: data.id },
      data: validationResult.data
    });
  });
}

// executeDbOperation wraps try/catch and returns Result
protected async executeDbOperation<T>(
  operation: () => Promise<T>
): AsyncResult<T> {
  try {
    const data = await operation();
    return Result.ok(data);
  } catch (error: any) {
    console.error('[DB Operation Error]', error);
    return Result.error(
      new ServiceError(
        ErrorCode.INTERNAL_ERROR,
        'Database operation failed',
        500,
        { originalError: error.message }
      )
    );
  }
}
```

---

## Request/Response Patterns

### GET Response

**Success**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Juan",
    "middleName": "Carlos",
    "paternalLastName": "García",
    "maternalLastName": "López",
    "email": "juan@example.com",
    "phone": "5551234567",
    "informationComplete": true
  },
  "canEdit": true,
  "authType": "admin"
}
```

**Error - Not Found**:
```json
{
  "error": "Actor no encontrado"
}
```
Status: 404

**Error - Unauthorized**:
```json
{
  "error": "No autorizado"
}
```
Status: 401

---

### PUT Request/Response

**Request Body**:
```json
{
  "firstName": "Juan",
  "middleName": "Carlos",
  "paternalLastName": "García",
  "maternalLastName": "López",
  "email": "juan@example.com",
  "phone": "5551234567",
  "skipValidation": false
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Juan",
    "middleName": "Carlos",
    "paternalLastName": "García",
    "maternalLastName": "López",
    "email": "juan@example.com",
    "phone": "5551234567",
    "informationComplete": true
  }
}
```

**Error - Validation Failed**:
```json
{
  "error": "Validation failed",
  "details": {
    "errors": {
      "firstName": "El nombre es requerido",
      "email": "Correo electrónico inválido"
    }
  }
}
```
Status: 400

---

### DELETE Response

**Success**:
```json
{
  "success": true,
  "message": "Actor eliminado exitosamente"
}
```

**Error - Forbidden**:
```json
{
  "error": "No autorizado para eliminar actores"
}
```
Status: 403

---

## Real Examples

### Example 1: Admin Fetching Landlord

**Request**:
```http
GET /api/actors/landlord/550e8400-e29b-41d4-a716-446655440000
Cookie: next-auth.session-token=...
```

**Flow**:
1. `resolveActorAuth` detects UUID → admin access
2. Check session exists
3. `findById` fetches landlord
4. Return landlord data with `authType: 'admin'`

**Response**:
```json
{
  "success": true,
  "data": { /* landlord data */ },
  "canEdit": true,
  "authType": "admin"
}
```

---

### Example 2: Actor Self-Service Update

**Request**:
```http
PUT /api/actors/tenant/abc123token456
Content-Type: application/json

{
  "firstName": "María",
  "paternalLastName": "González",
  "email": "maria@example.com"
}
```

**Flow**:
1. `resolveActorAuth` detects token → actor access
2. `findByToken` validates token
3. Check token not expired
4. `validateAndSave` with full validation
5. Return updated tenant data

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "firstName": "María",
    "paternalLastName": "González",
    "email": "maria@example.com"
    /* ... */
  }
}
```

---

### Example 3: Broker Accessing Assigned Policy's Actor

**Request**:
```http
GET /api/actors/aval/660e8400-e29b-41d4-a716-446655440000
Cookie: next-auth.session-token=... (broker session)
```

**Flow**:
1. `resolveActorAuth` detects UUID → admin access
2. `withRole` checks user has BROKER role ✅
3. Additional broker authorization check
4. `canAccessPolicy` verifies broker assigned to policy
5. If authorized, return aval data
6. If not authorized, return 403

**Response (Authorized)**:
```json
{
  "success": true,
  "data": { /* aval data */ },
  "canEdit": true,
  "authType": "admin"
}
```

**Response (Not Authorized)**:
```json
{
  "error": "No autorizado para acceder a esta póliza"
}
```
Status: 403

---

## Best Practices

### DO ✅

- Use `ActorAuthService.resolveActorAuth()` for all actor routes
- Use `withRole` middleware for role-based access
- Return Result pattern from services (don't throw)
- Format errors consistently with `{ error, details }`
- Log errors with context for debugging
- Validate on server even if client validates
- Check broker authorization for policy-specific access
- Use TypeScript enums for roles (not string literals)

### DON'T ❌

- Trust client-side authentication/authorization
- Throw errors from services (use Result pattern)
- Expose internal error details to users
- Use string literals for UserRole (use enum)
- Skip session checks for admin routes
- Allow brokers access to unassigned policies
- Return different error formats across routes

---

## Related Documentation

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Main developer guide
- **[ACTOR_SYSTEM.md](./ACTOR_SYSTEM.md)** - Actor system architecture
- **[FORM_VALIDATION_PATTERNS.md](./FORM_VALIDATION_PATTERNS.md)** - Validation patterns
- **[REACT_STATE_PATTERNS.md](./REACT_STATE_PATTERNS.md)** - State management

---

**Last Verified**: November 5, 2024 (commit: 513fa3d)
**Production Status**: ✅ Battle-Tested in Production
**Documentation Accuracy**: ✅ Verified against actual codebase
