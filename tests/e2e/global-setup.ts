import { APP_ENV, E2E_DATABASE_URL } from './playwright.config';

/**
 * Runs once before the suite:
 * 1. Pins DATABASE_URL for the spec-side prisma client (tests/utils/database.ts
 *    guards against non-*_test URLs — hestia_e2e_test passes).
 * 2. Resets + seeds the e2e DB (admin user, packages, SystemConfig).
 *
 * DB/bucket provisioning (CREATE DATABASE + prisma db push + MinIO bucket) is
 * NOT done here — `bun run test:e2e` runs `pretest:e2e` (docker up + provision)
 * and CI has explicit steps. Keeping globalSetup fast and side-effect-obvious.
 */
export default async function globalSetup() {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  for (const [k, v] of Object.entries(APP_ENV)) {
    if (k !== 'NODE_ENV' && process.env[k] === undefined) process.env[k] = v;
  }

  const { prisma, resetDatabase, seedTestData } = await import('../utils/database');
  await resetDatabase();
  await seedTestData();
  await prisma.$disconnect();
  console.log('[e2e] database reset + seeded (admin@hestiaplp.com.mx / password123)');
}
