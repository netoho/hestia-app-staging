# Testing Guide

This project uses a comprehensive testing framework with real database integration, similar to Django's approach.

## 🧪 Testing Stack

- **Jest** - Testing framework
- **React Testing Library** - Component testing
- **Supertest** - API endpoint testing
- **PostgreSQL** - Real test database (drop/recreate pattern)
- **Prisma** - Database utilities

## 🗃️ Database Testing Strategy

### Drop/Recreate Pattern (Like Django)
Before each test run, the test database is:
1. **Dropped** completely
2. **Recreated** with fresh schema
3. **Migrated** with latest changes
4. **Cleaned** between individual tests

This ensures:
- ✅ **Isolated tests** - No test affects another
- ✅ **Fresh schema** - Always uses latest migrations
- ✅ **Predictable state** - No leftover data

## 🚀 Getting Started

### 1. Setup Test Database
```bash
# Create test database (PostgreSQL)
createdb hestia_test

# Or using Docker
docker run --name postgres-test -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=hestia_test -p 5433:5432 -d postgres
```

### 2. Configure Environment
Copy `.env.test` and update with your test database credentials:
```bash
cp .env.test .env.test.local
# Edit .env.test.local with your settings
```

### 3. Run Tests
```bash
# Run all tests
npm test

# Watch mode (recommended for development)
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only API tests
npm run test:api

# Run only component tests
npm run test:components

# Debug mode (verbose output)
npm run test:debug
```

## 📝 Writing Tests

### API Endpoint Tests

```typescript
import { NextRequest } from 'next/server'
import { POST } from '../your-endpoint/route'
import { TestDatabase } from '../../../tests/utils/testDatabase'

describe('/api/your-endpoint', () => {
  beforeEach(async () => {
    // Clean database before each test
    await TestDatabase.cleanDatabase()
    
    // Seed test data
    const data = await TestDatabase.seedTestData()
  })

  afterAll(async () => {
    await TestDatabase.disconnect()
  })

  it('should handle POST request', async () => {
    const request = new NextRequest('http://localhost:3000/api/your-endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YourComponent } from '../YourComponent'

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    const mockCallback = jest.fn()
    
    render(<YourComponent onClick={mockCallback} />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockCallback).toHaveBeenCalled()
  })
})
```

## 🛠️ Test Utilities

### TestDatabase Class

The `TestDatabase` class provides utilities for database testing:

```typescript
import { TestDatabase } from '../tests/utils/testDatabase'

// Clean all tables
await TestDatabase.cleanDatabase()

// Create test users
const admin = await TestDatabase.createTestAdmin()
const user = await TestDatabase.createTestUser({ role: 'staff' })

// Create test data
const policy = await TestDatabase.createTestPolicy(admin.id)
const package = await TestDatabase.createTestPackage()

// Seed complete test dataset
const { admin, testPackage, policy } = await TestDatabase.seedTestData()

// Direct Prisma access
const users = await TestDatabase.prisma.user.findMany()
```

### Available Test Helpers

- `createTestUser(overrides)` - Create test user with custom fields
- `createTestAdmin()` - Create admin user  
- `createTestPolicy(userId, overrides)` - Create test policy
- `createTestPackage(overrides)` - Create test package
- `seedTestData()` - Create complete test dataset
- `cleanDatabase()` - Truncate all tables
- `disconnect()` - Close database connection

## 📊 Coverage Reports

Generate coverage reports to ensure thorough testing:

```bash
npm run test:coverage
```

Coverage files are generated in `coverage/` directory.

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
- **Global Setup**: Database initialization
- **Global Teardown**: Database cleanup
- **Module Mapping**: Absolute imports (`@/`)
- **Test Environment**: jsdom for components
- **Timeout**: 10 seconds for database operations

### Test Environment (`.env.test`)
- Separate test database
- Mock API keys
- Test-specific configuration

## 🚨 Best Practices

### 1. Database Testing
- ✅ **Always clean** database between tests
- ✅ **Use TestDatabase** utilities for consistent data
- ✅ **Test with real data** for confidence
- ❌ **Don't share state** between tests

### 2. API Testing
- ✅ **Test complete request/response** cycle
- ✅ **Verify database changes** after operations
- ✅ **Test error cases** and validation
- ✅ **Mock external services** (email, payment)

### 3. Component Testing
- ✅ **Test user interactions** not implementation
- ✅ **Use semantic queries** (getByRole, getByLabelText)
- ✅ **Test accessibility** features
- ✅ **Mock heavy dependencies** (API calls, external services)

### 4. Test Organization
- ✅ **Descriptive test names** that explain behavior
- ✅ **Group related tests** with describe blocks
- ✅ **Use beforeEach/afterAll** for setup/cleanup
- ✅ **Keep tests focused** on single behavior

## 🐛 Debugging Tests

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check if test database exists
   psql -h localhost -U test -d hestia_test -c "SELECT 1;"
   ```

2. **Migration Issues**
   ```bash
   # Reset test database manually
   npm run test:debug
   ```

3. **Timeout Errors**
   - Increase timeout in `jest.config.js`
   - Check for async operations without await

### Debug Mode
```bash
# Run tests with verbose output
npm run test:debug

# Run single test file
npm test -- --testPathPatterns=policies-initiate
```

## 📁 Test File Structure

```
tests/
├── setup/
│   ├── globalSetup.js     # Database initialization
│   └── globalTeardown.js  # Database cleanup
└── utils/
    └── testDatabase.ts    # Database utilities

src/
├── app/api/__tests__/     # API endpoint tests
├── components/__tests__/  # Component tests
└── lib/__tests__/         # Utility function tests
```

## 🎯 Testing Philosophy

> **"Test behavior, not implementation"**

Focus on testing:
- ✅ What the user sees and does
- ✅ API contracts and responses  
- ✅ Database state changes
- ✅ Error handling and edge cases

Avoid testing:
- ❌ Internal component state
- ❌ Implementation details
- ❌ Third-party library behavior

This approach ensures tests remain valuable as the codebase evolves.