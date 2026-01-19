# tRPC Router Documentation

## Overview

This directory contains tRPC routers that define our type-safe API endpoints. The actor router (`actor.router.ts`) handles all actor-related operations with automatic type inference from schemas to client.

## Architecture

```
routers/
├── actor.router.ts      # Actor CRUD operations
├── policy.router.ts     # Policy management
├── review.router.ts     # Policy review workflow
├── user.router.ts       # User management
└── index.ts            # Root router aggregation
```

## Authentication Patterns

### 1. Public Procedures
No authentication required:
```typescript
.input(z.object({ token: z.string() }))
.query(async ({ input }) => {
  // Token-based self-service access
})
```

### 2. Protected Procedures
Requires authenticated session:
```typescript
protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    // User authenticated operations
  })
```

### 3. Admin Procedures
Requires admin role:
```typescript
adminProcedure
  .input(ActorAdminUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    // Admin-only operations
  })
```

### 4. Dual Auth Procedures
Supports both session and token auth:
```typescript
dualAuthProcedure
  .input(z.union([
    z.object({ token: z.string() }),
    z.object({ actorId: z.string() })
  ]))
  .query(async ({ ctx, input }) => {
    // Works for both logged-in users and token holders
  })
```

## Actor Router Endpoints

### Get Actor by Token
```typescript
// GET /api/trpc/actor.getByToken
{
  type: 'tenant' | 'landlord' | 'aval' | 'jointObligor',
  token: string
}
// Returns: Actor data with relations
```

### Save Actor (Final Submission)
```typescript
// POST /api/trpc/actor.save
{
  type: 'tenant',
  token: string,
  data: TenantStrictSchema // Full validation
}
// Returns: { success: true, actorId: string }
```

### Save Tab (Partial Save)
```typescript
// POST /api/trpc/actor.saveTab
{
  type: 'tenant',
  token: string,
  tab: 'personal' | 'employment' | ...,
  data: {} // Partial data
}
// Returns: { success: true }
```

### Admin Update
```typescript
// POST /api/trpc/actor.adminUpdate
{
  type: 'tenant',
  actorId: string,
  data: {} // Flexible partial update
}
// Returns: Updated actor
```

### Get All by Policy
```typescript
// GET /api/trpc/actor.getAllByPolicy
{
  policyId: string,
  type?: 'tenant' | 'landlord' | ...
}
// Returns: Array of actors
```

## Schema Validation

All inputs are validated using Zod schemas:

```typescript
.input(z.union([
  z.object({
    type: z.literal('tenant'),
    token: z.string(),
    data: TenantStrictSchema,
  }),
  z.object({
    type: z.literal('landlord'),
    token: z.string(),
    data: LandlordStrictSchema,
  }),
  // ... other actors
]))
```

## Service Integration

Routers delegate business logic to services:

```typescript
function getActorService(type: ActorType) {
  switch (type) {
    case 'tenant':
      return new TenantService();
    case 'landlord':
      return new LandlordService();
    // ... etc
  }
}
```

## Error Handling

### Standard Error Response
```typescript
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid data',
  cause: validationErrors,
});
```

### Error Codes
- `UNAUTHORIZED` - Missing authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Validation failed
- `INTERNAL_SERVER_ERROR` - Unexpected error

## Adding New Endpoints

### 1. Define Input Schema
```typescript
const CreateActorInput = z.object({
  type: z.enum(['newActor']),
  data: NewActorSchema,
});
```

### 2. Create Procedure
```typescript
createActor: protectedProcedure
  .input(CreateActorInput)
  .mutation(async ({ ctx, input }) => {
    const service = new NewActorService();
    return await service.create(input.data);
  }),
```

### 3. Add to Router
```typescript
export const actorRouter = createTRPCRouter({
  // existing endpoints...
  createActor,
});
```

## Type Safety

tRPC provides end-to-end type safety:

```typescript
// Client automatically typed
const { data } = await trpc.actor.getByToken.query({
  type: 'tenant', // Type-checked
  token: 'abc123',
});

// data is fully typed as TenantWithRelations
```

## Testing

### Unit Tests
```typescript
describe('Actor Router', () => {
  it('validates tenant data', async () => {
    const caller = appRouter.createCaller({ session: null });

    await expect(caller.actor.save({
      type: 'tenant',
      token: 'invalid',
      data: {} // Invalid data
    })).rejects.toThrow();
  });
});
```

### Integration Tests
```typescript
it('saves complete actor', async () => {
  const result = await trpc.actor.save.mutate({
    type: 'tenant',
    token: validToken,
    data: completeTenantData,
  });

  expect(result.success).toBe(true);
});
```

## Performance Considerations

1. **Validation at the Edge** - Input validation happens before service calls
2. **Selective Includes** - Only fetch required relations
3. **Caching** - Consider caching frequently accessed data
4. **Batching** - tRPC batches requests automatically
5. **Pagination** - Implement for list endpoints

## Common Patterns

### Multi-Actor Support
```typescript
// Handle multiple actor types generically
const service = getActorService(input.type);
const result = await service.update(
  actor.id,
  input.data,
  { isPartial: input.partial }
);
```

### Token Validation
```typescript
const validation = await validateActorToken(token, type);
if (!validation.valid) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: validation.message,
  });
}
```

### Transaction Handling
```typescript
const result = await prisma.$transaction(async (tx) => {
  const actor = await tx.actor.create({ ... });
  await tx.policy.update({ ... });
  return actor;
});
```

## Migration from REST

| REST Endpoint | tRPC Procedure |
|--------------|----------------|
| `GET /api/actors/:token` | `actor.getByToken` |
| `POST /api/actors` | `actor.save` |
| `PUT /api/actors/:id` | `actor.adminUpdate` |
| `GET /api/policies/:id/actors` | `actor.getAllByPolicy` |

## Best Practices

### DO ✅
- Validate all inputs with Zod schemas
- Use appropriate auth procedures
- Delegate business logic to services
- Return consistent response formats
- Handle errors gracefully

### DON'T ❌
- Put business logic in routers
- Skip input validation
- Return sensitive data unnecessarily
- Mix authentication strategies
- Ignore TypeScript errors

## Debugging

Enable tRPC logging:
```typescript
export const createTRPCContext = async (opts: CreateContextOptions) => {
  console.log('Request:', opts.req.url);
  // ... context creation
};
```

## Future Enhancements

- [ ] Add request rate limiting
- [ ] Implement response caching
- [ ] Add request logging middleware
- [ ] Create OpenAPI spec generation
- [ ] Add WebSocket subscriptions

---

For more details on the actor system, see the [Actor System Architecture](../../docs/ACTOR_SYSTEM_ARCHITECTURE.md) documentation.