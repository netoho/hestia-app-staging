# API Routes Module

## Status: 🔴 CRITICAL - 150+ TypeScript Errors

## Overview

This directory contains all Next.js 14 API routes using the App Router pattern. The API is organized by domain and follows RESTful conventions where possible.

## Architecture

```
/api/
├── actor/          # Actor self-service portals (NEW)
│   ├── tenant/
│   ├── landlord/
│   ├── joint-obligor/
│   └── aval/
├── policies/       # Policy CRUD and workflows
│   └── [id]/      # Policy-specific operations
├── tenant/        # DEPRECATED - Legacy tenant API
├── admin/         # Admin-only operations
├── auth/          # Authentication endpoints
├── address/       # Google Maps integration
└── documents/     # Document management
```

## Current Issues

### Critical Problems
1. **Type Mismatches** (40+ errors)
   - Prisma types not synced
   - Enum imports from wrong sources
   - Nullable fields not handled

2. **Missing Authorization** (SECURITY)
   - BROKER role can access other brokers' policies
   - No rate limiting implemented
   - Token validation incomplete

3. **Duplicate APIs**
   - `/tenant/` (legacy) vs `/actor/tenant/` (new)
   - Inconsistent patterns between endpoints

## Design Patterns

### Authentication Pattern
```typescript
const authResult = await authenticateUser(request);
if (!authResult.success || !authResult.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const user = authResult.user;
```

### Response Format
```typescript
// Success
return NextResponse.json({
  success: true,
  data: result
});

// Error
return NextResponse.json({
  success: false,
  error: 'Error message'
}, { status: 400 });
```

### Database Operations
- Always use Prisma client
- Include relations when needed
- Use transactions for multi-table updates

## Key Endpoints

### Policy Management
- `POST /api/policies` - Create new policy
- `GET /api/policies/[id]` - Get policy details
- `POST /api/policies/[id]/send-invitations` - Send actor invites
- `POST /api/policies/[id]/actors/[type]/[actorId]/verify` - Verify actors

### Actor Portals
- `GET /api/actor/[type]/[token]/validate` - Validate token
- `POST /api/actor/[type]/[token]/submit` - Submit information
- `POST /api/actor/[type]/[token]/documents` - Upload documents

### Investigation
- `POST /api/policies/[id]/investigation` - Create investigation
- `POST /api/policies/[id]/investigation/complete` - Complete investigation

## TODO - Priority Order

1. [ ] Fix TypeScript compilation errors
2. [ ] Add BROKER authorization checks
3. [ ] Implement rate limiting
4. [ ] Migrate legacy tenant API
5. [ ] Add comprehensive error handling
6. [ ] Create API documentation
7. [ ] Add integration tests

## Testing

Currently no automated tests. Test manually via:
- Postman collection (not in repo)
- curl commands
- Frontend integration

## Environment Variables Required

```env
DATABASE_URL=
NEXTAUTH_SECRET=
JWT_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
```

## Common Fixes

### Prisma Type Errors
```bash
npx prisma generate
```

### Import Enum from Prisma
```typescript
import { PolicyStatus, UserRole } from '@prisma/client';
```

### Handle Nullable Fields
```typescript
field: value ?? null
```

## Migration Notes

When migrating from Pages to App Router:
- Use `NextRequest` instead of `NextApiRequest`
- Use `NextResponse` instead of `res.json()`
- Params are async: `{ params }: { params: Promise<{ id: string }> }`

## Security Checklist

- [ ] All endpoints check authentication
- [ ] Role-based access implemented
- [ ] Input validation on all POST/PUT
- [ ] SQL injection prevention (Prisma handles)
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Sensitive data not logged

## Performance Considerations

- Use `select` to limit fields returned
- Add database indexes for common queries
- Implement caching for repeated queries
- Remove all console.log statements
- Use pagination for list endpoints

---

**Status Updated:** 2025-10-09
**Next Review:** After TypeScript fixes