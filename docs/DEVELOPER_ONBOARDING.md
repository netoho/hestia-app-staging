# Developer Onboarding Guide

Welcome to the Hestia Actor System! This guide will help you get up and running quickly.

## Quick Start

### Prerequisites

- Node.js 18+ or Bun 1.0+
- PostgreSQL 14+
- Git

### Setup

```bash
# Clone the repository
git clone [repository-url]
cd hestia-app

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
bunx prisma migrate dev

# Start development server
bun run dev
```

Visit http://localhost:3000

## Project Structure

```
hestia-app/
├── src/
│   ├── app/                 # Next.js 13+ app directory
│   │   ├── actor/           # Actor self-service pages
│   │   └── dashboard/       # Admin dashboard
│   ├── components/
│   │   └── actor/          # Actor UI components
│   ├── lib/
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── constants/      # Configuration
│   └── server/
│       └── routers/        # tRPC API routers
├── prisma/
│   └── schema.prisma       # Database schema
└── docs/                   # Documentation
```

## Key Technologies

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **tRPC** - Type-safe APIs
- **Prisma** - Database ORM
- **Zod** - Schema validation
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Common Development Tasks

### 1. Running the Application

```bash
# Development mode with hot reload
bun run dev

# Production build
bun run build
bun run start

# Type checking
bun run type-check

# Linting
bun run lint
```

### 2. Database Operations

```bash
# View database in Prisma Studio
bunx prisma studio

# Create a new migration
bunx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
bunx prisma migrate reset

# Generate Prisma client
bunx prisma generate
```

### 3. Testing Actors

#### Create Test Token
```bash
# Use the API to create a test actor with token
curl -X POST http://localhost:3000/api/trpc/policy.create \
  -H "Content-Type: application/json" \
  -d '{"propertyAddress": "Test St 123"}'
```

#### Access Actor Form
```
http://localhost:3000/actor/tenant/[TOKEN]
http://localhost:3000/actor/landlord/[TOKEN]
http://localhost:3000/actor/aval/[TOKEN]
http://localhost:3000/actor/joint-obligor/[TOKEN]
```

## Understanding the Actor System

### What are Actors?

Actors are participants in a rental policy:
- **Tenant**: The person/company renting
- **Landlord**: The property owner(s)
- **Aval**: Property-backed guarantor
- **Joint Obligor**: Co-signer with flexible guarantee

### Data Collection Flow

1. **Token Generation**: Admin creates policy and generates tokens
2. **Self-Service Access**: Actors receive email with unique link
3. **Progressive Forms**: Tab-based data collection
4. **Validation**: Real-time and submission validation
5. **Document Upload**: Required document collection
6. **Completion**: Data saved and policy updated

## Code Examples

### Creating a New Actor Schema

```typescript
// src/lib/schemas/new-actor/index.ts
import { z } from 'zod';

// Define tab schemas
const personalTabSchema = z.object({
  actorType: z.enum(['INDIVIDUAL', 'COMPANY']),
  name: z.string().min(1),
  email: z.string().email(),
});

// Create complete schema
export const newActorCompleteSchema = z.object({
  ...personalTabSchema.shape,
  // ... other tabs
});

// Export validation modes
export const newActorStrictSchema = newActorCompleteSchema;
export const newActorPartialSchema = newActorCompleteSchema.partial();
```

### Adding an API Endpoint

```typescript
// src/server/routers/actor.router.ts

// Add to router
export const actorRouter = createTRPCRouter({
  // ... existing endpoints

  customAction: protectedProcedure
    .input(z.object({
      actorId: z.string(),
      action: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new ActorService();
      return await service.performAction(input);
    }),
});
```

### Creating a React Component

```tsx
// src/components/actor/new-actor/NewActorTab.tsx
import { Card, CardContent } from '@/components/ui/card';

export default function NewActorTab({
  formData,
  onFieldChange,
  errors,
  disabled,
}) {
  return (
    <Card>
      <CardContent>
        <Input
          value={formData.field}
          onChange={(e) => onFieldChange('field', e.target.value)}
          error={errors.field}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}
```

## Working with Different Actor Types

### Individual vs Company

```typescript
// Check type and render appropriate fields
if (formData.tenantType === 'COMPANY') {
  // Show company fields
  return <CompanyInformation />;
} else {
  // Show individual fields
  return <PersonInformation />;
}
```

