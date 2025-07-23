import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }
  },
  usePathname() {
    return '/dashboard'
  },
  useParams() {
    return {}
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'staff'
      }
    },
    status: 'authenticated'
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock environment variables for tests
process.env.NODE_ENV = 'test'

// Load test environment variables
import dotenv from 'dotenv'

// Load .env.test first (highest priority)
dotenv.config({ path: '.env.test' })

// Store the test database URL before loading main .env
const testDatabaseUrl = process.env.TEST_DATABASE_URL

// Now load main .env file but don't override existing values
dotenv.config({ path: '.env' })

// Ensure DATABASE_URL points to test database for tests
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl
  process.env.TEST_DATABASE_URL = testDatabaseUrl
}

// Set default test values if not provided
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret'