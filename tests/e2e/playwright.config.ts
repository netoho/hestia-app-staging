import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * E2E harness (#161). Design decisions (2026-07-05 planning):
 * - Dedicated database `hestia_e2e_test` — never shares `hestia_test` with the
 *   integration suite, never touches dev (the *_test guard in
 *   tests/utils/database.ts is the backstop).
 * - workers: 1 — the app under test and the specs share one mutable DB; each
 *   spec resets + reseeds via the `freshDb` helper.
 * - Documents upload against MinIO (docker-compose.test.yml, port 9100) through
 *   the real presigned-URL flow — no storage mocking.
 * - No Stripe (admin manual payments), no Google Maps (manual address entry),
 *   no email capture (actor tokens are read from the DB).
 * - CI runs a production build (`next build && next start`); locally the
 *   turbopack dev server is started (or reused if YOU started one with
 *   `bun run dev:e2e` — never point a reused server at the dev DB).
 */

const isCI = !!process.env.CI;
const BASE_URL = 'http://localhost:9002';

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://test:test@localhost:5433/hestia_e2e_test';

/** Environment for the app-under-test AND the spec-side prisma client. */
export const APP_ENV = {
  DATABASE_URL: E2E_DATABASE_URL,
  NEXTAUTH_URL: BASE_URL,
  NEXTAUTH_SECRET: 'e2e-nextauth-secret',
  JWT_SECRET: 'e2e-jwt-secret',
  NEXT_PUBLIC_APP_URL: BASE_URL,
  // Real presigned-upload flow against MinIO:
  STORAGE_PROVIDER: 's3',
  AWS_ACCESS_KEY_ID: 'minioadmin',
  AWS_SECRET_ACCESS_KEY: 'minioadmin',
  AWS_S3_BUCKET: 'hestia-e2e',
  AWS_S3_REGION: 'us-east-1',
  AWS_REGION: 'us-east-1',
  AWS_S3_ENDPOINT: 'http://localhost:9100',
  // Email deliberately disabled — emailService logs one notice and skips sends.
  EMAIL_PROVIDER: 'none',
  NODE_ENV: isCI ? 'production' : 'development',
} as const;

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 180_000, // each scenario is a long journey
  expect: { timeout: 15_000 },
  reporter: isCI ? [['github'], ['list']] : [['html', { open: 'never' }], ['list']],

  globalSetup: './global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'auth-setup',
      testDir: './setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
      dependencies: ['auth-setup'],
    },
  ],

  webServer: {
    command: isCI
      ? 'bun run --bun next build && bun run --bun next start -p 9002'
      : 'bun run --bun next dev --turbopack -p 9002',
    cwd: REPO_ROOT,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
    env: APP_ENV,
  },
});