### Handling Special Requirements

```typescript
// Aval - Mandatory property
if (actorType === 'aval') {
  data.hasPropertyGuarantee = true; // Always true
}

// Joint Obligor - Flexible guarantee
if (data.guaranteeMethod === 'income') {
  // Validate income fields
} else {
  // Validate property fields
}

// Landlord - Multiple support
const primaryLandlord = landlords.find(l => l.isPrimary);
```

## Debugging Tips

### 1. Enable Debug Logging

```typescript
// Add to .env
DEBUG=true

// In your code
if (process.env.DEBUG) {
  console.log('Debug info:', data);
}
```

### 2. Check tRPC Errors

```typescript
// Client-side
const { error } = api.actor.save.useMutation();
console.error('tRPC Error:', error);

// Server-side
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Detailed error message',
  cause: validationErrors,
});
```

### 3. Inspect Database

```bash
# Open Prisma Studio
bunx prisma studio

# Or use SQL
psql $DATABASE_URL
\d "Actor"  # Show table structure
SELECT * FROM "Actor" WHERE id = '...';
```

### 4. Type Checking

```bash
# Check for type errors
bun run type-check

# Generate types from schema
bunx prisma generate
```

## Common Issues & Solutions

### Issue: "Token is invalid or expired"
**Solution**: Tokens expire after 48 hours. Generate a new token.

### Issue: "Type error: Property does not exist"
**Solution**: Run `bunx prisma generate` to sync types with database.

### Issue: "Validation failed"
**Solution**: Check schema definition matches form data structure.

### Issue: "Cannot read property of undefined"
**Solution**: Add null checks or use optional chaining (`?.`).

## Best Practices

### DO ✅
- Use TypeScript strictly
- Validate data at every layer
- Handle errors gracefully
- Write descriptive commit messages
- Test edge cases
- Document complex logic

### DON'T ❌
- Skip validation
- Hardcode values
- Ignore TypeScript errors
- Mix business logic with UI
- Duplicate code
- Commit sensitive data

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature
```

### 2. Make Changes
- Write code
- Add tests
- Update documentation

### 3. Test Locally
```bash
bun run build
bun run test
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature
# Create pull request on GitHub
```

## Adding a New Actor Type (Complete Guide)

### Step 1: Database Schema
```prisma
// prisma/schema.prisma
model NewActor {
  id        String   @id @default(cuid())
  policyId  String
  policy    Policy   @relation(...)
  actorType NewActorType
  // ... fields
}

enum NewActorType {
  INDIVIDUAL
  COMPANY
}
```

### Step 2: Run Migration
```bash
bunx prisma migrate dev --name add_new_actor
```

### Step 3: Create Schema
```typescript
// src/lib/schemas/new-actor/index.ts
// See schema documentation
```

### Step 4: Create Service
```typescript
// src/lib/services/actors/NewActorService.ts
export class NewActorService extends BaseActorService {
  // Implement required methods
}
```

### Step 5: Update Router
```typescript
// src/server/routers/actor.router.ts
// Add case for new actor type
```

### Step 6: Create UI Components
```tsx
// src/components/actor/new-actor/
// Create wizard and tab components
```

### Step 7: Add Route
```tsx
// app/actor/new-actor/[token]/page.tsx
export default function NewActorPage({ params }) {
  return <NewActorFormWizard token={params.token} />;
}
```

### Step 8: Test
- Create test policy with new actor
- Complete form flow
- Verify data saves correctly
- Check validation works

## Resources

### Documentation
- [Actor System Architecture](./ACTOR_SYSTEM_ARCHITECTURE.md)
- [Schema Documentation](../src/lib/schemas/README.md)
- [Router Documentation](../src/server/routers/README.md)
- [Component Guide](../src/components/actor/README.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev)

## Getting Help

### Internal
- Check existing code for patterns
- Read inline documentation
- Review git history for context

### External
- Stack Overflow for general issues
- GitHub Issues for bugs
- Discord/Slack for team questions

## Contributing

1. Follow the code style guide
2. Write tests for new features
3. Update documentation
4. Get PR reviewed before merging
5. Keep commits atomic and descriptive

---

Welcome to the team! If you have questions, don't hesitate to ask. Happy coding! 🚀